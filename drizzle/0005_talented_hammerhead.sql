CREATE TYPE "public"."unit_type" AS ENUM('sheet', 'roll', 'sqft');--> statement-breakpoint
CREATE TYPE "public"."uom" AS ENUM('ft', 'in', 'cm', 'm');--> statement-breakpoint
CREATE TABLE "price_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"supplier_id" uuid,
	"source_item_id" uuid,
	"effective_date" timestamp NOT NULL,
	"cost_ft2" numeric(12, 6) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "price_entries_cost_ft2_non_negative" CHECK ("price_entries"."cost_ft2" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid,
	"unit_type" "unit_type" NOT NULL,
	"units" numeric(12, 4) NOT NULL,
	"width" numeric(10, 4),
	"height" numeric(10, 4),
	"uom" "uom" DEFAULT 'ft' NOT NULL,
	"area_ft2_per_unit" numeric(12, 6),
	"area_ft2_total" numeric(12, 6),
	"unit_cost" numeric(12, 4) NOT NULL,
	"total_cost" numeric(12, 4),
	"cost_ft2_line" numeric(12, 6),
	"generate_price" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "purchase_items_units_positive" CHECK ("purchase_items"."units" > 0),
	CONSTRAINT "purchase_items_width_positive" CHECK (("purchase_items"."width" IS NULL) OR ("purchase_items"."width" > 0)),
	CONSTRAINT "purchase_items_height_positive" CHECK (("purchase_items"."height" IS NULL) OR ("purchase_items"."height" > 0)),
	CONSTRAINT "purchase_items_unit_cost_non_negative" CHECK ("purchase_items"."unit_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_no" text NOT NULL,
	"supplier_id" uuid,
	"date" timestamp NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal" numeric(12, 4) NOT NULL,
	"tax" numeric(12, 4) DEFAULT '0' NOT NULL,
	"shipping" numeric(12, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"attachments" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "purchases_subtotal_non_negative" CHECK ("purchases"."subtotal" >= 0),
	CONSTRAINT "purchases_tax_non_negative" CHECK ("purchases"."tax" >= 0),
	CONSTRAINT "purchases_shipping_non_negative" CHECK ("purchases"."shipping" >= 0)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_info" text,
	"payment_terms" text,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "suppliers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "current_price_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_product_id_products_sku_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "price_entries" ADD CONSTRAINT "price_entries_source_item_id_purchase_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_sku_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "price_entries_product_date_idx" ON "price_entries" USING btree ("product_id","effective_date");--> statement-breakpoint
CREATE INDEX "price_entries_pinned_idx" ON "price_entries" USING btree ("product_id","pinned");--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchases_date_idx" ON "purchases" USING btree ("date");