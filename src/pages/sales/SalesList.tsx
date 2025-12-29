import { useState } from "react";
import { format } from "date-fns";
import { FileUp, Eye, Copy, Trash2 } from "lucide-react";
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
import { MobileCardList } from "@/components/shared/MobileCardList";
import { useSalesOrders } from "@/hooks/use-sales";
import { SalesImportDialog } from "./SalesImportDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

export default function SalesList() {
  const isMobile = useIsMobile();
  const [showImport, setShowImport] = useState(false);
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
    { key: "desty_order_no", header: "Order No" },
    {
      key: "order_date",
      header: "Date",
      render: (item: any) => format(new Date(item.order_date), "dd MMM yyyy"),
    },
    { key: "marketplace", header: "Marketplace" },
    { key: "customer_name", header: "Customer" },
    {
      key: "status",
      header: "Status",
      render: (item: any) => <StatusBadge status={item.status} />,
    },
    {
      key: "total_amount",
      header: "Amount",
      render: (item: any) => `Rp ${item.total_amount.toLocaleString()}`,
    },
    {
      key: "profit",
      header: "Profit",
      render: (item: any) => (
        <span className={item.profit >= 0 ? "text-green-600" : "text-destructive"}>
          Rp {item.profit.toLocaleString()}
        </span>
      ),
    },
  ];

  const renderOrderCard = (order: any) => (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{order.desty_order_no}</span>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{order.marketplace}</span>
        <span>{format(new Date(order.order_date), "dd MMM yyyy")}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground truncate max-w-[150px]">
          {order.customer_name || "-"}
        </span>
        <div className="text-right">
          <div className="text-sm font-medium">Rp {order.total_amount.toLocaleString()}</div>
          <div className={`text-xs ${order.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
            Profit: Rp {order.profit.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );

  const handleCopyOrder = (order: any) => {
    navigator.clipboard.writeText(order.desty_order_no);
    toast.success("Order number copied");
  };

  const handleViewOrder = (order: any) => {
    toast.info(`Viewing order ${order.desty_order_no}`);
  };

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        description="View and import sales orders"
        action={
          <Button onClick={() => setShowImport(true)} size="sm" className="md:size-default">
            <FileUp className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Import Desty</span>
            <span className="sm:hidden">Import</span>
          </Button>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 mb-4 md:flex md:flex-wrap md:gap-4 md:mb-6">
        <Input
          type="date"
          placeholder="Start Date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="w-full md:w-40"
        />
        <Input
          type="date"
          placeholder="End Date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="w-full md:w-40"
        />
        <Select
          value={filters.marketplace || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, marketplace: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
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
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setFilters({ startDate: "", endDate: "", marketplace: "", status: "" })}
          className="col-span-2 md:col-span-1"
        >
          Clear
        </Button>
      </div>

      {isMobile ? (
        <MobileCardList
          data={orders ?? []}
          isLoading={isLoading}
          emptyMessage="No sales orders found."
          renderCard={renderOrderCard}
          onCardClick={handleViewOrder}
          leftActions={[
            {
              icon: <Copy className="h-5 w-5" />,
              label: "Copy",
              onClick: handleCopyOrder,
            },
          ]}
          rightActions={[
            {
              icon: <Eye className="h-5 w-5" />,
              label: "View",
              onClick: handleViewOrder,
            },
          ]}
        />
      ) : (
        <DataTable
          columns={columns}
          data={orders ?? []}
          isLoading={isLoading}
          emptyMessage="No sales orders found."
        />
      )}

      <SalesImportDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
