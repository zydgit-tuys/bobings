import { useState } from "react";
import { format } from "date-fns";
import { FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useSalesOrders } from "@/hooks/use-sales";
import { SalesImportDialog } from "./SalesImportDialog";
import { SalesOrderDialog } from "./SalesOrderDialog";
import { toast } from "sonner";

export default function SalesList() {
  const [showImport, setShowImport] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    marketplace: "",
    status: "",
  });

  const { data: orders, isLoading } = useSalesOrders(
    Object.fromEntries(
      Object.entries(filters)
        .filter(([_, v]) => v && v !== "all")
    )
  );

  const columns = [
    { key: "desty_order_no", header: "Order No", primary: true },
    {
      key: "order_date",
      header: "Tanggal",
      render: (item: any) => format(new Date(item.order_date), "dd MMM yyyy"),
    },
    { key: "marketplace", header: "Marketplace" },
    { key: "customer_name", header: "Customer", hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />,
    },
    {
      key: "total_amount",
      header: "Amount",
      render: (item: any) => `Rp ${item.total_amount.toLocaleString('id-ID')}`,
    },
    {
      key: "profit",
      header: "Profit",
      render: (item: any) => (
        <span className={item.profit >= 0 ? "text-emerald-600" : "text-destructive"}>
          Rp {item.profit.toLocaleString('id-ID')}
        </span>
      ),
    },
  ];

  const mobileCardRender = (order: any) => (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{order.desty_order_no}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{order.marketplace}</span>
        <span>{format(new Date(order.order_date), "dd MMM yyyy")}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
          {order.customer_name || "-"}
        </span>
        <div className="text-right">
          <div className="text-sm font-medium">Rp {order.total_amount.toLocaleString('id-ID')}</div>
          <div className={`text-[10px] ${order.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            Profit: Rp {order.profit.toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );

  const handleViewOrder = (order: any) => {
    toast.info(`Viewing order ${order.desty_order_no}`);
  };

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        description="View and import sales orders"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Tambah</span>
            </Button>
            <Button onClick={() => setShowImport(true)} size="sm" variant="outline">
              <FileUp className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Import Desty</span>
              <span className="sm:hidden">Import</span>
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 mb-3 md:flex md:flex-wrap md:gap-3 md:mb-4">
        <Input
          type="date"
          placeholder="Start Date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="w-full md:w-36 h-9 text-sm"
        />
        <Input
          type="date"
          placeholder="End Date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="w-full md:w-36 h-9 text-sm"
        />
        <Select
          value={filters.marketplace || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, marketplace: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-full md:w-32 h-9 text-sm">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="Shopee">Shopee</SelectItem>
            <SelectItem value="Tokopedia">Tokopedia</SelectItem>
            <SelectItem value="Lazada">Lazada</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-full md:w-32 h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters({ startDate: "", endDate: "", marketplace: "", status: "" })}
          className="col-span-2 md:col-span-1 h-9"
        >
          Clear
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={orders ?? []}
        isLoading={isLoading}
        emptyMessage="Belum ada sales order."
        onRowClick={handleViewOrder}
        mobileCardRender={mobileCardRender}
        showFilters={false}
      />

      <SalesImportDialog open={showImport} onOpenChange={setShowImport} />
      <SalesOrderDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
}
