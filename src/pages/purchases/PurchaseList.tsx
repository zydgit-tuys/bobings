import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, BookOpen, Truck, CreditCard, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { usePurchases, useDeletePurchase } from "@/hooks/use-purchases";
import { PurchaseSummary } from "./PurchaseSummary";
import { JournalPreviewDialog } from "@/pages/accounting/JournalPreviewDialog";
import { ReceiveDialog } from "./ReceiveDialog";
import { PaymentDialog } from "./PaymentDialog";
import { ReturnDialog } from "./ReturnDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PurchaseList() {
  const navigate = useNavigate();
  const { data: purchases, isLoading } = usePurchases();
  const deletePurchase = useDeletePurchase();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [journalPreviewId, setJournalPreviewId] = useState<string | null>(null);

  // Quick Actions State
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState<{
    receive: boolean;
    payment: boolean;
    return: boolean;
  }>({ receive: false, payment: false, return: false });

  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    if (filterStatus === "all") return purchases;

    // Custom mapping for "ordered" filter to include partial
    if (filterStatus === "ordered") {
      return purchases.filter(p => p.status === 'ordered' || p.status === 'partial');
    }
    // Custom mapping for "completed" filter to include received
    if (filterStatus === "completed") {
      return purchases.filter(p => p.status === 'completed' || p.status === 'received');
    }

    return purchases.filter(p => p.status === filterStatus);
  }, [purchases, filterStatus]);

  const handleAction = (purchase: any, type: 'receive' | 'payment' | 'return') => {
    setSelectedPurchase(purchase);
    setDialogOpen(prev => ({ ...prev, [type]: true }));
  };

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
        <div className="flex gap-1">
          <TooltipProvider>

            {/* 1. Receive Goods (Truck) - For Ordered/Partial */}
            {(item.status === 'ordered' || item.status === 'partial') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={(e) => { e.stopPropagation(); handleAction(item, 'receive'); }}
                  >
                    <Truck className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Terima Barang</TooltipContent>
              </Tooltip>
            )}

            {/* 2. Payment (CreditCard) - For Received/Completed/Partial */}
            {['received', 'completed', 'partial'].includes(item.status) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-emerald-600 hover:bg-emerald-50"
                    onClick={(e) => { e.stopPropagation(); handleAction(item, 'payment'); }}
                  >
                    <CreditCard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bayar / Riwayat</TooltipContent>
              </Tooltip>
            )}

            {/* 3. Return (RotateCcw) - For Completed/Received */}
            {['received', 'completed'].includes(item.status) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-orange-600 hover:bg-orange-50"
                    onClick={(e) => { e.stopPropagation(); handleAction(item, 'return'); }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retur Barang</TooltipContent>
              </Tooltip>
            )}

            {/* 4. Journal Review (Book) - For Completed/Received */}
            {['received', 'completed'].includes(item.status) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:bg-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setJournalPreviewId(item.id);
                    }}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lihat Jurnal</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          {/* Standard Edit/Delete */}
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

          {item.status === 'draft' && (
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
          )}
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

      {/* Mobile Quick Actions */}
      <div className="pt-2 border-t flex justify-end gap-2">
        {(purchase.status === 'ordered' || purchase.status === 'partial') && (
          <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleAction(purchase, 'receive'); }}>
            <Truck className="h-3 w-3 mr-1" /> Terima
          </Button>
        )}
        {['received', 'completed', 'partial'].includes(purchase.status) && (
          <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); handleAction(purchase, 'payment'); }}>
            <CreditCard className="h-3 w-3 mr-1" /> Bayar
          </Button>
        )}
        {['received', 'completed'].includes(purchase.status) && (
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); handleAction(purchase, 'return'); }}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
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

      {/* Summary Cards */}
      <PurchaseSummary
        purchases={purchases || []}
        activeFilter={filterStatus}
        onFilterChange={setFilterStatus}
      />

      <DataTable
        columns={columns}
        data={filteredPurchases}
        isLoading={isLoading}
        emptyMessage="Belum ada purchase order."
        onRowClick={(item) => navigate(`/purchases/${item.id}`)}
        mobileCardRender={mobileCardRender}
      />

      {/* Action Dialogs */}
      <ReceiveDialog
        open={dialogOpen.receive}
        onOpenChange={(v) => setDialogOpen(p => ({ ...p, receive: v }))}
        purchase={selectedPurchase}
      />
      <PaymentDialog
        open={dialogOpen.payment}
        onOpenChange={(v) => setDialogOpen(p => ({ ...p, payment: v }))}
        purchase={selectedPurchase}
      />
      <ReturnDialog
        open={dialogOpen.return}
        onOpenChange={(v) => setDialogOpen(p => ({ ...p, return: v }))}
        purchase={selectedPurchase}
      />

      <JournalPreviewDialog
        open={!!journalPreviewId}
        onOpenChange={(open) => !open && setJournalPreviewId(null)}
        referenceId={journalPreviewId}
        referenceType="purchase"
        title="Jurnal Pembelian"
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
