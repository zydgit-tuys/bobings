// ============================================
// SHARED TYPES FOR BACKEND FUNCTIONS
// ============================================

// Desty Import Types
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

export interface SkippedDetail {
  orderNo: string;
  sku: string;
  reason: string;
}

// Product & Inventory Types
export interface ProductVariant {
  id: string;
  sku_variant: string;
  hpp: number;
  price: number;
  stock_qty: number;
  product_id: string;
  products?: {
    sku_master: string;
    name: string;
  };
}

// Accounting Types
export interface JournalLine {
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

// Supplier & Purchase Types
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  is_active: boolean;
}

export interface Purchase {
  id: string;
  purchase_no: string;
  supplier_id: string;
  status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
  order_date: string;
  expected_date?: string;
  received_date?: string;
  total_qty: number;
  total_amount: number;
  notes?: string;
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
}
