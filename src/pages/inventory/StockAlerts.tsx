import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import { useInventoryAlerts } from "@/hooks/use-inventory";

export function StockAlerts() {
  const { data: alerts, isLoading } = useInventoryAlerts();

  // Map variant_id to id for DataTable compatibility
  const alertsWithId = (alerts ?? []).map((alert) => ({
    ...alert,
    id: alert.variant_id,
  }));

  const columns = [
    { key: "sku_variant", header: "SKU Variant" },
    { key: "product_name", header: "Product" },
    {
      key: "size_color",
      header: "Size / Color",
      render: (item: any) => `${item.size_name ?? "-"} / ${item.color_name ?? "-"}`,
    },
    { key: "current_stock", header: "Current Stock" },
    { key: "min_stock", header: "Min Stock" },
    {
      key: "shortage",
      header: "Shortage",
      render: (item: any) => {
        const shortage = item.min_stock - item.current_stock;
        return shortage > 0 ? (
          <span className="text-destructive font-medium">-{shortage}</span>
        ) : (
          "-"
        );
      },
    },
  ];

  if (!isLoading && (!alerts || alerts.length === 0)) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium">No Low Stock Alerts</p>
          <p className="text-muted-foreground">All products have sufficient stock levels.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={alertsWithId}
      isLoading={isLoading}
      emptyMessage="No low stock alerts"
    />
  );
}
