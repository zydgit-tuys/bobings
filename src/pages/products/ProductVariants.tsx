import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Sparkles } from "lucide-react";
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
import { useVariants, useCreateVariant, useUpdateVariant, useVariantAttributes, useProduct } from "@/hooks/use-products";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sortSizes } from "@/lib/utils/sortSizes";
import { BulkVariantCreator } from "@/components/products/BulkVariantCreator";
import { toast } from "sonner";

const variantSchema = z.object({
  sku_variant: z.string().min(1, "SKU is required"),
  size_value_id: z.string().optional(),
  color_value_id: z.string().optional(),
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: variants, isLoading } = useVariants(productId);
  const { data: attributes } = useVariantAttributes();
  const { data: product } = useProduct(productId);
  const createVariant = useCreateVariant();
  const updateVariant = useUpdateVariant();

  // Find Size and Color attributes
  const sizeAttr = attributes?.find((a: any) => a.name.toLowerCase() === 'size');
  const colorAttr = attributes?.find((a: any) => a.name.toLowerCase() === 'color');

  const form = useForm<VariantFormData>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      sku_variant: "",
      size_value_id: "",
      color_value_id: "",
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
          size_value_id: data.size_value_id || null,
          color_value_id: data.color_value_id || null,
          price: data.price,
          hpp: data.hpp,
          stock_qty: data.stock_qty,
          min_stock_alert: data.min_stock_alert,
          product_id: productId,
          is_active: true,
          virtual_stock_qty: 0,
        },
        { onSuccess: () => { setOpen(false); form.reset(); } }
      );
    }
  };

  const handleEdit = (variant: any) => {
    setEditId(variant.id);
    form.reset({
      sku_variant: variant.sku_variant,
      size_value_id: variant.size_value_id || "",
      color_value_id: variant.color_value_id || "",
      price: variant.price,
      hpp: variant.hpp,
      stock_qty: variant.stock_qty,
      min_stock_alert: variant.min_stock_alert,
    });
    setOpen(true);
  };

  const columns = [
    { key: "sku_variant", header: "SKU" },
    {
      key: "size",
      header: "Size",
      render: (item: any) => {
        const sizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === item.size_value_id);
        return sizeValue?.value || '-';
      },
      sortFn: (a: any, b: any) => {
        const aSizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === a.size_value_id);
        const bSizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === b.size_value_id);

        if (!aSizeValue && !bSizeValue) return 0;
        if (!aSizeValue) return 1;
        if (!bSizeValue) return -1;

        const sorted = sortSizes([aSizeValue, bSizeValue]);
        return sorted[0].id === aSizeValue.id ? -1 : 1;
      },
    },
    {
      key: "color",
      header: "Color",
      render: (item: any) => {
        const colorValue = colorAttr?.attribute_values?.find((v: any) => v.id === item.color_value_id);
        return colorValue?.value || '-';
      },
      sortFn: (a: any, b: any) => {
        const aColorValue = colorAttr?.attribute_values?.find((v: any) => v.id === a.color_value_id);
        const bColorValue = colorAttr?.attribute_values?.find((v: any) => v.id === b.color_value_id);

        if (!aColorValue && !bColorValue) return 0;
        if (!aColorValue) return 1;
        if (!bColorValue) return -1;

        return aColorValue.value.localeCompare(bColorValue.value);
      },
    },
    {
      key: "price",
      header: "Harga",
      render: (item: any) => `Rp ${item.price.toLocaleString('id-ID')}`,
    },
    { key: "stock_qty", header: "Stok" },
  ];

  // Sort variants by size
  const sortedVariants = useMemo(() => {
    if (!variants) return [];

    return [...variants].sort((a, b) => {
      const aSizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === a.size_value_id);
      const bSizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === b.size_value_id);

      if (!aSizeValue && !bSizeValue) return 0;
      if (!aSizeValue) return 1;
      if (!bSizeValue) return -1;

      const sorted = sortSizes([aSizeValue, bSizeValue]);
      return sorted[0].id === aSizeValue.id ? -1 : 1;
    });
  }, [variants, sizeAttr]);

  // Handle bulk variant creation
  const handleBulkCreate = async (bulkVariants: any[]) => {
    try {
      for (const variant of bulkVariants) {
        // Check SKU exists
        const skuExists = variants?.some(v => v.sku_variant === variant.sku_variant);
        if (skuExists) {
          toast.error(`SKU ${variant.sku_variant} already exists`);
          continue;
        }

        await createVariant.mutateAsync({
          ...variant,
          product_id: productId,
          is_active: true,
          virtual_stock_qty: 0,
        });
      }
      toast.success(`${bulkVariants.length} variants created successfully`);
    } catch (error: any) {
      toast.error(`Failed to create variants: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
        <CardTitle className="text-sm md:text-base">Variant</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs md:h-9 md:text-sm"
            onClick={() => setBulkOpen(true)}
          >
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            <span className="hidden sm:inline">Bulk Create</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-7 text-xs md:h-9 md:text-sm"
                onClick={() => {
                  setEditId(null);
                  form.reset();
                }}
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-2">
              <DialogHeader>
                <DialogTitle className="text-base">{editId ? "Edit Variant" : "Tambah Variant"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="sku_variant"
                    render={({ field }) => {
                      const skuExists = !editId && variants?.some(v => v.sku_variant === field.value);
                      return (
                        <FormItem>
                          <FormLabel className="text-xs">SKU Variant</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PROD-001-BLK-M" className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage />
                          {skuExists && (
                            <p className="text-xs text-destructive">
                              ⚠️ SKU already exists. Try: {field.value}-V2
                            </p>
                          )}
                          {!field.value && product?.sku_master && (
                            <p className="text-xs text-muted-foreground">
                              💡 Suggested: {product.sku_master}-[COLOR]-[SIZE]
                            </p>
                          )}
                        </FormItem>
                      );
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="size_value_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortSizes(sizeAttr?.attribute_values || []).map((val: any) => (
                                <SelectItem key={val.id} value={val.id}>
                                  {val.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="color_value_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Color</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {colorAttr?.attribute_values?.map((val: any) => (
                                <SelectItem key={val.id} value={val.id}>
                                  {val.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Harga (Rp)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} className="h-9 text-sm" />
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
                          <FormLabel className="text-xs">HPP (Rp)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="stock_qty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Stok</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} className="h-9 text-sm" />
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
                          <FormLabel className="text-xs">Min Stok</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min={0} className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full"
                    disabled={createVariant.isPending || updateVariant.isPending}
                  >
                    {editId ? "Update" : "Simpan"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-6 pt-0">
        <DataTable
          columns={columns}
          data={sortedVariants}
          isLoading={isLoading}
          emptyMessage="Belum ada variant"
          onRowClick={handleEdit}
        />
      </CardContent>

      <BulkVariantCreator
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        skuMaster={product?.sku_master || ''}
        basePrice={product?.base_price || 0}
        baseHpp={0}
        onCreateVariants={handleBulkCreate}
      />
    </Card>
  );
}
