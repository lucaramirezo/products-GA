import React, { useState } from 'react';
import type { Product, Tier, CategoryRule } from '@/lib/pricing/types';
import type { Provider } from '@/server/queries/getInitialData';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { Field } from './ui';
import { CommitTextInput, CommitNumberInput } from './CommitInputs';
import { deleteProduct } from '@/server/actions/deleteProduct';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmSku, setDeleteConfirmSku] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleteConfirmSku !== product.sku) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const result = await deleteProduct(product.sku);
      if (result.success) {
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to delete product');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmSku('');
    }
  };

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Editar producto</h3>
          <div className="flex items-center gap-2">
            <button 
              className="text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-300 hover:border-red-500 text-sm"
              onClick={() => setShowDeleteModal(true)}
            >
              Eliminar
            </button>
            <button className="text-slate-500 hover:text-slate-900" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <Field label="SKU">
            <span className="font-mono">{product.sku}</span>
          </Field>
          
          <Field label="Nombre">
            <CommitTextInput
              value={product.name}
              onCommit={(newValue) => onUpdate(product.sku, { name: newValue })}
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
            <CommitNumberInput
              value={product.cost_sqft}
              onCommit={(newValue) => onUpdate(product.sku, { cost_sqft: newValue || 0 })}
              step={0.01}
              min={0}
              className="w-32 rounded border border-slate-300 px-3 py-2"
            />
          </Field>
          
          <Field label="Area (ft²)">
            <CommitNumberInput
              value={product.area_sqft}
              onCommit={(newValue) => onUpdate(product.sku, { area_sqft: Math.max(0.01, newValue || 0.01) })}
              step={0.01}
              min={0.01}
              className="w-32 rounded border border-slate-300 px-3 py-2"
            />
          </Field>
          
          <Field label="Sell Mode">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sell_mode"
                  value="SQFT"
                  checked={product.sell_mode === 'SQFT'}
                  onChange={(e) => onUpdate(product.sku, { sell_mode: e.target.value as 'SQFT' | 'SHEET' })}
                />
                <span>Square Foot</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sell_mode"
                  value="SHEET"
                  checked={product.sell_mode === 'SHEET'}
                  onChange={(e) => onUpdate(product.sku, { sell_mode: e.target.value as 'SQFT' | 'SHEET' })}
                />
                <span>Sheet</span>
              </label>
            </div>
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
              <CommitNumberInput
                value={product.override_multiplier}
                onCommit={(newValue) => onUpdate(product.sku, { override_multiplier: newValue || undefined })}
                step={0.1}
                min={0}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </Field>
            <Field label="Override Layers">
              <CommitNumberInput
                value={product.override_number_of_layers}
                onCommit={(newValue) => onUpdate(product.sku, { override_number_of_layers: newValue || undefined })}
                step={1}
                min={0}
                className="w-full rounded border border-slate-300 px-3 py-2"
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
              <div>Add-ons: {computed.activePricing.addons_total.toFixed(2)} 
                (Ink {computed.activePricing.ink_add.toFixed(2)} / Lam {computed.activePricing.lam_add.toFixed(2)}
                {product.sell_mode === 'SQFT' ? ` / Cut ${computed.activePricing.cut_add.toFixed(2)}` : ''})
              </div>
              <div>Final: {CURRENCY(computed.finalPrice)} ({computed.finalSource})</div>
              {product.sell_mode === 'SHEET' && product.cut_enabled && (
                <div className="text-orange-600 text-[10px]">
                  ⚠️ Cutting disabled for SHEET mode
                </div>
              )}
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
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-lg p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Confirmar eliminación</h3>
            <p className="text-sm text-slate-600 mb-4">
              Para confirmar la eliminación del producto <strong>{product.name}</strong>, 
              escriba el SKU exacto:
            </p>
            <p className="font-mono text-sm bg-slate-100 p-2 rounded mb-4">{product.sku}</p>
            <input
              type="text"
              value={deleteConfirmSku}
              onChange={(e) => setDeleteConfirmSku(e.target.value)}
              placeholder="Escriba el SKU aquí"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmSku('');
                }}
                className="px-4 py-2 text-sm rounded border border-slate-300 hover:bg-slate-50"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmSku !== product.sku || isDeleting}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
