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
      product_images(image_url, is_primary, display_order),
      product_variants(
        id,
        product_id,
        sku_variant,
        size_value_id,
        color_value_id,
        is_active
      )
    `)
    .eq('is_active', true)
    .eq('virtual_stock', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  // Filter active variants and map images
  return (data || []).map(product => {
    // Map product_images to string array, prioritizing is_primary and display_order
    const pImages = product.product_images || [];
    const sortedImages = pImages.sort((a: any, b: any) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });
    const mappedImages = sortedImages.map((img: any) => img.image_url);

    // Fallback to legacy images column if no product_images found
    const finalImages = mappedImages.length > 0 ? mappedImages : (product.images || []);

    return {
      ...product,
      images: finalImages,
      variants: (product.product_variants || []).filter((v: any) => v.is_active)
    };
  });
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

// Local storage helper
export function getLocalVirtualStock(): Record<string, number> {
  try {
    const data = localStorage.getItem('virtual_stock_qty');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function updateVariantVirtualQty(id: string, qty: number) {
  // Update local storage
  const current = getLocalVirtualStock();
  current[id] = qty;
  localStorage.setItem('virtual_stock_qty', JSON.stringify(current));
  return Promise.resolve();
}

export async function toggleProductVirtualStock(id: string, virtual_stock: boolean) {
  const { error } = await supabase
    .from('products')
    .update({ virtual_stock, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}
