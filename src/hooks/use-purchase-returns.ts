import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPurchaseReturn, triggerAutoJournalReturn, getPurchaseReturns, CreateReturnParams } from '@/lib/api/purchase-returns';
import { toast } from 'sonner';

export function useCreatePurchaseReturn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: CreateReturnParams) => {
            // 1. Create Data
            const returnData = await createPurchaseReturn(params);

            // 2. Trigger Journal (Auto-Complete)
            await triggerAutoJournalReturn(returnData.id);

            return returnData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_returns'] });
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
            // Invalidate purchase to potentially update status if needed
            queryClient.invalidateQueries({ queryKey: ['purchases'] });

            toast.success('Retur barang berhasil dibuat & jurnal tercatat');
        },
        onError: (error: Error) => {
            toast.error(`Gagal membuat retur: ${error.message}`);
        },
    });
}

export function usePurchaseReturns(purchaseId: string) {
    return useQuery({
        queryKey: ['purchase_returns', purchaseId],
        queryFn: () => getPurchaseReturns(purchaseId),
        enabled: !!purchaseId,
    });
}
