// Domain types for pricing engine
// DB mapping notes (camelCase -> snake_case):
// providerId -> provider_id, min_pvp -> min_pvp, override_multiplier -> override_multiplier, override_ink_factor -> override_ink_factor
// Soft delete & auditing fields (optional in UI): deleted_at -> deleted_at, created_at -> created_at, updated_at -> updated_at
export interface Tier { id:number; mult:number; ink_factor:number; }
export interface Product {
  sku:string; name:string; category:string; providerId:string; cost_sqft:number; area_sqft:number; active_tier:number;
  min_pvp?:number; override_multiplier?:number; override_ink_factor?:number;
  ink_enabled?:boolean; lam_enabled?:boolean; cut_enabled?:boolean; sheets_count?:number; active:boolean;
  deleted_at?:string|null; created_at?:string; updated_at?:string;
}
export interface CategoryRule { category:string; min_pvp?:number; override_multiplier?:number; override_ink_factor?:number; }
export interface PriceParams {
  ink_price:number; lamination_price:number; cut_price:number; cut_unit:'per_sqft'|'per_sheet'; rounding_step:number; min_pvp_global?:number; default_tier?:number; cost_method?:string;
  updated_at?:string; created_at?:string;
}
export interface Effective { mult:number; ink_factor:number; min_per_sqft?:number; sources:string[]; }
export interface ComputeContext {
  product:Product; tier:Tier; params:PriceParams; categoryRule?:CategoryRule;
  toggles:{ ink:boolean; lam:boolean; cut:boolean; };
  sheets_override?:number;
}
export interface PriceBreakdown {
  base_total:number; addons_total:number; min_total:number;
  final:number; final_per_sqft:number;
  applied_min:boolean; applied_min_source:'product'|'category'|'global'|null;
  effective:Effective;
  ink_add:number; lam_add:number; cut_add:number; base_per_sqft:number;
}
