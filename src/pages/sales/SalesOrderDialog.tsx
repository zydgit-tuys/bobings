import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/use-products";
import { useCreateSalesOrder } from "@/hooks/use-sales";

const orderItemSchema = z.object({
  variant_id: z.string().min(1, "Pilih produk"),
  qty: z.coerce.number().min(1, "Min 1"),
  unit_price: z.coerce.number().min(0, "Min 0"),
  hpp: z.coerce.number().min(0, "Min 0"),
});

const formSchema = z.object({
  order_no: z.string().min(1, "Order No wajib diisi").max(100),
  order_date: z.string().min(1, "Tanggal wajib diisi"),
  marketplace: z.string().optional(),
  customer_name: z.string().max(200).optional(),
  status: z.enum(["pending", "completed", "cancelled", "returned"]),
  total_fees: z.coerce.number().min(0, "Min 0"),
  items: z.array(orderItemSchema).min(1, "Minimal 1 item"),
});

type FormData = z.infer<typeof formSchema>;

interface SalesOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesOrderDialog({ open, onOpenChange }: SalesOrderDialogProps) {
  const { data: products } = useProducts();
  const createOrder = useCreateSalesOrder();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_no: "",
      order_date: new Date().toISOString().split("T")[0],
      marketplace: "",
      customer_name: "",
      status: "completed",
      total_fees: 0,
      items: [{ variant_id: "", qty: 1, unit_price: 0, hpp: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Build variant options from products
  const variantOptions = products?.flatMap((product) =>
    product.product_variants?.map((variant: any) => ({
      id: variant.id,
      label: `${product.name} - ${variant.sku_variant}`,
      price: variant.price,
      hpp: variant.hpp,
    })) ?? []
  ) ?? [];

  const handleVariantChange = (index: number, variantId: string) => {
    const variant = variantOptions.find((v) => v.id === variantId);
    if (variant) {
      form.setValue(`items.${index}.unit_price`, variant.price);
      form.setValue(`items.${index}.hpp`, variant.hpp);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createOrder.mutateAsync({
        order_no: data.order_no,
        order_date: data.order_date,
        marketplace: data.marketplace,
        customer_name: data.customer_name,
        status: data.status,
        total_fees: data.total_fees,
        items: data.items.map(item => ({
          variant_id: item.variant_id,
          qty: item.qty,
          unit_price: item.unit_price,
          hpp: item.hpp,
        })),
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  // Calculate totals
  const items = form.watch("items");
  const totalFees = form.watch("total_fees") || 0;
  
  const totalAmount = items.reduce((sum, item) => 
    sum + (item.qty || 0) * (item.unit_price || 0), 0
  );
  const totalHpp = items.reduce((sum, item) => 
    sum + (item.qty || 0) * (item.hpp || 0), 0
  );
  const profit = totalAmount - totalHpp - totalFees;

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Sales Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="order_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order No *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ORD-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketplace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketplace</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih marketplace" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Shopee">Shopee</SelectItem>
                        <SelectItem value="Tokopedia">Tokopedia</SelectItem>
                        <SelectItem value="Lazada">Lazada</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Other">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nama customer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Fee (Admin + Ongkir)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Order Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Items *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ variant_id: "", qty: 1, unit_price: 0, hpp: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg">
                  <div className="col-span-12 md:col-span-5">
                    <FormField
                      control={form.control}
                      name={`items.${index}.variant_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Produk</FormLabel>
                          <Select
                            onValueChange={(v) => {
                              field.onChange(v);
                              handleVariantChange(index, v);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Pilih produk" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {variantOptions.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.qty`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Qty</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} min={1} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Harga</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} min={0} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-3 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.hpp`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">HPP</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} min={0} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {form.formState.errors.items?.root && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-medium">Rp {totalAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total HPP:</span>
                <span className="font-medium">Rp {totalHpp.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Fee:</span>
                <span className="font-medium">Rp {totalFees.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Profit:</span>
                <span className={profit >= 0 ? "text-emerald-600" : "text-destructive"}>
                  Rp {profit.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
