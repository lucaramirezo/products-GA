import { PricedProductRow } from './row';
import { Product } from './types';

export function exportRowsToCsv(rows:PricedProductRow[], allProducts:Product[], providerName:(id:string)=>string, full:boolean){
  const source = full ? allProducts : rows.map(r=>r.product);
  const rowsData = full
    ? source.map(p => rows.find(r=>r.product.sku===p.sku)!)
    : rows;
  const headers = ["SKU","Producto","Proveedor","Categoría","Tier","BaseTotal","InkAdd","LamAdd","CutAdd","AddOns","FinalPVP","AreaSqft","Activo"]; 
  const lines = rowsData.map(row => [
    row.product.sku,
    row.product.name,
    providerName(row.product.providerId),
    row.product.category,
    row.product.active_tier,
    row.activePricing.base_total.toFixed(2),
    row.activePricing.ink_add.toFixed(2),
    row.activePricing.lam_add.toFixed(2),
    row.activePricing.cut_add.toFixed(2),
    row.activePricing.addons_total.toFixed(2),
    row.finalPrice.toFixed(2),
    row.product.area_sqft.toFixed(2),
    row.product.active ? '1':'0'
  ]);
  const csv = [headers, ...lines].map(r => r.map(c => {
    const s = String(c); return s.includes(';') ? '"'+s+'"' : s;
  }).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `productos_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
