import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getStockMovements, createStockMovement, adjustStock,
  getInventoryAlerts, getInventoryValuation
} from '@/lib/api/inventory';
import type { MovementType } from '@/types';
import { toast } from 'sonner';

export function useStockMovements(variantId?: string, limit = 100) {
  return useQuery({
    queryKey: ['stock-movements', variantId, limit],
    queryFn: () => getStockMovements(variantId, limit),
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      toast.success('Stock movement recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record movement: ${error.message}`);
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, qty, notes }: { variantId: string; qty: number; notes?: string }) =>
      adjustStock(variantId, qty, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      toast.success('Stock adjusted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to adjust stock: ${error.message}`);
    },
  });
}

export function useInventoryAlerts() {
  return useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: getInventoryAlerts,
  });
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: getInventoryValuation,
  });
}
