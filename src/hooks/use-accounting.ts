import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChartOfAccounts, getAccount, createAccount, generateAccountCode,
  getJournalEntries, getJournalEntry, createJournalEntry,
  getTrialBalance, getIncomeStatement, getBalanceSheet,
  getAccountingPeriods, createAccountingPeriod, closeAccountingPeriod, reopenAccountingPeriod
} from '@/lib/api/accounting';
import type { ChartOfAccount } from '@/types';
import { toast } from 'sonner';

// Chart of Accounts
export function useChartOfAccounts() {
  return useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: getChartOfAccounts,
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['chart-of-accounts', id],
    queryFn: () => getAccount(id),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

export function useGenerateAccountCode(accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense') {
  return useQuery({
    queryKey: ['generate-account-code', accountType],
    queryFn: () => generateAccountCode(accountType),
    enabled: !!accountType,
  });
}

// Journal Entries
export function useJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  referenceType?: string;
  referenceId?: string;
}) {
  return useQuery({
    queryKey: ['journal-entries', filters],
    queryFn: () => getJournalEntries(filters),
  });
}

export function useJournalByReference(referenceId: string) {
  return useQuery({
    queryKey: ['journal-entries', { referenceId }],
    queryFn: async () => {
      const entries = await getJournalEntries({ referenceId });
      return entries?.[0] || null;
    },
    enabled: !!referenceId,
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ['journal-entries', id],
    queryFn: () => getJournalEntry(id),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      toast.success('Journal entry created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });
}

// Reports
export function useTrialBalance(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['trial-balance', startDate, endDate],
    queryFn: () => getTrialBalance(startDate, endDate),
  });
}

export function useIncomeStatement(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: () => getIncomeStatement(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useBalanceSheet(asOfDate: string) {
  return useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: () => getBalanceSheet(asOfDate),
    enabled: !!asOfDate,
  });
}

// Accounting Periods
export function useAccountingPeriods(year?: number) {
  return useQuery({
    queryKey: ['accounting-periods', year],
    queryFn: () => getAccountingPeriods(year),
  });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccountingPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success('Periode berhasil dibuat');
    },
    onError: (error: Error) => {
      toast.error(`Gagal membuat periode: ${error.message}`);
    },
  });
}

export function useClosePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeAccountingPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success('Periode berhasil ditutup');
    },
    onError: (error: Error) => {
      toast.error(`Gagal menutup periode: ${error.message}`);
    },
  });
}

export function useReopenPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ periodId, password }: { periodId: string; password: string }) =>
      reopenAccountingPeriod(periodId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      toast.success('Periode berhasil dibuka kembali');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
