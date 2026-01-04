import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStockMovements, createStockMovement, adjustStock,
  getInventoryAlerts, getInventoryValuation,
  calculateOptimalStock, applyOptimalStock,
  triggerAutoJournalStock,
  type OptimalStockParams, type ApplyStockParams
} from '@/lib/api/inventory';
import type { MovementType } from '@/types';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });

      try {
        // Fetch variant to get HPP for journaling
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('products(base_hpp)')
          .eq('id', variables.variantId)
          .single();

        if (variantError || !variant) {
          throw new Error('Failed to fetch variant HPP');
        }

        const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
        const hpp = product?.base_hpp || 0;

        if (hpp === 0) {
          throw new Error('HPP is 0, cannot create journal entry');
        }

        await triggerAutoJournalStock(
          variables.variantId,
          variables.qty,
          hpp,
          variables.notes || 'Stock adjustment'
        );
        toast.success('Stock updated & Journal entry created');
      } catch (error: any) {
        console.error('Auto-journal error:', error);
        if (error.message?.includes("closed accounting period")) {
          toast.error("Stock updated, but Journal failed: Closed Period");
        } else {
          toast.warning(`Stock updated, but Journal failed: ${error.message}`);
        }
      }
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

// ============================================
// OPTIMAL STOCK HOOKS
// ============================================

export function useCalculateOptimalStock(params?: OptimalStockParams) {
  return useQuery({
    queryKey: ['optimal-stock', params],
    queryFn: () => calculateOptimalStock(params),
    enabled: false, // Manual trigger only
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCalculateOptimalStockMutation() {
  return useMutation({
    mutationFn: calculateOptimalStock,
    onError: (error: Error) => {
      toast.error(`Failed to calculate optimal stock: ${error.message}`);
    },
  });
}

export function useApplyOptimalStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ApplyStockParams) => applyOptimalStock(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['optimal-stock'] });
      toast.success(`Updated min stock for ${data.applied} variants`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply optimal stock: ${error.message}`);
    },
  });
}
