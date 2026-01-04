import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Sparkles, Edit, History as HistoryIcon } from "lucide-react";
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
import { BulkVariantEditor } from "@/components/products/BulkVariantEditor";
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
import { PriceHistoryDialog } from "@/components/products/PriceHistoryDialog";
import { toast } from "sonner";

const variantSchema = z.object({
  sku_variant: z.string().min(1, "SKU is required"),
  size_value_id: z.string().optional(),
  color_value_id: z.string().optional(),
  price: z.coerce.number().min(0),  // Selling price
  hpp: z.coerce.number().min(0, "HPP must be >= 0"), // NEW
  harga_jual_umum: z.coerce.number().min(0, "Harga Umum must be >= 0"),
  harga_khusus: z.coerce.number().min(0, "Harga Khusus must be >= 0"),
  initial_stock: z.coerce.number().min(0),
  min_stock_alert: z.coerce.number().min(0),
  barcode: z.string().optional(),
});

type VariantFormData = z.infer<typeof variantSchema>;

interface ProductVariantsProps {
  productId: string;
}

export default function ProductVariants({ productId }: ProductVariantsProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVariant, setHistoryVariant] = useState<{ id: string, name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSize, setFilterSize] = useState<string>("");
  const [filterColor, setFilterColor] = useState<string>("");

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
      harga_jual_umum: 0,
      harga_khusus: 0,
      initial_stock: 0,
      min_stock_alert: 5,
      barcode: "",
    },
  });

  // Auto-generate SKU variant when size or color changes
  const watchSize = form.watch("size_value_id");
  const watchColor = form.watch("color_value_id");

  useEffect(() => {
    if (!product?.sku_master) return;

    const sizeValue = sizeAttr?.attribute_values?.find((v: any) => v.id === watchSize);
    const colorValue = colorAttr?.attribute_values?.find((v: any) => v.id === watchColor);

    let generatedSKU = product.sku_master;

    if (colorValue) {
      const colorPart = colorValue.value.replace(/\s+/g, '-').toUpperCase();
      generatedSKU += `-${colorPart}`;
    }

    if (sizeValue) {
      const sizePart = sizeValue.value.replace(/\s+/g, '-').toUpperCase();
      generatedSKU += `-${sizePart}`;
    }

    // Only update if different from current value
    if (generatedSKU !== product.sku_master && generatedSKU !== form.getValues("sku_variant")) {
      form.setValue("sku_variant", generatedSKU);
    }
  }, [watchSize, watchColor, product, sizeAttr, colorAttr, form]);

  const onSubmit = (data: VariantFormData) => {
    if (editId) {
      updateVariant.mutate(
        // @ts-ignore - API expects partial update, types might need update
        { id: editId, data: { ...data, initial_stock: data.initial_stock } },
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
          harga_jual_umum: data.harga_jual_umum,
          harga_khusus: data.harga_khusus,
          initial_stock: data.initial_stock,
          stock_qty: data.initial_stock,
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
      size_value_id: variant.size_value_id || "",
      color_value_id: variant.color_value_id || "",
      price: variant.price,
      harga_jual_umum: variant.harga_jual_umum || 0,
      harga_khusus: variant.harga_khusus || 0,
      initial_stock: variant.initial_stock || 0,
      min_stock_alert: variant.min_stock_alert,
      barcode: variant.barcode || "",
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
      header: "Base Price",
      render: (item: any) => `Rp ${item.price.toLocaleString('id-ID')}`,
    },
    {
      key: "harga_jual_umum",
      header: "Harga Umum",
      render: (item: any) => (
        <span className="text-blue-600 font-medium">
          Rp {(item.harga_jual_umum || 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: "harga_khusus",
      header: "Harga Khusus",
      render: (item: any) => (
        <span className="text-purple-600 font-medium">
          Rp {(item.harga_khusus || 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: "stock_qty",
      header: "Stok",
      render: (item: any) => item.stock_qty || 0,
    },
    {
      key: "reserved_qty",
      header: "Reserved",
      render: (item: any) => item.reserved_qty || 0,
    },
    {
      key: "available_qty",
      header: "Available",
      render: (item: any) => {
        const available = (item.stock_qty || 0) - (item.reserved_qty || 0);
        return (
          <span className={available < (item.min_stock_alert || 0) ? "text-destructive font-medium" : ""}>
            {available}
          </span>
        );
      },
    },
    {
      key: "barcode",
      header: "Barcode",
      render: (item: any) => item.barcode || '-',
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: any) => (
        <Button
          variant="ghost"
          size="icon"
          title="View Price History"
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click (Edit)
            setHistoryVariant({ id: item.id, name: `${item.sku_variant} (${item.product?.name || 'Product'})` });
            setHistoryOpen(true);
          }}
        >
          <HistoryIcon className="h-4 w-4" />
        </Button>
      ),
    },
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

  // Smart filter variants based on search, size, and color
  const filteredVariants = useMemo(() => {
    let filtered = sortedVariants;

    // Filter by size
    if (filterSize) {
      filtered = filtered.filter((variant: any) => variant.size_value_id === filterSize);
    }

    // Filter by color
    if (filterColor) {
      filtered = filtered.filter((variant: any) => variant.color_value_id === filterColor);
    }

    // Filter by search query (SKU or Barcode)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((variant: any) =>
        variant.sku_variant?.toLowerCase().includes(query) ||
        variant.barcode?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [sortedVariants, searchQuery, filterSize, filterColor]);

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
        });
      }
      toast.success(`${bulkVariants.length} variants created successfully`);
    } catch (error: any) {
      toast.error(`Failed to create variants: ${error.message}`);
    }
  };

  const handleBulkUpdate = async (ids: string[], updates: any) => {
    try {
      let successCount = 0;
      let failCount = 0;

      // Optimistic update could be complex here, so we stick to invalidation
      for (const id of ids) {
        try {
          // We need to cast updateVariant to ignore type check for now or ensure types align
          // @ts-ignore
          await updateVariant.mutateAsync({ id, data: updates });
          successCount++;
        } catch (e) {
          failCount++;
          console.error(`Failed to update ${id}`, e);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} variants updated`);
        setSelectedVariantIds([]); // Clear selection on success
      }
      if (failCount > 0) {
        toast.error(`${failCount} failed to update`);
      }

    } catch (error: any) {
      toast.error("Bulk update failed");
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 space-y-3">
        <div className="flex flex-row items-center justify-between">
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

            {selectedVariantIds.length > 0 && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs md:h-9 md:text-sm bg-orange-600 hover:bg-orange-700"
                onClick={() => setBulkEditOpen(true)}
              >
                <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden sm:inline">Bulk Edit ({selectedVariantIds.length})</span>
              </Button>
            )}
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
                  <span className="hidden sm:inline">Tambah</span>
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
                                💡 Auto Generate (Langsung Isi Color dan Size)
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

                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="hpp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold text-orange-600">Ref. HPP (Modal)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min={0} className="h-9 text-sm border-orange-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Standard Price (Rp)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min={0} className="h-9 text-sm" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="harga_jual_umum"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-blue-600">Harga Umum (Rp)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min={0} className="h-9 text-sm border-blue-100" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="harga_khusus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-purple-600">Harga Khusus (Rp)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min={0} className="h-9 text-sm border-purple-300" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="initial_stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Initial Stock (Saldo Awal)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min={0}
                                className={`h-9 text-sm ${editId ? "bg-muted text-muted-foreground" : ""}`}
                                disabled={!!editId}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-[10px] text-muted-foreground">
                              {editId
                                ? "❌ Terkunci. Gunakan Menu Opname / Adjustment untuk ubah stok."
                                : "*Hanya diisi saat pertama kali buat."
                              }
                            </p>
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

                    {editId && (
                      <div className="bg-muted/50 p-2 rounded-md mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Status Stok Saat Ini:</p>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="text-xs">
                            <span className="block text-[10px] text-muted-foreground">Initial</span>
                            {form.getValues("initial_stock")}
                          </div>
                          <div className="text-xs">
                            <span className="block text-[10px] text-muted-foreground">Fisik (Gudang)</span>
                            <span className="font-bold">{variants?.find(v => v.id === editId)?.stock_qty || 0}</span>
                          </div>
                          <div className="text-xs">
                            <span className="block text-[10px] text-muted-foreground">Available</span>
                            <span className="text-green-600 font-bold">
                              {/* Calculate Available on the fly */}
                              {(variants?.find(v => v.id === editId)?.stock_qty || 0) - (variants?.find(v => v.id === editId)?.reserved_qty || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Barcode (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter barcode" className="h-9 text-sm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
        </div>

        {/* Smart Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Size Filter */}
          <Select
            value={filterSize || "__all__"}
            onValueChange={(val) => setFilterSize(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Sizes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sizes</SelectItem>
              {sortSizes(
                (sizeAttr?.attribute_values || []).filter((val: any) =>
                  // Show if it exists in variants OR if it's currently selected
                  variants?.some((v: any) => v.size_value_id === val.id) || filterSize === val.id
                )
              ).map((val: any) => (
                <SelectItem key={val.id} value={val.id}>
                  {val.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Color Filter */}
          <Select
            value={filterColor || "__all__"}
            onValueChange={(val) => setFilterColor(val === "__all__" ? "" : val)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="All Colors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Colors</SelectItem>
              {colorAttr?.attribute_values
                ?.filter((val: any) =>
                  // Show if it exists in variants OR if it's currently selected
                  variants?.some((v: any) => v.color_value_id === val.id) || filterColor === val.id
                )
                .slice()
                .sort((a: any, b: any) => a.value.localeCompare(b.value))
                .map((val: any) => (
                  <SelectItem key={val.id} value={val.id}>
                    {val.value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Search Input */}
          <Input
            placeholder="Search SKU or Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-6 pt-0">
        <DataTable
          columns={columns}
          data={filteredVariants}
          isLoading={isLoading}
          showFilters={false}
          emptyMessage={
            searchQuery || filterSize || filterColor
              ? "No variants found with current filters"
              : "Belum ada variant"
          }
          onRowClick={handleEdit}
          enableSelection={true}
          selectedIds={selectedVariantIds}
          onSelectionChange={setSelectedVariantIds}
        />
      </CardContent>

      <BulkVariantCreator
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        skuMaster={product?.sku_master || ''}
        basePrice={product?.base_price || 0}

        onCreateVariants={handleBulkCreate}
      />

      <BulkVariantEditor
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedVariantIds={selectedVariantIds}
        onUpdateVariants={handleBulkUpdate}
      />
      <PriceHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        variantId={historyVariant?.id || ""}
        variantName={historyVariant?.name || ""}
      />
    </Card>
  );
}
