import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVariants, useProductSuppliers } from "@/hooks/use-products";
import { useAddPurchaseLine, useUpdatePurchaseLine, usePurchase } from "@/hooks/use-purchases";
import { useEffect } from "react";
import { toast } from "sonner";

const lineSchema = z.object({
  variant_id: z.string().min(1, "Variant is required"),
  qty_ordered: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_cost: z.coerce.number().min(0, "Cost must be positive"),
  notes: z.string().optional(),
});

type LineFormData = z.infer<typeof lineSchema>;

interface PurchaseLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  initialData?: any;
}

export function PurchaseLineDialog({ open, onOpenChange, purchaseId, initialData }: PurchaseLineDialogProps) {
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const { data: variants } = useVariants();
  const { data: purchase } = usePurchase(purchaseId);
  const addLine = useAddPurchaseLine();
  const updateLine = useUpdatePurchaseLine();
  const [addAnother, setAddAnother] = useState(true); // Default: keep dialog open for bulk add

  const form = useForm<LineFormData>({
    resolver: zodResolver(lineSchema),
    defaultValues: {
      variant_id: "",
      qty_ordered: 1,
      unit_cost: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        variant_id: initialData.variant_id,
        qty_ordered: initialData.qty_ordered,
        unit_cost: initialData.unit_cost,
        notes: initialData.notes || "",
      });
    } else {
      form.reset({
        variant_id: "",
        qty_ordered: 1,
        unit_cost: 0,
        notes: "",
      });
    }
  }, [initialData, form, open]);

  // Get product for the selected variant to fetch its suppliers
  const selectedVariantId = form.watch("variant_id");
  const selectedVariantData = variants?.find(v => v.id === selectedVariantId);
  const { data: productSuppliers } = useProductSuppliers(selectedVariantData?.product_id || "");

  // Pricing Effect: Update Unit Cost when dependencies change
  useEffect(() => {
    if (!selectedVariantId || !purchase?.supplier_id) return;

    // NOTE: We only auto-update if productSuppliers is loaded for the CURRENT product
    if (!productSuppliers || productSuppliers.length === 0) {
      if (productSuppliers && selectedVariantData) {
        const baseHpp = (selectedVariantData.products as any)?.base_hpp || 0;
        // Only update if current form value is 0 (untouched/default) to avoid overwriting user manual input
        // Actually, if user SWITCHES variant, we want to overwrite.
        // But this effect runs on load too?
        // "variant_id" changes on switch.
        form.setValue("unit_cost", baseHpp);
      }
      return;
    }

    const specificPrice = productSuppliers.find(
      ps => ps.supplier_id === purchase.supplier_id && ps.variant_id === selectedVariantId
    );
    const generalPrice = productSuppliers.find(
      ps => ps.supplier_id === purchase.supplier_id && ps.variant_id === null // variant_id is null for general
    );

    if (specificPrice) {
      form.setValue("unit_cost", specificPrice.purchase_price);
    } else if (generalPrice) {
      form.setValue("unit_cost", generalPrice.purchase_price);
    } else if (selectedVariantData) {
      const baseHpp = (selectedVariantData.products as any)?.base_hpp || 0;
      form.setValue("unit_cost", baseHpp);
    }
  }, [selectedVariantId, purchase?.supplier_id, productSuppliers, selectedVariantData, form]);

  const onSubmit = (data: LineFormData) => {
    if (initialData) {
      updateLine.mutate(
        {
          id: initialData.id,
          data: {
            variant_id: data.variant_id,
            qty_ordered: data.qty_ordered,
            unit_cost: data.unit_cost,
            notes: data.notes,
          },
        },
        { onSuccess: () => { onOpenChange(false); form.reset(); } }
      );
    } else {
      addLine.mutate(
        {
          purchase_id: purchaseId,
          variant_id: data.variant_id,
          qty_ordered: data.qty_ordered,
          unit_cost: data.unit_cost,
          notes: data.notes,
        },
        {
          onSuccess: () => {
            if (addAnother) {
              // Keep dialog open, reset form for next item
              form.reset({
                variant_id: "",
                qty_ordered: 1,
                unit_cost: data.unit_cost, // Preserve last unit cost
                notes: "",
              });
              toast.success("Item added! Add another or close dialog");
            } else {
              // Close dialog
              onOpenChange(false);
              form.reset();
            }
          }
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Order Line" : "Add Order Line"}</DialogTitle>
          <DialogDescription>
            Pilih varian produk dan tentukan jumlah serta biaya untuk pesanan ini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="variant_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Product Variant</FormLabel>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between text-left font-normal h-auto py-2",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="font-medium text-sm truncate">
                                {variants?.find((v) => v.id === field.value)?.products?.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                SKU: {variants?.find((v) => v.id === field.value)?.sku_variant}
                              </span>
                            </div>
                          ) : (
                            "Search or select product..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command className="max-h-[350px] overflow-hidden">
                        <CommandInput placeholder="Search SKU or Name..." className="h-9" />
                        <CommandList
                          className="max-h-[300px] overflow-y-auto pointer-events-auto"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>No variant found.</CommandEmpty>
                          <CommandGroup>
                            {variants?.map((v) => (
                              <CommandItem
                                key={v.id}
                                value={`${v.products?.name} ${v.sku_variant}`}
                                onSelect={() => {
                                  form.setValue("variant_id", v.id);

                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    v.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col py-1">
                                  <span className="font-medium">{v.products?.name}</span>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="bg-muted px-1 rounded uppercase tracking-wider font-mono">{v.sku_variant}</span>
                                    <span>•</span>
                                    <span className={cn(
                                      (v.available_qty || 0) <= 0 ? "text-destructive font-semibold" : ""
                                    )}>
                                      Stock: {v.available_qty || 0}
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="qty_ordered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost (Rp)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any notes for this line item..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Estimate Subtotal:</span>
                <span className="font-bold text-xl text-primary">
                  Rp {(form.watch("qty_ordered") * form.watch("unit_cost")).toLocaleString()}
                </span>
              </div>
            </div>

            {!initialData && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Checkbox
                  id="add-another"
                  checked={addAnother}
                  onCheckedChange={(checked) => setAddAnother(!!checked)}
                />
                <label
                  htmlFor="add-another"
                  className="text-sm font-medium text-blue-900 cursor-pointer"
                >
                  Keep dialog open to add more items
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLine.isPending || updateLine.isPending}>
                {initialData ? "Update Item" : (addAnother ? "Add & Continue" : "Add Item")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
