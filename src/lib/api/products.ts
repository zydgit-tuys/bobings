import { supabase } from '@/integrations/supabase/client';
import type { Product, ProductVariant, ProductWithVariants, Brand, Category } from '@/types';

// ============================================
// PRODUCTS API
// ============================================

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands(id, name),
      categories(id, name),
      product_variants(*)
    `)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
}

export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands(id, name),
      categories(id, name),
      product_variants(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, product: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...product, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// PRODUCT VARIANTS API
// ============================================

export async function getVariants(productId?: string) {
  let query = supabase
    .from('product_variants')
    .select(`
      *,
      products(id, name, sku_master)
    `)
    .eq('is_active', true);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query.order('sku_variant');
  if (error) throw error;
  return data;
}

export async function createVariant(variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('product_variants')
    .insert(variant)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVariant(id: string, variant: Partial<ProductVariant>) {
  const { data, error } = await supabase
    .from('product_variants')
    .update({ ...variant, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// BRANDS API
// ============================================

export async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
}

export async function createBrand(name: string) {
  const { data, error } = await supabase
    .from('brands')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// CATEGORIES API
// ============================================

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data;
}

export async function createCategory(category: { name: string; parent_id?: string; level?: number }) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// VARIANT ATTRIBUTES API
// ============================================

export async function getVariantAttributes() {
  const { data, error } = await supabase
    .from('variant_attributes')
    .select(`
      *,
      attribute_values(*)
    `)
    .order('name');

  if (error) throw error;
  return data;
}

export async function createVariantAttribute(name: string) {
  const { data, error } = await supabase
    .from('variant_attributes')
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVariantAttribute(id: string, name: string) {
  const { data, error } = await supabase
    .from('variant_attributes')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVariantAttribute(id: string) {
  const { error } = await supabase
    .from('variant_attributes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// ATTRIBUTE VALUES API
// ============================================

export async function getAttributeValues(attributeId?: string) {
  let query = supabase
    .from('attribute_values')
    .select(`
      *,
      variant_attributes(id, name)
    `)
    .order('sort_order');

  if (attributeId) {
    query = query.eq('attribute_id', attributeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createAttributeValue(value: { attribute_id: string; value: string; sort_order?: number }) {
  const { data, error } = await supabase
    .from('attribute_values')
    .insert(value)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAttributeValue(id: string, value: { value?: string; sort_order?: number }) {
  const { data, error } = await supabase
    .from('attribute_values')
    .update(value)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAttributeValue(id: string) {
  const { error } = await supabase
    .from('attribute_values')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
