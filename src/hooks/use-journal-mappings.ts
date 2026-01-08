import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getJournalAccountMappings,
    upsertJournalAccountMapping,
    deleteJournalAccountMapping,
    toggleMappingActive,
    type JournalAccountMapping
} from '@/lib/api/journal-mappings';

export function useJournalAccountMappings() {
    return useQuery({
        queryKey: ['journal_account_mappings'],
        queryFn: getJournalAccountMappings,
    });
}

export function useUpsertJournalAccountMapping() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: upsertJournalAccountMapping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journal_account_mappings'] });
        },
    });
}

export function useDeleteJournalAccountMapping() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteJournalAccountMapping,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journal_account_mappings'] });
        },
    });
}

export function useToggleMappingActive() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            toggleMappingActive(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journal_account_mappings'] });
        },
    });
}
