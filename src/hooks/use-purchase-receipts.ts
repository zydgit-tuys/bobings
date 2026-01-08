import { useQuery } from '@tanstack/react-query';
import { getPurchaseReceipts } from '@/lib/api/purchase-receipts';

export function usePurchaseReceipts(purchaseId: string) {
    return useQuery({
        queryKey: ['purchase_receipts', purchaseId],
        queryFn: () => getPurchaseReceipts(purchaseId),
        enabled: !!purchaseId,
    });
}
