import { supabase } from '@/integrations/supabase/client';
import type { Product, ProductVariant, ProductWithVariants, Brand, Category } from '@/types';

// ============================================
// PRODUCTS API
// ============================================

export async function getProducts(showArchived = false) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands(id, name),
      categories(id, name),
      units(id, code, name, symbol),
      product_variants(*),
      product_images(*)
    `)
    .eq('is_active', !showArchived) // Toggle based on param
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
      units(id, code, name, symbol),
      product_variants(*),
      product_images(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { weight?: number | null; dimensions?: string | null }) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, product: Partial<Product> & { weight?: number | null; dimensions?: string | null }) {
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
  // 1. Soft delete product
  const { error: productError } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (productError) throw productError;

  // 2. Soft delete related variants
  const { error: variantError } = await supabase
    .from('product_variants')
    .update({ is_active: false })
    .eq('product_id', id);

  if (variantError) throw variantError;
}

export async function restoreProduct(id: string) {
  // 1. Restore product
  const { error: productError } = await supabase
    .from('products')
    .update({ is_active: true })
    .eq('id', id);

  if (productError) throw productError;

  // 2. Restore related variants
  const { error: variantError } = await supabase
    .from('product_variants')
    .update({ is_active: true })
    .eq('product_id', id);

  if (variantError) throw variantError;
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

export async function createVariant(variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'> & { price?: number; cost_price?: number }) {
  const { data, error } = await supabase
    .from('product_variants')
    .insert(variant)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVariant(id: string, variant: Partial<ProductVariant> & { price?: number; cost_price?: number }) {
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
// PRODUCT SUPPLIERS API
// ============================================

export async function getProductSuppliers(productId: string) {
  const { data, error } = await supabase
    .from('product_suppliers')
    .select(`
      *,
      suppliers(id, code, name, contact_person),
      product_variants(id, sku_variant)
    `)
    .eq('product_id', productId)
    .order('is_preferred', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addProductSupplier(data: { product_id: string; supplier_id: string; variant_id?: string | null; purchase_price?: number; is_preferred?: boolean }) {
  const { data: newSupplier, error } = await supabase
    .from('product_suppliers')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return newSupplier;
}

export async function updateProductSupplier(id: string, data: { purchase_price?: number; is_preferred?: boolean }) {
  const { data: updated, error } = await supabase
    .from('product_suppliers')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteProductSupplier(id: string) {
  const { error } = await supabase
    .from('product_suppliers')
    .delete()
    .eq('id', id);

  if (error) throw error;
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

export async function createBrand(brand: { name: string; is_active?: boolean }) {
  const { data, error } = await supabase
    .from('brands')
    .insert(brand)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBrand(id: string, data: { name?: string; is_active?: boolean }) {
  const { data: updatedBrand, error } = await supabase
    .from('brands')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updatedBrand;
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

export async function createCategory(category: { name: string; parent_id?: string; level?: number; is_active?: boolean }) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, data: { name?: string; parent_id?: string | null; level?: number; is_active?: boolean }) {
  const { data: updatedCategory, error } = await supabase
    .from('categories')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updatedCategory;
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

// Customer Type Pricing
export async function getCustomerTypePricing(customerTypeId: string) {
  const { data, error } = await supabase
    .from('customer_type_pricing')
    .select('*')
    .eq('customer_type_id', customerTypeId);

  if (error) throw error;
  return data;
}
