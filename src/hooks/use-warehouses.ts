import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWarehouses, getWarehouse, createWarehouse, updateWarehouse, deleteWarehouse, getDefaultWarehouse } from '@/lib/api/warehouses';
import { toast } from 'sonner';

export function useWarehouses() {
    return useQuery({
        queryKey: ['warehouses'],
        queryFn: getWarehouses,
    });
}

export function useWarehouse(id: string) {
    return useQuery({
        queryKey: ['warehouses', id],
        queryFn: () => getWarehouse(id),
        enabled: !!id,
    });
}

export function useDefaultWarehouse() {
    return useQuery({
        queryKey: ['warehouses', 'default'],
        queryFn: getDefaultWarehouse,
    });
}

export function useCreateWarehouse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('Gudang berhasil ditambahkan');
        },
        onError: (error: Error) => {
            toast.error(`Gagal menambahkan gudang: ${error.message}`);
        },
    });
}

export function useUpdateWarehouse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) =>
            updateWarehouse(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('Gudang berhasil diupdate');
        },
        onError: (error: Error) => {
            toast.error(`Gagal update gudang: ${error.message}`);
        },
    });
}

export function useDeleteWarehouse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            toast.success('Gudang berhasil dihapus');
        },
        onError: (error: Error) => {
            toast.error(`Gagal menghapus gudang: ${error.message}`);
        },
    });
}
