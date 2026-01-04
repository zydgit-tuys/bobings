import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { DashboardEmptyState } from "@/components/dashboard/EmptyState";
import { ActionCenter } from "@/components/dashboard/ActionCenter";

type Period = 'today' | 'week' | 'month' | 'year';

export default function Dashboard() {
  const navigate = useNavigate();
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

  const hasNoSalesData = !loadingSales && (!salesOrders || salesOrders.length === 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description="Analytics dan overview bisnis"
      />

      {/* Quick Actions Command Center */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Button
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2 shadow-sm border bg-card hover:bg-accent/50 transition-all hover:-translate-y-0.5 border-primary/10"
          variant="outline"
          onClick={() => navigate('/sales/manual')}
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <span className="font-semibold text-base">Kasir (POS)</span>
        </Button>

        <Button
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2 shadow-sm border bg-card hover:bg-accent/50 transition-all hover:-translate-y-0.5 border-blue-500/10"
          variant="outline"
          onClick={() => navigate('/purchases')}
        >
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Truck className="h-6 w-6" />
          </div>
          <span className="font-semibold text-base">Restock / PO</span>
        </Button>

        <Button
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2 shadow-sm border bg-card hover:bg-accent/50 transition-all hover:-translate-y-0.5 border-emerald-500/10"
          variant="outline"
          onClick={() => navigate('/products')}
        >
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Package className="h-6 w-6" />
          </div>
          <span className="font-semibold text-base">Produk Baru</span>
        </Button>

        <Button
          size="lg"
          className="h-24 flex flex-col items-center justify-center gap-2 shadow-sm border bg-card hover:bg-accent/50 transition-all hover:-translate-y-0.5 border-orange-500/10"
          variant="outline"
          onClick={() => navigate('/inventory')}
        >
          <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <span className="font-semibold text-base">Cek Stok</span>
        </Button>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full grid grid-cols-4 h-8 md:h-9 md:w-auto md:inline-flex">
          <TabsTrigger value="today" className="text-xs md:text-sm">Hari Ini</TabsTrigger>
          <TabsTrigger value="week" className="text-xs md:text-sm">7 Hari</TabsTrigger>
          <TabsTrigger value="month" className="text-xs md:text-sm">30 Hari</TabsTrigger>
          <TabsTrigger value="year" className="text-xs md:text-sm">1 Tahun</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Empty State - Show when no sales data */}
      {hasNoSalesData && <DashboardEmptyState />}

      {/* Action Center - Pending Tasks */}
      <ActionCenter
        draftPurchasesCount={purchases?.filter(p => p.status === 'draft').length || 0}
        pendingSalesCount={salesOrders?.filter(s => s.status === 'pending').length || 0}
        lowStockCount={alerts?.length || 0}
      />

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
