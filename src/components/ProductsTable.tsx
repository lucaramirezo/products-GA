import React from 'react';
import type { Product } from '@/lib/pricing/types';
import type { AuditEntry } from '@/server/queries/getInitialData';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { Th, Td } from './ui';
import { CommitNumberInput } from './CommitInputs';

// const CURRENCY = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

interface ProductsTableProps {
  computedProducts: ReturnType<typeof buildPricedProductRow>[];
  query: string;
  onQueryChange: (query: string) => void;
  showAudit: boolean;
  onToggleAudit: () => void;
  onExportCSV: (full?: boolean) => void;
  onCreateProduct: () => void;
  onEditProduct: (sku: string) => void;
  onUpdateProduct: (sku: string, patch: Partial<Product>) => void;
  providerName: (id: string) => string;
  audit: AuditEntry[];
  tiers: Array<{ id: number; mult: number; ink_factor: number }>;
}

export function ProductsTable({
  computedProducts,
  query,
  onQueryChange,
  showAudit,
  onToggleAudit,
  onExportCSV,
  onCreateProduct,
  onEditProduct,
  onUpdateProduct,
  providerName,
  audit,
  tiers
}: ProductsTableProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <input
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
          placeholder="Buscar SKU, nombre, categoría o proveedor…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onExportCSV(false)}
            className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => onExportCSV(true)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Exportar Full
          </button>
          <button
            onClick={onToggleAudit}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            {showAudit ? "Ocultar" : "Ver"} auditoría
          </button>
          <button
            onClick={onCreateProduct}
            className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-500"
          >
            Nuevo producto
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-slate-200 bg-white relative">
        <table className="min-w-full text-[11px] md:text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <Th>SKU</Th>
              <Th>Producto</Th>
              <Th>Proveedor</Th>
              <Th>Categoría</Th>
              <Th className="text-right">Cost/ft²</Th>
              <Th>Tier</Th>
              <Th className="text-right">Base</Th>
              <Th className="text-right">Ink</Th>
              <Th className="text-right">Lam</Th>
              <Th className="text-right">Cut</Th>
              <Th className="text-right">Add-ons</Th>
              <Th className="text-right">Final</Th>
              <Th>Min/ft²</Th>
              <Th>Area</Th>
              <Th>Activo</Th>
            </tr>
          </thead>
          <tbody>
            {computedProducts.map((row) => (
              <ProductRow
                key={row.product.sku}
                row={row}
                onEditProduct={onEditProduct}
                onUpdateProduct={onUpdateProduct}
                providerName={providerName}
                tiers={tiers}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <p className="text-xs text-slate-500">
        Fórmula: base=(cost_sqft × mult × área) + ink(ink_price×ink_factor×área opcional) + lam(lam_price×área) + cut(depende unidad) → aplica mínimo (min_per_ft² × área) → redondeo ↑.
      </p>
      
      {showAudit && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-medium mb-2 text-sm">Auditoría (últimos cambios)</h3>
          <div className="max-h-56 overflow-auto text-xs">
            <table className="min-w-full">
              <thead className="text-slate-500">
                <tr>
                  <Th>Fecha</Th>
                  <Th>Entidad</Th>
                  <Th>ID</Th>
                  <Th>Campo</Th>
                  <Th>Antes</Th>
                  <Th>Después</Th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <Td className="whitespace-nowrap">{new Date(a.date).toLocaleTimeString()}</Td>
                    <Td>{a.entity}</Td>
                    <Td>{a.id}</Td>
                    <Td>{a.field}</Td>
                    <Td>{String(a.before)}</Td>
                    <Td>{String(a.after)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

interface ProductRowProps {
  row: ReturnType<typeof buildPricedProductRow>;
  onEditProduct: (sku: string) => void;
  onUpdateProduct: (sku: string, patch: Partial<Product>) => void;
  providerName: (id: string) => string;
  tiers: Array<{ id: number; mult: number; ink_factor: number }>;
}

function ProductRow({ row, onEditProduct, onUpdateProduct, providerName, tiers }: ProductRowProps) {

  return (
    <tr
      className={`border-t border-slate-100 hover:bg-slate-50/70 ${!row.product.active ? "opacity-50" : ""}`}
    >
      <Td>
        <button
          className="text-slate-700 hover:underline"
          onClick={() => onEditProduct(row.product.sku)}
        >
          {row.product.sku}
        </button>
      </Td>
      <Td className="whitespace-nowrap max-w-[180px] truncate" title={row.product.name}>
        {row.product.name}
      </Td>
      <Td>{providerName(row.product.providerId)}</Td>
      <Td>{row.product.category}</Td>
      <Td 
        className={`text-right tabular-nums ${row.product.cost_sqft === 0 ? 'text-red-600 font-semibold' : ''}`} 
        title={row.product.cost_sqft === 0 ? 'Coste = 0 (revisar)' : undefined}
      >
        {row.product.cost_sqft.toFixed(2)}
      </Td>
      <Td>
        <select
          className="bg-transparent border rounded px-1 py-0.5 text-[11px]"
          value={row.product.active_tier}
          onChange={(e) => onUpdateProduct(row.product.sku, { active_tier: Number(e.target.value) })}
        >
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>{t.id}</option>
          ))}
        </select>
      </Td>
      <Td className="text-right tabular-nums" title={`Base per sqft: ${row.activePricing.base_per_sqft.toFixed(2)}`}>
        {row.activePricing.base_total.toFixed(2)}
      </Td>
      <Td className="text-right tabular-nums">
        {row.activePricing.ink_add ? row.activePricing.ink_add.toFixed(2) : "—"}
      </Td>
      <Td className="text-right tabular-nums">
        {row.activePricing.lam_add ? row.activePricing.lam_add.toFixed(2) : "—"}
      </Td>
      <Td className="text-right tabular-nums">
        {row.activePricing.cut_add ? row.activePricing.cut_add.toFixed(2) : "—"}
      </Td>
      <Td className="text-right tabular-nums">{row.activePricing.addons_total.toFixed(2)}</Td>
      <Td className="text-right tabular-nums font-medium">
        {row.finalPrice.toFixed(2)} 
        {row.activePricing.min_applied && <span className="text-amber-600" title="Mínimo aplicado">*</span>}
      </Td>
      <Td className="text-center">{(row.product.min_pvp ?? 0).toFixed(2)}</Td>
      <Td className="text-center">
        <CommitNumberInput
          value={row.product.area_sqft}
          onCommit={(newValue) => onUpdateProduct(row.product.sku, { area_sqft: Math.max(0.01, newValue || 0.01) })}
          step={0.01}
          min={0.01}
          className="w-16 border rounded px-1 py-0.5 text-[11px]"
        />
      </Td>
      <Td>
        <input
          type="checkbox"
          checked={row.product.active}
          onChange={(e) => onUpdateProduct(row.product.sku, { active: e.target.checked })}
        />
      </Td>
    </tr>
  );
}
