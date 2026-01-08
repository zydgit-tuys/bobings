
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Image, History, RotateCcw, Package, AlertTriangle, Coins, LayoutGrid, List } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useProducts, useDeleteProduct, useRestoreProduct, useUpdateProduct, useBrands, useCategories, useVariantAttributes } from "@/hooks/use-products";
import { Search, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInventoryCostSnapshots } from "@/lib/api/inventory";

interface ProductListProps {
  embedded?: boolean;
}

export default function ProductList({ embedded = false }: ProductListProps) {
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const { data: products, isLoading } = useProducts(showArchived);
  const { data: brands } = useBrands();
  const { data: categories } = useCategories();

  const deleteProduct = useDeleteProduct();
  const restoreProduct = useRestoreProduct();
  const updateProduct = useUpdateProduct();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data: attributes } = useVariantAttributes();

  const variantIds = useMemo(() => (
    products?.flatMap((product: any) => product.product_variants?.map((variant: any) => variant.id) ?? []) ?? []
  ), [products]);

  const { data: costSnapshots = [] } = useQuery({
    queryKey: ['inventory-costs', variantIds],
    queryFn: () => getInventoryCostSnapshots(variantIds),
    enabled: variantIds.length > 0,
  });

  const costMap = useMemo(() => (
    new Map(costSnapshots.map((snapshot) => [snapshot.variant_id, snapshot]))
  ), [costSnapshots]);

  const getVariantName = (variant: any) => {
    const sizeAttr = attributes?.find((a: any) => a.code === 'size' || a.name.toLowerCase() === 'size');
    const colorAttr = attributes?.find((a: any) => a.code === 'color' || a.name.toLowerCase() === 'color');

    // Note: This relies on attribute values being eager loaded or we need another way.
    // getVariantAttributes API usually eager loads attribute_values if configured.
    // Let's assume attribute_values are available on attributes.

    const sizeName = sizeAttr?.attribute_values?.find((v: any) => v.id === variant.size_value_id)?.value;
    const colorName = colorAttr?.attribute_values?.find((v: any) => v.id === variant.color_value_id)?.value;

    const parts = [sizeName, colorName].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : variant.sku_variant;
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      // 1. Search (Name OR SKU OR Barcode)
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.sku_master.toLowerCase().includes(query) ||
        (product.barcode && product.barcode.toLowerCase().includes(query));

      // 2. Brand
      const matchesBrand = filterBrand === "all" || product.brand_id === filterBrand;

      // 3. Category
      const matchesCategory = filterCategory === "all" || product.category_id === filterCategory;

      // 4. Status (Low Stock)
      let matchesStatus = true;
      if (filterStatus === "low_stock") {
        const variants = product.product_variants || [];
        matchesStatus = variants.some((v: any) => (v.stock_qty || 0) <= (v.min_stock_alert || 5));
      }

      return matchesSearch && matchesBrand && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, filterBrand, filterCategory, filterStatus]);

  const metrics = useMemo(() => {
    if (!products) return { total: 0, lowStock: 0, assetValue: 0 };

    return products.reduce((acc, product) => {
      const variants = product.product_variants || [];
      // Check low stock: if ANY variant is below alert threshold
      const isLowStock = variants.some((v: any) => (v.stock_qty || 0) <= (v.min_stock_alert || 5));
      // Asset value: SUM(stock * last/average cost) per variant
      const value = variants.reduce((vVal: number, v: any) => {
        const costSnapshot = costMap.get(v.id);
        const unitCost = costSnapshot?.weighted_avg_cost ?? costSnapshot?.last_unit_cost ?? 0;
        return vVal + ((v.stock_qty || 0) * Number(unitCost || 0));
      }, 0);

      return {
        total: acc.total + 1,
        lowStock: acc.lowStock + (isLowStock ? 1 : 0),
        assetValue: acc.assetValue + value
      };
    }, { total: 0, lowStock: 0, assetValue: 0 });
  }, [products, costMap]);

  const columns = [
    {
      key: "image",
      header: "",
      hideOnMobile: true,
      sortable: false,
      filterable: false,
      render: (item: any) => {
        const images = item.product_images || [];
        // Find primary or first by display_order
        const sorted = [...images].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
        const displayImage = images.find((img: any) => img.is_primary) || sorted[0];

        const imageUrl = displayImage?.image_url || item.images?.[0];

        return (
          <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <Image className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
      },
    },
    { key: "sku_master", header: "SKU", primary: true },
    { key: "name", header: "Nama", primary: true },
    {
      key: "brand",
      header: "Brand",
      hideOnMobile: true,
      render: (item: any) => item.brands?.name ?? "-",
    },
    {
      key: "category",
      header: "Kategori",
      hideOnMobile: true,
      render: (item: any) => item.categories?.name ?? "-",
    },
    {
      key: "base_price",
      header: "Harga",
      render: (item: any) => `Rp ${item.base_price.toLocaleString('id-ID')} `,
    },
    {
      key: "stock",
      header: "Total Stok",
      render: (item: any) => {
        const variants = item.product_variants || [];
        const totalStock = variants.reduce((acc: number, v: any) => acc + (v.stock_qty || 0), 0);
        const hasLowStock = variants.some((v: any) => (v.stock_qty || 0) <= (v.min_stock_alert || 5));

        if (totalStock === 0) {
          return <span className="text-destructive font-medium">Habis (0)</span>;
        }

        if (hasLowStock) {
          return (
            <div className="flex flex-col">
              <span className="font-medium text-orange-600">{totalStock}</span>
              <span className="text-[10px] text-orange-600">Ada stok menipis</span>
            </div>
          );
        }

        return <span>{totalStock}</span>;
      },
    },
    {
      key: "is_active",
      header: "Status",
      sortable: false,
      render: (item: any) => (
        <Switch
          checked={item.is_active}
          onCheckedChange={(checked) => {
            updateProduct.mutate({
              id: item.id,
              data: { is_active: checked },
            });
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      hideOnMobile: true,
      sortable: false,
      filterable: false,
      render: (item: any) => (
        <div className="flex gap-2">

          {showArchived ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                restoreProduct.mutate(item.id);
              }}
              title="Restore Product"
            >
              <RotateCcw className="h-4 w-4 text-green-600" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/inventory/movements?product=${item.id}`);
                }}
                className="hidden lg:flex"
              >
                <History className="h-4 w-4 mr-1" />
                Riwayat
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/products/${item.id}`);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(item.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const mobileCardRender = (product: any) => {
    const firstImage = product.images?.[0];
    return (
      <div className="flex w-full overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        <div className="min-w-full snap-start p-3 flex gap-3 bg-card">
          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {firstImage ? (
              <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Image className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium line-clamp-1">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.sku_master}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">Rp {product.base_price.toLocaleString('id-ID')}</div>
              </div>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
              <span>{product.brands?.name ?? "-"}</span>
              <span>{product.product_variants?.length ?? 0} varian</span>
              <span className="flex items-center text-orange-600 font-medium">
                {product.product_variants?.some((v: any) => v.stock_qty <= (v.min_stock_alert || 0)) ? "Stok Menipis" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Swipe Actions */}
        <div className="flex snap-start">
          <Button
            variant="ghost"
            className="h-full rounded-none bg-orange-100 hover:bg-orange-200 text-orange-700 w-16 px-0 flex flex-col items-center justify-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${product.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
            <span className="text-[10px]">Edit</span>
          </Button>
          <Button
            variant="ghost"
            className="h-full rounded-none bg-red-100 hover:bg-red-200 text-red-700 w-16 px-0 flex flex-col items-center justify-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(product.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-[10px]">Del</span>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Products"
          description="Kelola katalog produk"
          action={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Show Archived
                </Label>
              </div>
              <Button onClick={() => navigate("/products/new")} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tambah Produk</span>
                <span className="sm:hidden">Tambah</span>
              </Button>
            </div>
          }
        />
      )}

      {/* Business Intelligence Dashboard (Compact) */}
      {!embedded && !showArchived && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Total Product */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Produk</p>
                <div className="text-lg font-bold leading-none mt-1">{metrics.total}</div>
              </div>
            </div>
          </Card>

          {/* Low Stock Alert */}
          <Card
            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${metrics.lowStock > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'low_stock' ? 'all' : 'low_stock')}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full shrink-0 ${metrics.lowStock > 0 ? 'bg-orange-100' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${metrics.lowStock > 0 ? "text-orange-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Perlu Restock</p>
                <div className={`text-lg font-bold leading-none mt-1 ${metrics.lowStock > 0 ? "text-orange-700" : ""}`}>{metrics.lowStock}</div>
              </div>
            </div>
          </Card>

          {/* Asset Value */}
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full shrink-0">
                <Coins className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nilai Aset (HPP)</p>
                <div className="text-lg font-bold leading-none mt-1">Rp {metrics.assetValue.toLocaleString('id-ID')}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Smart Filters */}
      {!embedded && !showArchived && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Name, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex border rounded-md overflow-hidden bg-background">
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-none ${viewMode === 'list' ? 'bg-muted' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-none ${viewMode === 'grid' ? 'bg-muted' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger>
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="low_stock">⚠️ Perlu Restock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {embedded && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate("/products/new")} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>
      )}

      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          data={filteredProducts}
          isLoading={isLoading}
          showFilters={false}
          emptyMessage={
            searchQuery || filterBrand !== "all" || filterCategory !== "all" || filterStatus !== "all"
              ? "Tidak ada produk yang cocok dengan filter."
              : "Belum ada produk. Tambahkan produk pertama."
          }
          onRowClick={(item) => navigate(`/products/${item.id}/variants`)}
          mobileCardRender={mobileCardRender}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0 aspect-square bg-muted" />
              </Card>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Tidak ada produk ditemukan
            </div>
          ) : (
            filteredProducts.map((product) => {
              const images = product.product_images || [];
              const sorted = [...images].sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
              const displayImage = images.find((img: any) => img.is_primary) || sorted[0];
              const imageUrl = displayImage?.image_url || product.images?.[0];

              const variants = product.product_variants || [];
              const totalStock = variants.reduce((acc: number, v: any) => acc + (v.stock_qty || 0), 0);
              const isLowStock = variants.some((v: any) => (v.stock_qty || 0) <= (v.min_stock_alert || 5));

              return (
                <Card
                  key={product.id}
                  className={`group cursor-pointer hover:shadow-lg transition-all border-muted relative overflow-hidden ${isLowStock ? 'border-amber-200 bg-amber-50/10' : ''}`}
                  onClick={() => navigate(`/products/${product.id}/variants`)}
                >
                  <div className="aspect-square bg-muted/20 relative overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                        <Package className="h-12 w-12" />
                      </div>
                    )}

                    {isLowStock && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Low Stock
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2 min-h-[40px] mb-1" title={product.name}>
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between mt-2">
                      <div className="font-bold text-primary">
                        Rp {product.base_price?.toLocaleString('id-ID') ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Stok: {totalStock}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <span className="truncate max-w-[80px]">{product.brands?.name || '-'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[80px]">{product.categories?.name || '-'}</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={() => {
          if (deleteId) {
            deleteProduct.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isLoading={deleteProduct.isPending}
      />
    </div>
  );
}
