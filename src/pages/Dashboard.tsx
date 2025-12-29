import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { useProducts } from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
import { usePurchases } from "@/hooks/use-purchases";
import { useSalesOrders } from "@/hooks/use-sales";
import { useInventoryAlerts } from "@/hooks/use-inventory";
import { Package, Truck, ShoppingCart, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: purchases, isLoading: loadingPurchases } = usePurchases();
  const { data: salesOrders, isLoading: loadingSales } = useSalesOrders();
  const { data: alerts, isLoading: loadingAlerts } = useInventoryAlerts();

  const stats = [
    {
      title: "Total Products",
      value: products?.length ?? 0,
      icon: Package,
      isLoading: loadingProducts,
    },
    {
      title: "Suppliers",
      value: suppliers?.length ?? 0,
      icon: Truck,
      isLoading: loadingSuppliers,
    },
    {
      title: "Purchase Orders",
      value: purchases?.length ?? 0,
      icon: ShoppingCart,
      isLoading: loadingPurchases,
    },
    {
      title: "Sales Orders",
      value: salesOrders?.length ?? 0,
      icon: FileSpreadsheet,
      isLoading: loadingSales,
    },
    {
      title: "Low Stock Alerts",
      value: alerts?.length ?? 0,
      icon: AlertTriangle,
      isLoading: loadingAlerts,
    },
  ];

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your marketplace resource planning"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.variant_id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{alert.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.sku_variant} • {alert.size_name} / {alert.color_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-destructive">
                      Stock: {alert.current_stock}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Min: {alert.min_stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
