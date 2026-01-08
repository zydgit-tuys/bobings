import { useQuery } from '@tanstack/react-query';
import { getPurchasePayments } from '@/lib/api/purchase-payments';

export function usePurchasePayments(purchaseId: string) {
    return useQuery({
        queryKey: ['purchase_payments', purchaseId],
        queryFn: () => getPurchasePayments(purchaseId),
        enabled: !!purchaseId,
    });
}
