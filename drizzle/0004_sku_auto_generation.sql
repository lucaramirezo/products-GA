-- Add SKU sequence for auto-generation
CREATE SEQUENCE IF NOT EXISTS sku_seq START 1;

-- Set default value for products.sku to auto-generate SKU-XXX format
-- Note: This will only apply to new inserts where sku is not explicitly provided
-- or where we explicitly use DEFAULT
ALTER TABLE products 
  ALTER COLUMN sku SET DEFAULT 'SKU-' || lpad(nextval('sku_seq')::text, 3, '0');
