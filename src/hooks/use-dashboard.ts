import { useQuery } from '@tanstack/react-query';
import {
  getSalesTrend,
  getTopProducts,
  getMarketplaceStats,
  getStockMovementTrend,
  getPurchaseStats,
  getProfitAnalysis,
} from '@/lib/api/dashboard';

export function useSalesTrend(days: number = 30) {
  return useQuery({
    queryKey: ['sales-trend', days],
    queryFn: () => getSalesTrend(days),
  });
}

export function useTopProducts(limit: number = 10, days: number = 30) {
  return useQuery({
    queryKey: ['top-products', limit, days],
    queryFn: () => getTopProducts(limit, days),
  });
}

export function useMarketplaceStats(days: number = 30) {
  return useQuery({
    queryKey: ['marketplace-stats', days],
    queryFn: () => getMarketplaceStats(days),
  });
}

export function useStockMovementTrend(days: number = 30) {
  return useQuery({
    queryKey: ['stock-movement-trend', days],
    queryFn: () => getStockMovementTrend(days),
  });
}

export function usePurchaseStats(days: number = 90) {
  return useQuery({
    queryKey: ['purchase-stats', days],
    queryFn: () => getPurchaseStats(days),
  });
}

export function useProfitAnalysis(days: number = 30) {
  return useQuery({
    queryKey: ['profit-analysis', days],
    queryFn: () => getProfitAnalysis(days),
  });
}
