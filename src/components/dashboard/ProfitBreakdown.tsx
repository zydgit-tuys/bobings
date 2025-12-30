import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfitAnalysis } from "@/hooks/use-dashboard";
import { Progress } from "@/components/ui/progress";

interface ProfitBreakdownProps {
  days?: number;
}

export function ProfitBreakdown({ days = 30 }: ProfitBreakdownProps) {
  const { data, isLoading } = useProfitAnalysis(days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-sm md:text-base">Breakdown Profit</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const items = [
    { 
      label: 'HPP (Modal)', 
      value: data.hpp, 
      percent: data.hppPercent,
      color: 'bg-amber-500'
    },
    { 
      label: 'Fees Marketplace', 
      value: data.fees, 
      percent: data.feesPercent,
      color: 'bg-destructive'
    },
    { 
      label: 'Profit Bersih', 
      value: data.profit, 
      percent: data.marginPercent,
      color: 'bg-emerald-500'
    },
  ];

  return (
    <Card>
      <CardHeader className="p-3 md:p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base">Breakdown Revenue</CardTitle>
          <span className="text-xs text-muted-foreground">{days} hari</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-4 md:pt-0 space-y-3">
        <div className="text-center pb-2 border-b">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-lg md:text-xl font-bold">
            Rp {data.revenue.toLocaleString('id-ID')}
          </p>
        </div>
        
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">
                {item.percent.toFixed(1)}% • Rp {item.value.toLocaleString('id-ID')}
              </span>
            </div>
            <Progress 
              value={item.percent} 
              className="h-2"
              indicatorClassName={item.color}
            />
          </div>
        ))}

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium">Margin Profit</span>
            <span className={`text-sm font-bold ${data.marginPercent >= 20 ? 'text-emerald-500' : data.marginPercent >= 10 ? 'text-amber-500' : 'text-destructive'}`}>
              {data.marginPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
