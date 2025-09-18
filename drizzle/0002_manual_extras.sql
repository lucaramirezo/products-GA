-- Manual extras: trigger, view, indexes (parcial y FTS opcional)

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Active products view
CREATE OR REPLACE VIEW active_products AS
SELECT * FROM products WHERE deleted_at IS NULL AND active = true;

-- Partial index for active, non-deleted SKUs
DROP INDEX IF EXISTS products_active_sku_partial_idx;
CREATE INDEX products_active_sku_partial_idx ON products (sku) WHERE deleted_at IS NULL AND active = true;

-- Full text search index (opcional). Comentar si no se necesita.
-- CREATE INDEX products_search_fts_idx ON products USING GIN (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(category,'') || ' ' || coalesce(sku,'')));

-- Audit log helpful indexes
DROP INDEX IF EXISTS audit_log_entity_id_idx;
CREATE INDEX audit_log_entity_id_idx ON audit_log (entity, entity_id);
DROP INDEX IF EXISTS audit_log_at_idx;
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
