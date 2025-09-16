-- Add SKU sequence for auto-generation starting from 0
-- First remove the default constraint, then recreate sequence
ALTER TABLE products ALTER COLUMN sku DROP DEFAULT;
DROP SEQUENCE IF EXISTS sku_seq CASCADE;
CREATE SEQUENCE sku_seq START 0 MINVALUE 0;

-- Set default value for products.sku to auto-generate SKU-XXX format
-- Note: This will only apply to new inserts where sku is not explicitly provided
-- or where we explicitly use DEFAULT
ALTER TABLE products 
  ALTER COLUMN sku SET DEFAULT 'SKU-' || lpad(nextval('sku_seq')::text, 3, '0');
