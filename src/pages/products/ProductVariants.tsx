import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { useVariants, useCreateVariant, useUpdateVariant } from "@/hooks/use-products";

const variantSchema = z.object({
  sku_variant: z.string().min(1, "SKU is required"),
  price: z.coerce.number().min(0),
  hpp: z.coerce.number().min(0),
  stock_qty: z.coerce.number().min(0),
  min_stock_alert: z.coerce.number().min(0),
});

type VariantFormData = z.infer<typeof variantSchema>;

interface ProductVariantsProps {
  productId: string;
}

export function ProductVariants({ productId }: ProductVariantsProps) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: variants, isLoading } = useVariants(productId);
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();

  const form = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      sku_variant: "",
      price: 0,
      hpp: 0,
      stock_qty: 0,
      min_stock_alert: 5,
    },
  });

  const onSubmit = (data: VariantFormData) => {
    if (editId) {
      updateVariant.mutate(
        { id: editId, data },
        { onSuccess: () => { setOpen(false); setEditId(null); form.reset(); } }
      );
    } else {
      createVariant.mutate(
        {
          sku_variant: data.sku_variant,
          price: data.price,
          hpp: data.hpp,
          stock_qty: data.stock_qty,
          min_stock_alert: data.min_stock_alert,
          product_id: productId,
          is_active: true,
        },
        { onSuccess: () => { setOpen(false); form.reset(); } }
      );
    }
  };

  const handleEdit = (variant: any) => {
    setEditId(variant.id);
    form.reset({
      sku_variant: variant.sku_variant,
      price: variant.price,
      hpp: variant.hpp,
      stock_qty: variant.stock_qty,
      min_stock_alert: variant.min_stock_alert,
    });
    setOpen(true);
  };

  const columns = [
    { key: "sku_variant", header: "SKU Variant" },
    {
      key: "price",
      header: "Price",
      render: (item: any) => `Rp ${item.price.toLocaleString()}`,
    },
    {
      key: "hpp",
      header: "HPP",
      render: (item: any) => `Rp ${item.hpp.toLocaleString()}`,
    },
    { key: "stock_qty", header: "Stock" },
    { key: "min_stock_alert", header: "Min Stock" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Variants</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                setEditId(null);
                form.reset();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Variant" : "Add Variant"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sku_variant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU Variant</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., PROD-001-BLK-M" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (Rp)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hpp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HPP (Rp)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_qty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Qty</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_stock_alert"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Stock Alert</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createVariant.isPending || updateVariant.isPending}
                >
                  {editId ? "Update Variant" : "Add Variant"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={variants ?? []}
          isLoading={isLoading}
          emptyMessage="No variants yet"
          onRowClick={handleEdit}
        />
      </CardContent>
    </Card>
  );
}
