import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceStats } from "@/hooks/use-dashboard";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { ChartEmptyState } from "./EmptyState";

const COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

interface MarketplaceChartProps {
  days?: number;
}

export function MarketplaceChart({ days = 30 }: MarketplaceChartProps) {
  const { data, isLoading } = useMarketplaceStats(days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-4">
          <CardTitle className="text-sm md:text-base">Marketplace</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
          <Skeleton className="h-48 md:h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.map(d => ({
    name: d.marketplace,
    value: d.revenue,
    orders: d.orders,
    profit: d.profit,
  })) || [];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const hasData = chartData.length > 0;

  return (
    <Card>
      <CardHeader className="p-3 md:p-4">
        <CardTitle className="text-sm md:text-base">Revenue per Marketplace</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
        {!hasData ? (
          <ChartEmptyState 
            title="Belum ada data marketplace" 
            description="Data muncul setelah import penjualan"
          />
        ) : (
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="70%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      className="stroke-background"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Revenue']}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  iconSize={8}
                  formatter={(value) => {
                    const item = chartData.find(d => d.name === value);
                    const percent = total > 0 ? ((item?.value || 0) / total * 100).toFixed(0) : 0;
                    return `${value} (${percent}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
