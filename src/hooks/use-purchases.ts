import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPurchases, getPurchase, createPurchase, updatePurchase, deletePurchase,
  addPurchaseLine, updatePurchaseLine, deletePurchaseLine, receivePurchaseLines,
  generatePurchaseNo
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

export function useGeneratePurchaseNo() {
  return useQuery({
    queryKey: ['purchases', 'next-no'],
    queryFn: generatePurchaseNo,
  });
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Goods received successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to receive goods: ${error.message}`);
    },
  });
}
