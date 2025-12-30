import { supabase } from '@/integrations/supabase/client';

export interface VirtualStockProduct {
  id: string;
  sku_master: string;
  name: string;
  virtual_stock: boolean;
  sort_order: number;
  images: string[];
  variants: VirtualStockVariant[];
}

export interface VirtualStockVariant {
  id: string;
  product_id: string;
  sku_variant: string;
  virtual_stock_qty: number;
  size_value_id: string | null;
  color_value_id: string | null;
  size_name?: string;
  color_name?: string;
}

export async function getVirtualStockProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      sku_master,
      name,
      virtual_stock,
      sort_order,
      images,
      product_variants(
        id,
        product_id,
        sku_variant,
        virtual_stock_qty,
        size_value_id,
        color_value_id,
        is_active
      )
    `)
    .eq('is_active', true)
    .eq('virtual_stock', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  // Filter active variants
  return (data || []).map(product => ({
    ...product,
    variants: (product.product_variants || []).filter((v: any) => v.is_active)
  }));
}

export async function updateProductSortOrder(id: string, sort_order: number) {
  const { error } = await supabase
    .from('products')
    .update({ sort_order, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function updateProductsSortOrder(updates: { id: string; sort_order: number }[]) {
  for (const update of updates) {
    await updateProductSortOrder(update.id, update.sort_order);
  }
}

export async function updateVariantVirtualQty(id: string, virtual_stock_qty: number) {
  const { error } = await supabase
    .from('product_variants')
    .update({ virtual_stock_qty, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function toggleProductVirtualStock(id: string, virtual_stock: boolean) {
  const { error } = await supabase
    .from('products')
    .update({ virtual_stock, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
