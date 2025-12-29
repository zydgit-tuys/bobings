import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVariants } from "@/hooks/use-products";
import { useAddPurchaseLine } from "@/hooks/use-purchases";

const lineSchema = z.object({
  variant_id: z.string().min(1, "Variant is required"),
  qty_ordered: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit_cost: z.coerce.number().min(0, "Cost must be positive"),
});

type LineFormData = z.infer<typeof lineSchema>;

interface PurchaseLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
}

export function PurchaseLineDialog({ open, onOpenChange, purchaseId }: PurchaseLineDialogProps) {
  const { data: variants } = useVariants();
  const addLine = useAddPurchaseLine();

  const form = useForm<LineFormData>({
    resolver: zodResolver(lineSchema),
    defaultValues: {
      variant_id: "",
      qty_ordered: 1,
      unit_cost: 0,
    },
  });

  const onSubmit = (data: LineFormData) => {
    addLine.mutate(
      {
        purchase_id: purchaseId,
        variant_id: data.variant_id,
        qty_ordered: data.qty_ordered,
        unit_cost: data.unit_cost,
      },
      { onSuccess: () => { onOpenChange(false); form.reset(); } }
    );
  };

  const selectedVariant = variants?.find((v) => v.id === form.watch("variant_id"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Order Line</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="variant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Variant</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const variant = variants?.find((v) => v.id === value);
                      if (variant) {
                        form.setValue("unit_cost", variant.hpp);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select variant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {variants?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.sku_variant}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

            <div className="text-sm text-muted-foreground">
              Subtotal: Rp {(form.watch("qty_ordered") * form.watch("unit_cost")).toLocaleString()}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addLine.isPending}>
                Add Item
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
