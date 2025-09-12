// Domain types for pricing engine
// DB mapping notes (camelCase -> snake_case):
// providerId -> provider_id, override_multiplier -> override_multiplier, override_number_of_layers -> override_number_of_layers
// Soft delete & auditing fields (optional in UI): deleted_at -> deleted_at, created_at -> created_at, updated_at -> updated_at
export interface Tier { id:number; mult:number; number_of_layers:number; }
export interface Product {
  sku:string; name:string; category:string; providerId:string; cost_sqft:number; area_sqft:number; active_tier:number;
  override_multiplier?:number; override_number_of_layers?:number;
  ink_enabled?:boolean; lam_enabled?:boolean; cut_enabled?:boolean; sheets_count?:number; active:boolean;
  deleted_at?:string|null; created_at?:string; updated_at?:string;
}
export interface CategoryRule { category:string; override_multiplier?:number; override_number_of_layers?:number; }
export interface PriceParams {
  ink_price:number; lamination_price:number; cut_price:number; rounding_step:number; default_tier?:number; cost_method?:string;
  updated_at?:string; created_at?:string;
}
export interface Effective { mult:number; number_of_layers:number; sources:string[]; }
export interface ComputeContext {
  product:Product; tier:Tier; params:PriceParams; categoryRule?:CategoryRule;
  toggles:{ ink:boolean; lam:boolean; cut:boolean; };
  sheets_override?:number;
}
export interface PriceBreakdown {
  base_total:number; addons_total:number;
  final:number; final_per_sqft:number;
  effective:Effective;
  ink_add:number; lam_add:number; cut_add:number; base_per_sqft:number;
}
