import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePurchases, useDeletePurchase } from "@/hooks/use-purchases";

export default function PurchaseList() {
  const navigate = useNavigate();
  const { data: purchases, isLoading } = usePurchases();
  const deletePurchase = useDeletePurchase();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns = [
    { key: "purchase_no", header: "No. PO", primary: true },
    {
      key: "supplier",
      header: "Supplier",
      primary: true,
      render: (item: any) => item.suppliers?.name ?? "-",
    },
    {
      key: "order_date",
      header: "Tanggal",
      render: (item: any) => format(new Date(item.order_date), "dd MMM yyyy"),
    },
    {
      key: "status",
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />,
    },
    { key: "total_qty", header: "Qty", hideOnMobile: true },
    {
      key: "total_amount",
      header: "Total",
      render: (item: any) => `Rp ${item.total_amount.toLocaleString('id-ID')}`,
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
              navigate(`/purchases/${item.id}`);
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
            disabled={item.status !== "draft"}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const mobileCardRender = (purchase: any) => (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{purchase.purchase_no}</span>
        <StatusBadge status={purchase.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate max-w-[150px]">{purchase.suppliers?.name ?? "-"}</span>
        <span>{format(new Date(purchase.order_date), "dd MMM yyyy")}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{purchase.total_qty} item</span>
        <span className="text-sm font-medium">Rp {purchase.total_amount.toLocaleString('id-ID')}</span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Kelola purchase order"
        action={
          <Button onClick={() => navigate("/purchases/new")} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Buat PO</span>
            <span className="sm:hidden">Baru</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={purchases ?? []}
        isLoading={isLoading}
        emptyMessage="Belum ada purchase order."
        onRowClick={(item) => navigate(`/purchases/${item.id}`)}
        mobileCardRender={mobileCardRender}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hapus Purchase Order"
        description="Yakin ingin menghapus PO ini?"
        onConfirm={() => {
          if (deleteId) {
            deletePurchase.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isLoading={deletePurchase.isPending}
      />
    </div>
  );
}
