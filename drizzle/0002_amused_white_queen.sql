CREATE TABLE "price_cache" (
	"inputs_hash" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"final_pvp" numeric(12, 4) NOT NULL,
	"breakdown" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "price_cache" ADD CONSTRAINT "price_cache_sku_products_sku_fk" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku") ON DELETE cascade ON UPDATE no action;