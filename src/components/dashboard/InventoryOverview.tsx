import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryValuation, useInventoryAlerts } from "@/hooks/use-inventory";
import { Package, AlertTriangle, TrendingUp, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export function InventoryOverview() {
  const { data: valuation, isLoading: loadingValuation } = useInventoryValuation();
  const { data: alerts, isLoading: loadingAlerts } = useInventoryAlerts();

  const isLoading = loadingValuation || loadingAlerts;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-sm md:text-base">Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const summary = valuation?.summary;

  return (
    <Card>
      <CardHeader className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base">Inventory Overview</CardTitle>
          <Link to="/inventory" className="text-[10px] md:text-xs text-primary hover:underline">
            Lihat Detail →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-4 md:pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Warehouse className="h-3 w-3" />
              <span className="text-[10px]">Total Unit</span>
            </div>
            <p className="text-sm md:text-base font-bold">
              {summary?.totalItems.toLocaleString('id-ID')} pcs
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Package className="h-3 w-3" />
              <span className="text-[10px]">Nilai Modal</span>
            </div>
            <p className="text-sm md:text-base font-bold">
              Rp {(summary?.totalCostValue || 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px]">Nilai Retail</span>
            </div>
            <p className="text-sm md:text-base font-bold">
              Rp {(summary?.totalRetailValue || 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <div className="flex items-center gap-1 text-emerald-500 mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px]">Potensi Profit</span>
            </div>
            <p className="text-sm md:text-base font-bold text-emerald-500">
              Rp {(summary?.potentialProfit || 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {alerts && alerts.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium">Low Stock Alert</span>
              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                {alerts.length}
              </Badge>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {alerts.slice(0, 3).map((alert) => (
                <div 
                  key={alert.variant_id}
                  className="flex justify-between items-center text-xs p-1.5 bg-destructive/10 rounded"
                >
                  <span className="truncate flex-1">{alert.product_name}</span>
                  <span className="text-destructive font-medium shrink-0 ml-2">
                    {alert.current_stock}/{alert.min_stock}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
