// ============================================
// FRONTEND SHARED TYPES
// ============================================

// Re-export database types from Supabase
export type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

// Product Types
export interface Product {
  id: string;
  sku_master: string;
  name: string;
  description?: string;
  base_price: number;
  brand_id?: string;
  category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku_variant: string;
  price: number;
  hpp: number;
  stock_qty: number;
  min_stock_alert: number;
  color_value_id?: string;
  size_value_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
  brand?: Brand;
  category?: Category;
}

// Brand & Category Types
export interface Brand {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  level: number;
  is_active: boolean;
}

// Supplier Types
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Purchase Types
export type PurchaseStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

export interface Purchase {
  id: string;
  purchase_no: string;
  supplier_id: string;
  status: PurchaseStatus;
  order_date: string;
  expected_date?: string;
  received_date?: string;
  total_qty: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderLine {
  id: string;
  purchase_id: string;
  variant_id: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  subtotal: number;
  notes?: string;
  variant?: ProductVariant;
}

export interface PurchaseWithDetails extends Purchase {
  supplier?: Supplier;
  lines: PurchaseOrderLine[];
}

// Sales Types
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'returned';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SalesOrder {
  id: string;
  desty_order_no: string;
  import_id?: string;
  marketplace?: string;
  customer_name?: string;
  order_date: string;
  status: OrderStatus;
  total_amount: number;
  total_hpp: number;
  total_fees: number;
  profit: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id?: string;
  sku_master?: string;
  sku_variant?: string;
  product_name: string;
  qty: number;
  unit_price: number;
  hpp: number;
  subtotal: number;
}

export interface SalesImport {
  id: string;
  filename: string;
  import_date: string;
  status: ImportStatus;
  total_orders: number;
  success_count: number;
  skipped_count: number;
  skipped_details?: SkippedDetail[];
  created_at: string;
  updated_at: string;
}

export interface SkippedDetail {
  orderNo: string;
  sku: string;
  reason: string;
}

// Stock Movement Types
export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'SALE';

export interface StockMovement {
  id: string;
  variant_id: string;
  movement_type: MovementType;
  qty: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

// Accounting Types
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_id?: string;
  is_active: boolean;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
  account?: ChartOfAccount;
}

export interface TrialBalanceRow {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  total_debit: number;
  total_credit: number;
  balance: number;
}

// Inventory Alert Types
export interface InventoryAlert {
  variant_id: string;
  sku_variant: string;
  product_name: string;
  size_name?: string;
  color_name?: string;
  current_stock: number;
  min_stock: number;
}

// Desty Import Types (for frontend)
export interface DestyRow {
  orderNo: string;
  marketplace: string;
  orderDate: string;
  customerName: string;
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
  shippingFee: number;
  adminFee: number;
  status: string;
}

export interface ParseResult {
  success: boolean;
  data?: DestyRow[];
  errors?: string[];
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

export interface ProcessResult {
  success: boolean;
  importId?: string;
  summary?: {
    totalOrders: number;
    successCount: number;
    skippedCount: number;
    skippedDetails: SkippedDetail[];
  };
  error?: string;
}
