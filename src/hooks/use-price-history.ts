import { useQuery } from '@tanstack/react-query';
import { getPriceHistory, type PriceHistoryFilters } from '@/lib/api/price-history';

export const usePriceHistory = (variantId: string, filters?: PriceHistoryFilters) => {
    return useQuery({
        queryKey: ['price-history', variantId, filters],
        queryFn: () => getPriceHistory(variantId, filters),
        enabled: !!variantId,
    });
};
