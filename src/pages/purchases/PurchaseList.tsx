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
    { key: "purchase_no", header: "PO Number" },
    {
      key: "supplier",
      header: "Supplier",
      render: (item: any) => item.suppliers?.name ?? "-",
    },
    {
      key: "order_date",
      header: "Order Date",
      render: (item: any) => format(new Date(item.order_date), "dd MMM yyyy"),
    },
    {
      key: "status",
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />,
    },
    { key: "total_qty", header: "Total Qty" },
    {
      key: "total_amount",
      header: "Total Amount",
      render: (item: any) => `Rp ${item.total_amount.toLocaleString()}`,
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

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Manage your purchase orders"
        action={
          <Button onClick={() => navigate("/purchases/new")} size="sm" className="md:size-default">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">New Purchase</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={purchases ?? []}
        isLoading={isLoading}
        emptyMessage="No purchase orders found."
        onRowClick={(item) => navigate(`/purchases/${item.id}`)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Purchase Order"
        description="Are you sure you want to delete this purchase order?"
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
