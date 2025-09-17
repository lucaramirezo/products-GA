-- Create products_with_cost view that resolves current_cost_ft2
-- This view implements the business logic: pinned active entries first, then latest by effective_date

CREATE OR REPLACE VIEW products_with_cost AS
WITH ranked_price_entries AS (
  SELECT 
    pe.product_id,
    pe.cost_ft2,
    pe.pinned,
    pe.effective_date,
    -- Priority: pinned entries first (pinned=true gets rank 1), then by effective_date desc
    ROW_NUMBER() OVER (
      PARTITION BY pe.product_id 
      ORDER BY 
        pe.pinned DESC,  -- pinned entries first
        pe.effective_date DESC,  -- then by most recent date
        pe.created_at DESC  -- tie-breaker
    ) AS rn
  FROM price_entries pe
  WHERE pe.active = true 
    AND pe.deleted_at IS NULL
),
current_costs AS (
  SELECT 
    product_id,
    cost_ft2 AS current_cost_ft2
  FROM ranked_price_entries
  WHERE rn = 1
)
SELECT 
  p.*,
  cc.current_cost_ft2
FROM products p
LEFT JOIN current_costs cc ON p.sku = cc.product_id
WHERE p.active = true 
  AND p.deleted_at IS NULL;

-- Create trigger function to compute derived fields in purchase_items
CREATE OR REPLACE FUNCTION compute_purchase_item_fields()
RETURNS TRIGGER AS $$
DECLARE
    conversion_factor numeric(10, 6);
    area_per_unit numeric(12, 6);
    area_total numeric(12, 6);
BEGIN
    -- Convert dimensions to feet based on UOM
    CASE NEW.uom
        WHEN 'ft' THEN conversion_factor := 1.0;
        WHEN 'in' THEN conversion_factor := 1.0 / 12.0;
        WHEN 'cm' THEN conversion_factor := 1.0 / 30.48;
        WHEN 'm' THEN conversion_factor := 1.0 / 0.3048;
        ELSE conversion_factor := 1.0;
    END CASE;

    -- Compute area_ft2_per_unit based on unit_type
    CASE NEW.unit_type
        WHEN 'sheet' THEN
            -- For sheets, area = width * height (converted to ft²)
            IF NEW.width IS NOT NULL AND NEW.height IS NOT NULL THEN
                area_per_unit := NEW.width * NEW.height * conversion_factor * conversion_factor;
            ELSE
                area_per_unit := 1.0; -- Default to 1 sqft if dimensions missing
            END IF;
        WHEN 'roll' THEN
            -- For rolls, area = width * length, but length comes from units
            -- Assuming units represent the length dimension for rolls
            IF NEW.width IS NOT NULL THEN
                area_per_unit := NEW.width * NEW.units * conversion_factor * conversion_factor;
            ELSE
                area_per_unit := NEW.units * conversion_factor * conversion_factor; -- Assume 1ft width
            END IF;
        WHEN 'sqft' THEN
            -- For sqft, area directly comes from units (already in sqft)
            area_per_unit := NEW.units;
        ELSE
            area_per_unit := 1.0; -- Default fallback
    END CASE;

    -- For unit_type = 'roll', area_per_unit includes the quantity, so total is the same
    -- For other types, multiply by units
    IF NEW.unit_type = 'roll' THEN
        area_total := area_per_unit;
        area_per_unit := area_per_unit / NEW.units; -- Adjust per_unit to be truly per unit
    ELSE
        area_total := area_per_unit * NEW.units;
    END IF;

    -- Set computed fields
    NEW.area_ft2_per_unit := area_per_unit;
    NEW.area_ft2_total := area_total;
    NEW.total_cost := NEW.units * NEW.unit_cost;
    
    -- Compute cost per sqft, avoiding division by zero
    IF area_total > 0 THEN
        NEW.cost_ft2_line := NEW.total_cost / area_total;
    ELSE
        NEW.cost_ft2_line := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for purchase_items
DROP TRIGGER IF EXISTS compute_purchase_item_fields_trigger ON purchase_items;
CREATE TRIGGER compute_purchase_item_fields_trigger
    BEFORE INSERT OR UPDATE ON purchase_items
    FOR EACH ROW
    EXECUTE FUNCTION compute_purchase_item_fields();

-- Create constraint to ensure only one pinned active price_entry per product
-- Note: This is a partial unique index (only for pinned=true entries)
CREATE UNIQUE INDEX IF NOT EXISTS price_entries_one_pinned_per_product_idx 
ON price_entries (product_id) 
WHERE pinned = true AND active = true AND deleted_at IS NULL;