import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getVirtualStockProducts,
  updateProductsSortOrder,
  updateVariantVirtualQty,
  toggleProductVirtualStock,
  getLocalVirtualStock
} from '@/lib/api/virtual-stock';
import { getAttributeValues } from '@/lib/api/products';
import { toast } from 'sonner';

export function useVirtualStockProducts() {
  return useQuery({
    queryKey: ['virtual-stock-products'],
    queryFn: async () => {
      const [products, attributeValues] = await Promise.all([
        getVirtualStockProducts(),
        getAttributeValues()
      ]);

      // Get local qty
      const localQty = getLocalVirtualStock();

      // Map attribute values to variants
      const attrMap = new Map(attributeValues.map(av => [av.id, av.value]));

      return products.map(product => ({
        ...product,
        variants: product.variants.map((v: any) => ({
          ...v,
          virtual_stock_qty: localQty[v.id] || 0, // Merge from local storage
          size_name: v.size_value_id ? attrMap.get(v.size_value_id) : null,
          color_name: v.color_value_id ? attrMap.get(v.color_value_id) : null
        }))
      }));
    }
  });
}

export function useUpdateProductsSortOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductsSortOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-stock-products'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sort order: ${error.message}`);
    }
  });
}

export function useUpdateVariantVirtualQty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => updateVariantVirtualQty(id, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-stock-products'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update qty: ${error.message}`);
    }
  });
}

export function useToggleVirtualStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleProductVirtualStock(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-stock-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Virtual stock updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle virtual stock: ${error.message}`);
    }
  });
}
