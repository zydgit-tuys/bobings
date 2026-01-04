import { useQuery } from '@tanstack/react-query';
import { getCustomerTypePricing } from '@/lib/api/products';

export function useCustomerTypePricing(customerTypeId?: string) {
    return useQuery({
        queryKey: ['customer-type-pricing', customerTypeId],
        queryFn: () => getCustomerTypePricing(customerTypeId!),
        enabled: !!customerTypeId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
}
