import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MobileCardList } from "@/components/shared/MobileCardList";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductListProps {
  embedded?: boolean;
}

export default function ProductList({ embedded = false }: ProductListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    {
      key: "image",
      header: "",
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
    { key: "sku_master", header: "SKU" },
    { key: "name", header: "Name" },
    {
      key: "brand",
      header: "Brand",
      render: (item: any) => item.brands?.name ?? "-",
    },
    {
      key: "category",
      header: "Category",
      render: (item: any) => item.categories?.name ?? "-",
    },
    {
      key: "base_price",
      header: "Base Price",
      render: (item: any) => `Rp ${item.base_price.toLocaleString()}`,
    },
    {
      key: "variants",
      header: "Variants",
      render: (item: any) => item.product_variants?.length ?? 0,
    },
    {
      key: "actions",
      header: "",
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

  const renderProductCard = (product: any) => {
    const firstImage = product.images?.[0];
    return (
      <div className="p-4 flex gap-3">
        <div className="w-14 h-14 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
          {firstImage ? (
            <img src={firstImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Image className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.sku_master}</p>
            </div>
            <span className="text-sm font-medium text-primary ml-2 flex-shrink-0">
              Rp {product.base_price.toLocaleString()}
            </span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{product.brands?.name ?? "-"}</span>
            <span>{product.product_variants?.length ?? 0} variants</span>
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
          description="Manage your product catalog"
          action={
            <Button onClick={() => navigate("/products/new")} size="sm" className="md:size-default">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          }
        />
      )}
      
      {embedded && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate("/products/new")} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      )}

      {isMobile ? (
        <MobileCardList
          data={products ?? []}
          isLoading={isLoading}
          emptyMessage="No products found. Add your first product."
          renderCard={renderProductCard}
          onCardClick={(item) => navigate(`/products/${item.id}`)}
          leftActions={[
            {
              icon: <Pencil className="h-5 w-5" />,
              label: "Edit",
              onClick: (item) => navigate(`/products/${item.id}`),
            },
          ]}
          rightActions={[
            {
              icon: <Trash2 className="h-5 w-5" />,
              label: "Delete",
              onClick: (item) => setDeleteId(item.id),
              variant: "destructive",
            },
          ]}
        />
      ) : (
        <DataTable
          columns={columns}
          data={products ?? []}
          isLoading={isLoading}
          emptyMessage="No products found. Add your first product."
          onRowClick={(item) => navigate(`/products/${item.id}`)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
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
