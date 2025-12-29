import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { useStockMovements } from "@/hooks/use-inventory";

const movementTypeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  IN: "default",
  OUT: "destructive",
  ADJUSTMENT: "secondary",
  RETURN: "outline",
  SALE: "destructive",
};

export function StockMovements() {
  const { data: movements, isLoading } = useStockMovements(undefined, 200);

  const columns = [
    {
      key: "created_at",
      header: "Date",
      render: (item: any) => format(new Date(item.created_at), "dd MMM yyyy HH:mm"),
    },
    {
      key: "variant",
      header: "Variant",
      render: (item: any) => item.product_variants?.sku_variant ?? "-",
    },
    {
      key: "movement_type",
      header: "Type",
      render: (item: any) => (
        <Badge variant={movementTypeColors[item.movement_type] ?? "secondary"}>
          {item.movement_type}
        </Badge>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      render: (item: any) => (
        <span
          className={
            ["IN", "RETURN"].includes(item.movement_type)
              ? "text-green-600"
              : "text-destructive"
          }
        >
          {["IN", "RETURN"].includes(item.movement_type) ? "+" : "-"}
          {item.qty}
        </span>
      ),
    },
    { key: "reference_type", header: "Reference Type" },
    { key: "notes", header: "Notes" },
  ];

  return (
    <DataTable
      columns={columns}
      data={movements ?? []}
      isLoading={isLoading}
      emptyMessage="No stock movements recorded"
    />
  );
}
