import { useState } from "react";
import { format } from "date-fns";
import { FileUp } from "lucide-react";
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

export default function SalesList() {
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

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        description="View and import sales orders"
        action={
          <Button onClick={() => setShowImport(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Import Desty
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          type="date"
          placeholder="Start Date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="w-40"
        />
        <Input
          type="date"
          placeholder="End Date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="w-40"
        />
        <Select
          value={filters.marketplace || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, marketplace: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
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
        >
          Clear
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={orders ?? []}
        isLoading={isLoading}
        emptyMessage="No sales orders found."
      />

      <SalesImportDialog open={showImport} onOpenChange={setShowImport} />
    </div>
  );
}
