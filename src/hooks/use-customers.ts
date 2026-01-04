import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    type CustomerInsert,
    type CustomerUpdate,
} from '@/lib/api/customers';
import { toast } from 'sonner';

export function useCustomers(activeOnly = true) {
    return useQuery({
        queryKey: ['customers', activeOnly],
        queryFn: () => getCustomers(activeOnly),
    });
}

export function useCustomer(id: string) {
    return useQuery({
        queryKey: ['customer', id],
        queryFn: () => getCustomer(id),
        enabled: !!id,
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CustomerInsert) => createCustomer(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer berhasil ditambahkan');
        },
        onError: (error: Error) => {
            toast.error(`Gagal menambahkan customer: ${error.message}`);
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: CustomerUpdate }) =>
            updateCustomer(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer berhasil diupdate');
        },
        onError: (error: Error) => {
            toast.error(`Gagal mengupdate customer: ${error.message}`);
        },
    });
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteCustomer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer berhasil dihapus');
        },
        onError: (error: Error) => {
            toast.error(`Gagal menghapus customer: ${error.message}`);
        },
    });
}
