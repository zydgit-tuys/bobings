import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types';

export type ProductImage = Tables<'product_images'>;

export async function getProductImages(productId: string): Promise<ProductImage[]> {
    const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

    if (error) throw error;
    return data as ProductImage[];
}

export async function createProductImage(image: TablesInsert<'product_images'>): Promise<ProductImage> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('product_images')
        .insert({
            ...image,
            uploaded_by: user?.id,
        })
        .select()
        .single();

    if (error) throw error;
    return data as ProductImage;
}

export async function updateProductImage(
    id: string,
    updates: TablesUpdate<'product_images'>
): Promise<ProductImage> {
    const { data, error } = await supabase
        .from('product_images')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as ProductImage;
}

export async function deleteProductImage(id: string): Promise<void> {
    const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function reorderProductImages(productId: string, imageIds: string[]): Promise<void> {
    const updates = imageIds.map((id, index) => ({
        id,
        display_order: index,
        updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
        const { error } = await supabase
            .from('product_images')
            .update({ display_order: update.display_order, updated_at: update.updated_at })
            .eq('id', update.id);

        if (error) throw error;
    }
}

export async function setPrimaryImage(productId: string, imageId: string): Promise<ProductImage> {
    // First, unset all primary images for this product
    await supabase
        .from('product_images')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('product_id', productId);

    // Then set the new primary image
    const { data, error } = await supabase
        .from('product_images')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', imageId)
        .select()
        .single();

    if (error) throw error;
    return data as ProductImage;
}
