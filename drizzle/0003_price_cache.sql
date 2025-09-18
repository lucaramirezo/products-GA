CREATE TABLE IF NOT EXISTS "price_cache" (
  "inputs_hash" text PRIMARY KEY,
  "sku" text NOT NULL REFERENCES "products"("sku") ON DELETE CASCADE,
  "final_pvp" numeric(12,4) NOT NULL,
  "breakdown" jsonb NOT NULL,
  "computed_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_cache_sku_idx ON price_cache(sku);
CREATE INDEX IF NOT EXISTS price_cache_computed_at_idx ON price_cache(computed_at DESC);