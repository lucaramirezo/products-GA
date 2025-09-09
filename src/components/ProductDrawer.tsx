import React from 'react';
import type { Product, Tier, CategoryRule } from '@/lib/pricing/types';
import type { Provider } from '@/server/queries/getInitialData';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { Field } from './ui';

const CURRENCY = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

interface ProductDrawerProps {
  product: Product;
  computed: ReturnType<typeof buildPricedProductRow>;
  providers: Provider[];
  categoryRules: CategoryRule[];
  tiers: Tier[];
  onClose: () => void;
  onUpdate: (sku: string, patch: Partial<Product>) => void;
}

export function ProductDrawer({
  product,
  computed,
  providers,
  categoryRules,
  tiers,
  onClose,
  onUpdate
}: ProductDrawerProps) {
  const categories = Array.from(new Set(categoryRules.map(r => r.category)));

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Editar producto</h3>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-4 text-sm">
          <Field label="SKU">
            <span className="font-mono">{product.sku}</span>
          </Field>
          
          <Field label="Nombre">
            <input
              className="w-full rounded border border-slate-300 px-3 py-2"
              value={product.name}
              onChange={(e) => onUpdate(product.sku, { name: e.target.value })}
            />
          </Field>
          
          <Field label="Categoría">
            <select
              className="w-full rounded border border-slate-300 px-3 py-2"
              value={product.category}
              onChange={(e) => onUpdate(product.sku, { category: e.target.value })}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </Field>
          
          <Field label="Proveedor">
            <select
              className="w-full rounded border border-slate-300 px-3 py-2"
              value={product.providerId}
              onChange={(e) => onUpdate(product.sku, { providerId: e.target.value })}
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          
          <Field label="Cost (ft²)">
            <input
              type="number"
              step={0.01}
              className="w-32 rounded border border-slate-300 px-3 py-2"
              value={product.cost_sqft}
              onChange={(e) => onUpdate(product.sku, { cost_sqft: Number(e.target.value) })}
            />
          </Field>
          
          <Field label="Area (ft²)">
            <input
              type="number"
              step={0.01}
              className="w-32 rounded border border-slate-300 px-3 py-2"
              value={product.area_sqft}
              onChange={(e) => onUpdate(product.sku, { area_sqft: Math.max(0.01, Number(e.target.value)) })}
            />
          </Field>
          
          <Field label="Tier Activo">
            <select
              className="w-32 rounded border border-slate-300 px-3 py-2"
              value={product.active_tier}
              onChange={(e) => onUpdate(product.sku, { active_tier: Number(e.target.value) })}
            >
              {tiers.map(t => (
                <option key={t.id} value={t.id}>Tier {t.id}</option>
              ))}
            </select>
          </Field>
          
          <Field label="Min PVP">
            <input
              type="number"
              step={0.1}
              className="w-32 rounded border border-slate-300 px-3 py-2"
              value={product.min_pvp ?? 0}
              onChange={(e) =>
                onUpdate(product.sku, {
                  min_pvp: Number(e.target.value) || undefined,
                })
              }
            />
          </Field>
          
          <div className="grid grid-cols-3 gap-4">
            <Field label="Ink on?">
              <input
                type="checkbox"
                checked={product.ink_enabled ?? false}
                onChange={(e) => onUpdate(product.sku, { ink_enabled: e.target.checked })}
              />
            </Field>
            <Field label="Lam on?">
              <input
                type="checkbox"
                checked={product.lam_enabled ?? false}
                onChange={(e) => onUpdate(product.sku, { lam_enabled: e.target.checked })}
              />
            </Field>
            <Field label="Cut on?">
              <input
                type="checkbox"
                checked={product.cut_enabled ?? false}
                onChange={(e) => onUpdate(product.sku, { cut_enabled: e.target.checked })}
              />
            </Field>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Override Mult">
              <input
                type="number"
                step={0.1}
                className="w-full rounded border border-slate-300 px-3 py-2"
                value={product.override_multiplier ?? ""}
                onChange={(e) =>
                  onUpdate(product.sku, {
                    override_multiplier: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
            <Field label="Override Ink×">
              <input
                type="number"
                step={1}
                className="w-full rounded border border-slate-300 px-3 py-2"
                value={product.override_ink_factor ?? ""}
                onChange={(e) =>
                  onUpdate(product.sku, {
                    override_ink_factor: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
          </div>
          
          <Field label="Activo">
            <input
              type="checkbox"
              checked={product.active}
              onChange={(e) => onUpdate(product.sku, { active: e.target.checked })}
            />
          </Field>
          
          <div className="rounded border border-slate-200 p-3 text-xs bg-slate-50">
            <div className="font-medium mb-1">Preview</div>
            <div className="space-y-1">
              <div>Base: {computed.activePricing.base_total.toFixed(2)}</div>
              <div>Add-ons: {computed.activePricing.addons_total.toFixed(2)} (Ink {computed.activePricing.ink_add.toFixed(2)} / Lam {computed.activePricing.lam_add.toFixed(2)} / Cut {computed.activePricing.cut_add.toFixed(2)})</div>
              <div>Mínimo total: {computed.activePricing.min_total.toFixed(2)}</div>
              <div>Final: {CURRENCY(computed.finalPrice)} ({computed.finalSource}) {computed.activePricing.min_applied && "*mín"}</div>
              <div className="flex flex-wrap gap-1">
                {computed.tiersPreview.map((tp) => (
                  <span key={tp.tier} className={`px-2 py-0.5 rounded bg-white border text-[10px] ${tp.tier === product.active_tier ? "border-slate-500" : "border-slate-200"}`}>
                    T{tp.tier}:{tp.final.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
