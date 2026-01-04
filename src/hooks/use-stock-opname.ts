import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getStockOpnames,
    getStockOpname,
    createStockOpname,
    confirmStockOpname,
    type OpnameFilters,
    type CreateOpnameData,
} from '@/lib/api/stock-opname';

export const useStockOpnames = (filters?: OpnameFilters) => {
    return useQuery({
        queryKey: ['stock-opnames', filters],
        queryFn: () => getStockOpnames(filters),
    });
};

export const useStockOpname = (id: string) => {
    return useQuery({
        queryKey: ['stock-opname', id],
        queryFn: () => getStockOpname(id),
        enabled: !!id,
    });
};

export const useCreateStockOpname = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createStockOpname,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
            toast.success('Stock opname berhasil dibuat');
        },
        onError: (error: Error) => {
            toast.error(`Gagal membuat stock opname: ${error.message}`);
        },
    });
};

export const useConfirmStockOpname = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: confirmStockOpname,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-opnames'] });
            queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
            toast.success('Stock opname berhasil dikonfirmasi dan dijurnal');
        },
        onError: (error: Error) => {
            toast.error(`Gagal konfirmasi stock opname: ${error.message}`);
        },
    });
};
