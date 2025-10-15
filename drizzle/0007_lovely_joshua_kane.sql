CREATE TYPE "public"."purchase_unit" AS ENUM('sqft', 'sheet');--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"qty" numeric(12, 4) NOT NULL,
	"unit" "purchase_unit" NOT NULL,
	"amount" numeric(12, 4) NOT NULL,
	"linked" boolean DEFAULT false NOT NULL,
	"applied_to_product" boolean DEFAULT false NOT NULL,
	"temp_width" numeric(10, 3),
	"temp_height" numeric(10, 3),
	"temp_uom" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "purchase_items_qty_positive" CHECK ("purchase_items"."qty" > 0),
	CONSTRAINT "purchase_items_amount_non_negative" CHECK ("purchase_items"."amount" >= 0),
	CONSTRAINT "purchase_items_temp_width_positive" CHECK (("purchase_items"."temp_width" IS NULL) OR ("purchase_items"."temp_width" > 0)),
	CONSTRAINT "purchase_items_temp_height_positive" CHECK (("purchase_items"."temp_height" IS NULL) OR ("purchase_items"."temp_height" > 0)),
	CONSTRAINT "purchase_items_temp_uom_valid" CHECK (("purchase_items"."temp_uom" IS NULL) OR ("purchase_items"."temp_uom" IN ('in', 'cm')))
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid,
	"invoice_no" text,
	"date" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'USD',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_sku_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("sku") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_providers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchase_items_product_idx" ON "purchase_items" USING btree ("product_id");