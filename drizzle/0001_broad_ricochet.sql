CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_provider_idx" ON "products" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "products_active_tier_idx" ON "products" USING btree ("active_tier");--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_ink_price_non_negative" CHECK ("price_params"."ink_price" >= 0);--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_lamination_price_non_negative" CHECK ("price_params"."lamination_price" >= 0);--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_cut_price_non_negative" CHECK ("price_params"."cut_price" >= 0);--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_rounding_step_positive" CHECK ("price_params"."rounding_step" > 0);--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_min_pvp_global_non_negative" CHECK (("price_params"."min_pvp_global" IS NULL) OR ("price_params"."min_pvp_global" >= 0));--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_cut_unit_valid" CHECK ("price_params"."cut_unit" in ('per_sqft','per_sheet'));--> statement-breakpoint
ALTER TABLE "price_params" ADD CONSTRAINT "price_params_cost_method_valid" CHECK ("price_params"."cost_method" = 'latest');--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_cost_sqft_non_negative" CHECK ("products"."cost_sqft" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_area_sqft_positive" CHECK ("products"."area_sqft" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_min_pvp_non_negative" CHECK (("products"."min_pvp" IS NULL) OR ("products"."min_pvp" >= 0));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_override_multiplier_positive" CHECK (("products"."override_multiplier" IS NULL) OR ("products"."override_multiplier" > 0));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_override_ink_factor_non_negative" CHECK (("products"."override_ink_factor" IS NULL) OR ("products"."override_ink_factor" >= 0));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sheets_count_non_negative" CHECK (("products"."sheets_count" IS NULL) OR ("products"."sheets_count" >= 0));--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_mult_positive" CHECK ("tiers"."mult" > 0);--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_ink_factor_non_negative" CHECK ("tiers"."ink_factor" >= 0);--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_id_range" CHECK ("tiers"."id" BETWEEN 1 AND 5);