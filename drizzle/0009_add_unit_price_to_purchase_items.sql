-- Migration: Add unit_price to purchase_items table
-- Adding unit_price field without affecting existing sequences

ALTER TABLE "purchase_items" ADD COLUMN "unit_price" numeric(12,4) NOT NULL DEFAULT 1;

-- Update existing records to set unit_price based on amount/qty where possible
-- For existing data, we'll set unit_price = amount / qty as a reasonable approximation
UPDATE "purchase_items" 
SET "unit_price" = CASE 
  WHEN "qty" > 0 THEN "amount" / "qty"
  ELSE "amount"
END;

-- Add constraint to ensure unit_price is positive
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_unit_price_positive" CHECK ("unit_price" > 0);

-- Remove the default constraint after updating existing data
ALTER TABLE "purchase_items" ALTER COLUMN "unit_price" DROP DEFAULT;