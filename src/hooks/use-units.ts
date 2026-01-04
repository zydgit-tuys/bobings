import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUnits, getAllUnits, getUnit, createUnit, updateUnit, deleteUnit } from '@/lib/api/units';
import { toast } from 'sonner';

export function useUnits() {
    return useQuery({
        queryKey: ['units'],
        queryFn: getUnits,
    });
}

export function useAllUnits() {
    return useQuery({
        queryKey: ['units', 'all'],
        queryFn: getAllUnits,
    });
}

export function useUnit(id?: string) {
    return useQuery({
        queryKey: ['units', id],
        queryFn: () => getUnit(id!),
        enabled: !!id,
    });
}

export function useCreateUnit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            toast.success('Unit created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create unit: ${error.message}`);
        },
    });
}

export function useUpdateUnit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => updateUnit(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            toast.success('Unit updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update unit: ${error.message}`);
        },
    });
}

export function useDeleteUnit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['units'] });
            toast.success('Unit deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete unit: ${error.message}`);
        },
    });
}
