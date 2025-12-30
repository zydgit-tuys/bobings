import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";

interface ProductListProps {
  embedded?: boolean;
}

export default function ProductList({ embedded = false }: ProductListProps) {
  const navigate = useNavigate();
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    {
      key: "image",
      header: "",
      hideOnMobile: true,
      sortable: false,
      filterable: false,
      render: (item: any) => {
        const firstImage = item.images?.[0];
        return (
          <div className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center">
            {firstImage ? (
              <img src={firstImage} alt={item.name} className="w-full h-full object-cover" />
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
      render: (item: any) => `Rp ${item.base_price.toLocaleString('id-ID')}`,
    },
    {
      key: "variants",
      header: "Variant",
      render: (item: any) => item.product_variants?.length ?? 0,
    },
    {
      key: "actions",
      header: "",
      hideOnMobile: true,
      sortable: false,
      filterable: false,
      render: (item: any) => (
        <div className="flex gap-2">
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
        </div>
      ),
    },
  ];

  const mobileCardRender = (product: any) => {
    const firstImage = product.images?.[0];
    return (
      <div className="p-3 flex gap-3">
        <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
          {firstImage ? (
            <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.sku_master}</p>
            </div>
            <span className="text-xs font-medium text-primary ml-2 flex-shrink-0">
              Rp {product.base_price.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span>{product.brands?.name ?? "-"}</span>
            <span>{product.product_variants?.length ?? 0} variant</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {!embedded && (
        <PageHeader
          title="Products"
          description="Kelola katalog produk"
          action={
            <Button onClick={() => navigate("/products/new")} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Tambah Produk</span>
              <span className="sm:hidden">Tambah</span>
            </Button>
          }
        />
      )}
      
      {embedded && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate("/products/new")} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={products ?? []}
        isLoading={isLoading}
        emptyMessage="Belum ada produk. Tambahkan produk pertama."
        onRowClick={(item) => navigate(`/products/${item.id}`)}
        mobileCardRender={mobileCardRender}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hapus Produk"
        description="Yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan."
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
