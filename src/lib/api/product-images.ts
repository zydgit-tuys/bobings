import { supabase } from '@/integrations/supabase/client';

export interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    storage_path: string;
    display_order: number;
    is_primary: boolean;
    alt_text?: string;
    file_size?: number;
    width?: number;
    height?: number;
    uploaded_by?: string;
    created_at: string;
    updated_at: string;
}

export async function getProductImages(productId: string) {
    const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

    if (error) throw error;
    return data as ProductImage[];
}

export async function createProductImage(image: {
    product_id: string;
    image_url: string;
    storage_path: string;
    display_order: number;
    is_primary?: boolean;
    alt_text?: string;
    file_size?: number;
    width?: number;
    height?: number;
}) {
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
    updates: Partial<Pick<ProductImage, 'display_order' | 'is_primary' | 'alt_text'>>
) {
    const { data, error } = await supabase
        .from('product_images')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as ProductImage;
}

export async function deleteProductImage(id: string) {
    const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function reorderProductImages(productId: string, imageIds: string[]) {
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

export async function setPrimaryImage(productId: string, imageId: string) {
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
