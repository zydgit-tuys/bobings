
-- =============================================
-- PHASE 1: MASTER DATA TABLES
-- =============================================

-- Brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories table (hierarchical)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Variant Attributes (Size, Color)
CREATE TABLE public.variant_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attribute Values
CREATE TABLE public.attribute_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_id UUID NOT NULL REFERENCES public.variant_attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(attribute_id, value)
);

-- =============================================
-- PHASE 2: PRODUCTS & VARIANTS
-- =============================================

-- Products (Master SKU)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_master TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description TEXT,
    base_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product Variants (Sellable Items with Size + Color)
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku_variant TEXT NOT NULL UNIQUE,
    size_value_id UUID REFERENCES public.attribute_values(id) ON DELETE SET NULL,
    color_value_id UUID REFERENCES public.attribute_values(id) ON DELETE SET NULL,
    hpp DECIMAL(15,2) NOT NULL DEFAULT 0,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock Movements (Audit Trail)
CREATE TYPE public.movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'SALE');

CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    movement_type public.movement_type NOT NULL,
    qty INTEGER NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3: SALES & ORDERS
-- =============================================

-- Sales Imports (Batch import tracking)
CREATE TYPE public.import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.sales_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    import_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_orders INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    skipped_details JSONB,
    status public.import_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sales Orders
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'cancelled', 'returned');

CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID REFERENCES public.sales_imports(id) ON DELETE SET NULL,
    desty_order_no TEXT NOT NULL UNIQUE,
    marketplace TEXT,
    order_date DATE NOT NULL,
    status public.order_status NOT NULL DEFAULT 'completed',
    customer_name TEXT,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_hpp DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_fees DECIMAL(15,2) NOT NULL DEFAULT 0,
    profit DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order Items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    sku_master TEXT,
    sku_variant TEXT,
    product_name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    hpp DECIMAL(15,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 4: ACCOUNTING
-- =============================================

-- Chart of Accounts
CREATE TYPE public.account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    account_type public.account_type NOT NULL,
    parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Entries
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_type TEXT,
    reference_id UUID,
    description TEXT NOT NULL,
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journal Lines
CREATE TABLE public.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 5: INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_products_sku ON public.products(sku_master);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_category ON public.products(category_id);

CREATE INDEX idx_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_variants_sku ON public.product_variants(sku_variant);
CREATE INDEX idx_variants_size ON public.product_variants(size_value_id);
CREATE INDEX idx_variants_color ON public.product_variants(color_value_id);

CREATE INDEX idx_stock_movements_variant ON public.stock_movements(variant_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(created_at);

CREATE INDEX idx_sales_orders_import ON public.sales_orders(import_id);
CREATE INDEX idx_sales_orders_desty ON public.sales_orders(desty_order_no);
CREATE INDEX idx_sales_orders_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_orders_marketplace ON public.sales_orders(marketplace);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_variant ON public.order_items(variant_id);

CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entries_ref ON public.journal_entries(reference_type, reference_id);

CREATE INDEX idx_journal_lines_entry ON public.journal_lines(entry_id);
CREATE INDEX idx_journal_lines_account ON public.journal_lines(account_id);

CREATE INDEX idx_coa_code ON public.chart_of_accounts(code);
CREATE INDEX idx_coa_type ON public.chart_of_accounts(account_type);

-- =============================================
-- PHASE 6: ROW LEVEL SECURITY (Public Access for Single User)
-- =============================================

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (single user system, no auth needed for now)
CREATE POLICY "Allow public access" ON public.brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.variant_attributes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.attribute_values FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.sales_imports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.sales_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.chart_of_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.journal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access" ON public.journal_lines FOR ALL USING (true) WITH CHECK (true);
