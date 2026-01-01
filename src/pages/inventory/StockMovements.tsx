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
      primary: true,
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
    { key: "reference_type", header: "Reference Type", hideOnMobile: true },
    { key: "notes", header: "Notes", hideOnMobile: true },
  ];

  const mobileCardRender = (item: any) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{item.product_variants?.sku_variant ?? "-"}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(item.created_at), "dd MMM yyyy HH:mm")}
          </p>
        </div>
        <Badge variant={movementTypeColors[item.movement_type] ?? "secondary"}>
          {item.movement_type}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span
          className={`font-medium ${["IN", "RETURN"].includes(item.movement_type)
              ? "text-green-600"
              : "text-destructive"
            }`}
        >
          {["IN", "RETURN"].includes(item.movement_type) ? "+" : "-"}
          {item.qty}
        </span>
        {item.reference_type && (
          <span className="text-sm text-muted-foreground">{item.reference_type}</span>
        )}
      </div>
      {item.notes && (
        <p className="text-sm text-muted-foreground">{item.notes}</p>
      )}
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={movements ?? []}
      isLoading={isLoading}
      emptyMessage="No stock movements recorded"
      mobileCardRender={mobileCardRender}
    />
  );
}

export default StockMovements;
