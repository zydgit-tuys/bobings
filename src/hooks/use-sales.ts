import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSalesOrders, getSalesOrder,
  getSalesImports, getSalesImport,
  parseDestyFile, processSalesImport,
  getSalesStats,
  createSalesOrder,
  createSalesOrderWithJournal, // Add this
  updateSalesOrderWithJournal,
  generateSalesInvoiceNo,
  type CreateSalesOrderInput
} from '@/lib/api/sales';
import type { DestyRow } from '@/types';
import { toast } from 'sonner';

// Sales Orders
export function useSalesOrders(filters?: {
  startDate?: string;
  endDate?: string;
  marketplace?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: () => getSalesOrders(filters),
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: () => getSalesOrder(id),
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesOrderInput) => createSalesOrderWithJournal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Sales order berhasil dibuat');
    },
    onError: (error: Error) => {
      toast.error(`Gagal membuat sales order: ${error.message}`);
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateSalesOrderInput }) =>
      updateSalesOrderWithJournal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Sales order berhasil diperbarui');
    },
    onError: (error: Error) => {
      toast.error(`Gagal update sales order: ${error.message}`);
    },
  });
}

// Sales Imports
export function useSalesImports() {
  return useQuery({
    queryKey: ['sales-imports'],
    queryFn: getSalesImports,
  });
}

export function useSalesImport(id: string) {
  return useQuery({
    queryKey: ['sales-imports', id],
    queryFn: () => getSalesImport(id),
    enabled: !!id,
  });
}

// Desty Import
export function useParseDestyFile() {
  return useMutation({
    mutationFn: parseDestyFile,
    onError: (error: Error) => {
      toast.error(`Failed to parse file: ${error.message}`);
    },
  });
}

export function useProcessSalesImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rows, filename }: { rows: DestyRow[]; filename: string }) =>
      processSalesImport(rows, filename),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-imports'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });

      if (result.summary) {
        toast.success(
          `Import completed: ${result.summary.successCount} success, ${result.summary.skippedCount} skipped`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to process import: ${error.message}`);
    },
  });
}

// Sales Stats
export function useSalesStats(period: 'today' | 'week' | 'month' | 'year') {
  return useQuery({
    queryKey: ['sales-stats', period],
    queryFn: () => getSalesStats(period),
  });
}

// Generate Sales Invoice Number
export function useGenerateSalesInvoiceNo() {
  return useQuery({
    queryKey: ['generate-sales-invoice-no'],
    queryFn: generateSalesInvoiceNo,
  });
}
