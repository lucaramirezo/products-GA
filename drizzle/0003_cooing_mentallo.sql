ALTER TABLE "category_rules" RENAME COLUMN "override_ink_factor" TO "override_number_of_layers";--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "override_ink_factor" TO "override_number_of_layers";--> statement-breakpoint
ALTER TABLE "tiers" RENAME COLUMN "ink_factor" TO "number_of_layers";--> statement-breakpoint
ALTER TABLE "price_params" DROP CONSTRAINT "price_params_min_pvp_global_non_negative";--> statement-breakpoint
ALTER TABLE "price_params" DROP CONSTRAINT "price_params_cut_unit_valid";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_min_pvp_non_negative";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_override_ink_factor_non_negative";--> statement-breakpoint
ALTER TABLE "tiers" DROP CONSTRAINT "tiers_ink_factor_non_negative";--> statement-breakpoint
ALTER TABLE "category_rules" DROP COLUMN "min_pvp";--> statement-breakpoint
ALTER TABLE "price_params" DROP COLUMN "cut_unit";--> statement-breakpoint
ALTER TABLE "price_params" DROP COLUMN "min_pvp_global";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "min_pvp";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_override_number_of_layers_non_negative" CHECK (("products"."override_number_of_layers" IS NULL) OR ("products"."override_number_of_layers" >= 0));--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_number_of_layers_non_negative" CHECK ("tiers"."number_of_layers" >= 0);