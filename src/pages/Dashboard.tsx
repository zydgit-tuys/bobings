import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useProducts } from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
import { usePurchases } from "@/hooks/use-purchases";
import { useSalesOrders, useSalesStats } from "@/hooks/use-sales";
import { useInventoryAlerts } from "@/hooks/use-inventory";
import { 
  Package, 
  Truck, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Percent,
  BarChart3,
  AlertTriangle 
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { MarketplaceChart } from "@/components/dashboard/MarketplaceChart";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { ProfitBreakdown } from "@/components/dashboard/ProfitBreakdown";
import { InventoryOverview } from "@/components/dashboard/InventoryOverview";

type Period = 'today' | 'week' | 'month' | 'year';

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('month');
  
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: purchases, isLoading: loadingPurchases } = usePurchases();
  const { data: salesOrders, isLoading: loadingSales } = useSalesOrders();
  const { data: alerts, isLoading: loadingAlerts } = useInventoryAlerts();
  const { data: salesStats, isLoading: loadingStats } = useSalesStats(period);

  const periodDays = {
    today: 1,
    week: 7,
    month: 30,
    year: 365,
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
    return `Rp ${value}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Dashboard" 
        description="Analytics dan overview bisnis"
      />

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full grid grid-cols-4 h-8 md:h-9 md:w-auto md:inline-flex">
          <TabsTrigger value="today" className="text-xs md:text-sm">Hari Ini</TabsTrigger>
          <TabsTrigger value="week" className="text-xs md:text-sm">7 Hari</TabsTrigger>
          <TabsTrigger value="month" className="text-xs md:text-sm">30 Hari</TabsTrigger>
          <TabsTrigger value="year" className="text-xs md:text-sm">1 Tahun</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(salesStats?.totalRevenue || 0)}
          subtitle={`${salesStats?.orderCount || 0} order`}
          icon={DollarSign}
          isLoading={loadingStats}
        />
        <StatCard
          title="Profit Bersih"
          value={formatCurrency(salesStats?.totalProfit || 0)}
          subtitle={salesStats?.totalRevenue 
            ? `Margin ${((salesStats.totalProfit / salesStats.totalRevenue) * 100).toFixed(1)}%` 
            : undefined}
          icon={TrendingUp}
          isLoading={loadingStats}
          variant={salesStats?.totalProfit && salesStats.totalProfit > 0 ? 'success' : 'default'}
        />
        <StatCard
          title="HPP (Modal)"
          value={formatCurrency(salesStats?.totalHpp || 0)}
          subtitle={salesStats?.totalRevenue 
            ? `${((salesStats.totalHpp / salesStats.totalRevenue) * 100).toFixed(1)}% dari revenue` 
            : undefined}
          icon={Package}
          isLoading={loadingStats}
        />
        <StatCard
          title="Fees Marketplace"
          value={formatCurrency(salesStats?.totalFees || 0)}
          subtitle={salesStats?.totalRevenue 
            ? `${((salesStats.totalFees / salesStats.totalRevenue) * 100).toFixed(1)}% dari revenue` 
            : undefined}
          icon={Percent}
          isLoading={loadingStats}
          variant="warning"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        <StatCard
          title="Produk"
          value={products?.length ?? 0}
          icon={Package}
          isLoading={loadingProducts}
        />
        <StatCard
          title="Supplier"
          value={suppliers?.length ?? 0}
          icon={Truck}
          isLoading={loadingSuppliers}
        />
        <StatCard
          title="PO Aktif"
          value={purchases?.filter(p => p.status !== 'received' && p.status !== 'cancelled').length ?? 0}
          icon={ShoppingCart}
          isLoading={loadingPurchases}
        />
        <StatCard
          title="Low Stock"
          value={alerts?.length ?? 0}
          icon={AlertTriangle}
          isLoading={loadingAlerts}
          variant={alerts && alerts.length > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2">
          <SalesTrendChart days={periodDays[period]} />
        </div>
        <div>
          <MarketplaceChart days={periodDays[period]} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <TopProductsTable limit={5} days={periodDays[period]} />
        <ProfitBreakdown days={periodDays[period]} />
        <InventoryOverview />
      </div>

      {/* Marketplace Breakdown */}
      {salesStats?.byMarketplace && Object.keys(salesStats.byMarketplace).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
          {Object.entries(salesStats.byMarketplace)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([mp, stats]) => (
              <StatCard
                key={mp}
                title={mp}
                value={formatCurrency(stats.revenue)}
                subtitle={`${stats.orders} order`}
                icon={BarChart3}
              />
            ))}
        </div>
      )}
    </div>
  );
}
