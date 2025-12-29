import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useProducts, useDeleteProduct } from "@/hooks/use-products";

export default function ProductList() {
  const navigate = useNavigate();
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
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

  return (
    <div>
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

      <DataTable
        columns={columns}
        data={products ?? []}
        isLoading={isLoading}
        emptyMessage="No products found. Add your first product."
        onRowClick={(item) => navigate(`/products/${item.id}`)}
      />

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
