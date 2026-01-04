import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchases, getPurchase, createPurchase, updatePurchase, deletePurchase, confirmPurchase,
  addPurchaseLine, updatePurchaseLine, deletePurchaseLine, receivePurchaseLines
} from '@/lib/api/purchases';
import type { Purchase, PurchaseOrderLine } from '@/types';
import { toast } from 'sonner';

export function usePurchases() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: getPurchases,
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: () => getPurchase(id),
    enabled: !!id,
  });
}

// Note: Purchase number generation is now handled by database trigger
// See: supabase/migrations/20260102_refactor_po_logic.sql

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create purchase order: ${error.message}`);
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Purchase> }) =>
      updatePurchase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update purchase order: ${error.message}`);
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete purchase order: ${error.message}`);
    },
  });
}

export function useConfirmPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase order confirmed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to confirm purchase: ${error.message}`);
    },
  });
}


// Purchase Lines
export function useAddPurchaseLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPurchaseLine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Item added to purchase order');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });
}

export function useUpdatePurchaseLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PurchaseOrderLine> }) =>
      updatePurchaseLine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });
}

export function useDeletePurchaseLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePurchaseLine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Item removed from purchase order');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });
}

export function useReceivePurchaseLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, receivedQtys }: { purchaseId: string; receivedQtys: Record<string, number> }) =>
      receivePurchaseLines(purchaseId, receivedQtys),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', variables.purchaseId] }); // Explicit refresh for Detail Page
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Goods received successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to receive goods: ${error.message}`);
    },
  });
}
