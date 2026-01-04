-- Add product_type enum
CREATE TYPE product_type AS ENUM ('production', 'purchased', 'service');

-- Add product_type column to products table
ALTER TABLE products 
ADD COLUMN product_type product_type NOT NULL DEFAULT 'purchased';

-- Add comment for documentation
COMMENT ON COLUMN products.product_type IS 
'Product classification: production (manufactured), purchased (trading goods), service (non-stock)';
