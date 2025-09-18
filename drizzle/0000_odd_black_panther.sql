CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"field" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"category" text PRIMARY KEY NOT NULL,
	"min_pvp" numeric(12, 4),
	"override_multiplier" numeric(10, 4),
	"override_ink_factor" integer
);
--> statement-breakpoint
CREATE TABLE "price_params" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"ink_price" numeric(10, 4) NOT NULL,
	"lamination_price" numeric(10, 4) NOT NULL,
	"cut_price" numeric(10, 4) NOT NULL,
	"cut_unit" text NOT NULL,
	"rounding_step" numeric(10, 4) NOT NULL,
	"min_pvp_global" numeric(12, 4),
	"cost_method" text DEFAULT 'latest' NOT NULL,
	"default_tier" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"sku" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"provider_id" uuid NOT NULL,
	"cost_sqft" numeric(12, 4) NOT NULL,
	"area_sqft" numeric(10, 3) DEFAULT 1 NOT NULL,
	"active_tier" smallint NOT NULL,
	"min_pvp" numeric(12, 4),
	"override_multiplier" numeric(10, 4),
	"override_ink_factor" integer,
	"ink_enabled" boolean DEFAULT true NOT NULL,
	"lam_enabled" boolean DEFAULT false NOT NULL,
	"cut_enabled" boolean DEFAULT false NOT NULL,
	"sheets_count" integer,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"last_update" timestamp with time zone DEFAULT now(),
	CONSTRAINT "providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" smallint PRIMARY KEY NOT NULL,
	"mult" numeric(10, 4) NOT NULL,
	"ink_factor" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_default_tier_tiers_id_fk" FOREIGN KEY ("default_tier") REFERENCES "public"."tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_active_tier_tiers_id_fk" FOREIGN KEY ("active_tier") REFERENCES "public"."tiers"("id") ON DELETE no action ON UPDATE no action;