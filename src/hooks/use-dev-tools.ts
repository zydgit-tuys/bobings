import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type for reset response
interface ResetDataResponse {
    success: boolean;
    deleted: {
        journal_lines: number;
        journal_entries: number;
        order_items: number;
        sales_orders: number;
        sales_imports: number;
        purchase_return_lines: number;
        purchase_returns: number;
        purchase_order_lines: number;
        purchases: number;
        stock_movements: number;
    };
    reset_variants: number;
    timestamp: string;
    error?: string;
}

// Get data counts for dev tools dashboard
export function useDataCounts() {
    return useQuery({
        queryKey: ['dev-data-counts'],
        queryFn: async () => {
            const [salesResult, purchasesResult, journalsResult] = await Promise.all([
                supabase.from('sales_orders').select('id', { count: 'exact', head: true }),
                supabase.from('purchases').select('id', { count: 'exact', head: true }),
                supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
            ]);

            return {
                salesOrders: salesResult.count || 0,
                purchases: purchasesResult.count || 0,
                journalEntries: journalsResult.count || 0,
            };
        },
        refetchInterval: 5000, // Refresh every 5 seconds
    });
}

// Reset all transactional data
export function useResetTransactionalData() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            // Use type assertion since the RPC function is not in generated types yet
            const { data, error } = await supabase.rpc('reset_transactional_data' as any);

            if (error) throw error;

            const response = data as ResetDataResponse;
            if (!response.success) throw new Error(response.error || 'Reset failed');

            return response;
        },
        onSuccess: (data) => {
            const deleted = data.deleted;
            const totalDeleted =
                deleted.sales_orders +
                deleted.purchases +
                deleted.journal_entries +
                deleted.order_items +
                deleted.purchase_order_lines +
                deleted.stock_movements;

            toast.success('Data berhasil direset', {
                description: `${totalDeleted} records dihapus, ${data.reset_variants} variants direset`,
            });

            // Invalidate all relevant queries
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['dev-data-counts'] });
        },
        onError: (error: Error) => {
            toast.error('Gagal mereset data', {
                description: error.message,
            });
        },
    });
}
