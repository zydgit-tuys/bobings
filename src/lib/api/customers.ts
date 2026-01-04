import { supabase } from '@/integrations/supabase/client';

export interface Customer {
    id: string;
    code: string;
    name: string;
    customer_type: 'umum' | 'khusus';  // Simplified enum
    customer_type_id?: string; // Foreign key to customer_types table
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    contact_person?: string;
    tax_id?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomerInsert {
    code: string;
    name: string;
    customer_type?: 'umum' | 'khusus';  // Simplified enum
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    contact_person?: string;
    tax_id?: string;
    notes?: string;
    is_active?: boolean;
}

export interface CustomerUpdate extends Partial<CustomerInsert> { }

export async function getCustomers(activeOnly = true) {
    let query = supabase
        .from('customers')
        .select('*')  // Simple - no join needed
        .order('name');

    if (activeOnly) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Customer[];
}

export async function getCustomer(id: string) {
    const { data, error } = await supabase
        .from('customers')
        .select(`
      *,
      customer_types(id, name, code, discount_percentage)
    `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Customer;
}

export async function createCustomer(customer: CustomerInsert) {
    const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();

    if (error) throw error;
    return data as Customer;
}

export async function updateCustomer(id: string, customer: CustomerUpdate) {
    const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Customer;
}

export async function deleteCustomer(id: string) {
    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Get customer-specific pricing for a variant
export async function getCustomerPricing(customerId: string, variantId?: string) {
    let query = supabase
        .from('customer_pricing')
        .select(`
      *,
      product_variants(
        id,
        sku_variant,
        price,
        products(name)
      )
    `)
        .eq('customer_id', customerId);

    if (variantId) {
        query = query.eq('variant_id', variantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// Get effective price for a customer and variant
export async function getEffectivePrice(customerId: string, variantId: string, basePrice: number) {
    // 1. Check for customer-specific pricing
    const { data: customPricing } = await supabase
        .from('customer_pricing')
        .select('special_price, valid_from, valid_until')
        .eq('customer_id', customerId)
        .eq('variant_id', variantId)
        .single();

    if (customPricing) {
        const today = new Date().toISOString().split('T')[0];
        const isValid = (!customPricing.valid_from || customPricing.valid_from <= today) &&
            (!customPricing.valid_until || customPricing.valid_until >= today);

        if (isValid) {
            return customPricing.special_price;
        }
    }

    // 2. Apply customer type discount
    const { data: customer } = await supabase
        .from('customers')
        .select('customer_types(discount_percentage)')
        .eq('id', customerId)
        .single();

    if (customer?.customer_types) {
        const customerType = Array.isArray(customer.customer_types)
            ? customer.customer_types[0]
            : customer.customer_types;

        if (customerType?.discount_percentage) {
            const discount = customerType.discount_percentage;
            return basePrice * (1 - discount / 100);
        }
    }

    // 3. Return base price
    return basePrice;
}
