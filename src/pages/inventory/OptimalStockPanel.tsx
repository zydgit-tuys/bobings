import { useState } from "react";
import { Calculator, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import {
  useCalculateOptimalStockMutation,
  useApplyOptimalStock,
} from "@/hooks/use-inventory";

export function OptimalStockPanel() {
  const [analysisWindow, setAnalysisWindow] = useState(30);
  const [safetyFactor, setSafetyFactor] = useState(1.65);

  const calculate = useCalculateOptimalStockMutation();
  const apply = useApplyOptimalStock();

  const handleCalculate = () => {
    calculate.mutate({
      analysis_window_days: analysisWindow,
      safety_factor: safetyFactor,
    });
  };

  const handleApplyAll = () => {
    if (!calculate.data?.results) return;
    
    const updates = calculate.data.results
      .filter((r) => r.optimal_min_stock !== r.current_min_stock)
      .map((r) => ({
        variant_id: r.variant_id,
        new_min_stock: r.optimal_min_stock,
      }));

    apply.mutate({ updates });
  };

  const columns = [
    { key: "sku_variant", header: "SKU Variant" },
    { key: "current_stock", header: "Current Stock" },
    { key: "current_min_stock", header: "Current Min" },
    { key: "optimal_min_stock", header: "Optimal Min" },
    {
      key: "avg_daily_sales",
      header: "Avg Daily Sales",
      render: (item: any) => item.avg_daily_sales.toFixed(2),
    },
    {
      key: "lead_time_days",
      header: "Lead Time (days)",
      render: (item: any) => item.lead_time_days.toFixed(1),
    },
    {
      key: "change",
      header: "Change",
      render: (item: any) => {
        const diff = item.optimal_min_stock - item.current_min_stock;
        if (diff === 0) return "-";
        return (
          <span className={diff > 0 ? "text-green-600" : "text-destructive"}>
            {diff > 0 ? "+" : ""}{diff}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculate Optimal Stock Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Analysis Window (days)</Label>
              <Input
                type="number"
                value={analysisWindow}
                onChange={(e) => setAnalysisWindow(parseInt(e.target.value) || 30)}
                className="w-32"
              />
            </div>
            <div>
              <Label>Safety Factor (Z-score)</Label>
              <Input
                type="number"
                step="0.1"
                value={safetyFactor}
                onChange={(e) => setSafetyFactor(parseFloat(e.target.value) || 1.65)}
                className="w-32"
              />
            </div>
            <Button onClick={handleCalculate} disabled={calculate.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${calculate.isPending ? "animate-spin" : ""}`} />
              Calculate
            </Button>
            {calculate.data?.results && calculate.data.results.length > 0 && (
              <Button onClick={handleApplyAll} disabled={apply.isPending} variant="outline">
                <Check className="h-4 w-4 mr-2" />
                Apply All Changes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {calculate.data?.results && (
        <DataTable
          columns={columns}
          data={calculate.data.results}
          emptyMessage="No data to calculate"
        />
      )}
    </div>
  );
}
