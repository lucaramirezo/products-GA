import React, { useState } from 'react';
import type { Product } from '@/lib/pricing/types';
import type { AuditEntry } from '@/server/queries/getInitialData';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { Th, Td } from './ui';
import { CommitNumberInput } from './CommitInputs';

// const CURRENCY = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

interface CostSourceInfo {
  source: 'FACTURA' | 'MANUAL';
  purchase?: {
    id: string;
    invoice_no?: string;
    supplier_name?: string;
    date: string;
    item_name: string;
    quantity: number;
    area_sqft_per_unit: number;
    unit_price: number;
    cost_ft2_line: number;
  };
}

// Helper function to get cost source from audit log
function getCostSource(productSku: string, audit: AuditEntry[]): CostSourceInfo {
  // Find the most recent cost_sqft audit entry for this product
  const lastCostAudit = audit
    .filter(entry => entry.entity === 'products' && entry.id === productSku && entry.field === 'cost_sqft')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!lastCostAudit) {
    return { source: 'MANUAL' };
  }

  // Check if this audit entry has purchase information in the 'after' field
  const afterData = lastCostAudit.after as any;
  if (afterData && typeof afterData === 'object' && afterData.source === 'purchase') {
    return {
      source: 'FACTURA',
      purchase: {
        id: afterData.purchase_id,
        invoice_no: afterData.invoice_no,
        supplier_name: afterData.supplier_name,
        date: lastCostAudit.date,
        item_name: afterData.item_name,
        quantity: afterData.quantity,
        area_sqft_per_unit: afterData.area_sqft_per_unit,
        unit_price: afterData.unit_price,
        cost_ft2_line: afterData.cost_ft2_line
      }
    };
  }

  return { source: 'MANUAL' };
}

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
  tiers: Array<{ id: number; mult: number; number_of_layers: number }>;
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
  const [selectedProductForPurchaseInfo, setSelectedProductForPurchaseInfo] = useState<string | null>(null);

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
              <Th>Modo</Th>
              <Th>Tier</Th>
              <Th className="text-right">Base</Th>
              <Th className="text-right">Ink</Th>
              <Th className="text-right">Lam</Th>
              <Th className="text-right">Cut</Th>
              <Th className="text-right">Add-ons</Th>
              <Th className="text-right">Final</Th>
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
                audit={audit}
                selectedProductForPurchaseInfo={selectedProductForPurchaseInfo}
                onShowPurchaseInfo={setSelectedProductForPurchaseInfo}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Purchase Info Panel */}
      {selectedProductForPurchaseInfo && (() => {
        const selectedProduct = computedProducts.find(p => p.product.sku === selectedProductForPurchaseInfo);
        const costSource = selectedProduct ? getCostSource(selectedProduct.product.sku, audit) : null;
        
        if (!selectedProduct || !costSource?.purchase) return null;
        
        return (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-blue-900">
                Último coste aplicado - {selectedProduct.product.name} ({selectedProduct.product.sku})
              </h4>
              <button
                onClick={() => setSelectedProductForPurchaseInfo(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Factura:</span>
                <div className="text-gray-900">{costSource.purchase.invoice_no || 'S/N'}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Fecha:</span>
                <div className="text-gray-900">{new Date(costSource.purchase.date).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Cantidad:</span>
                <div className="text-gray-900">{costSource.purchase.quantity}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Área por unidad:</span>
                <div className="text-gray-900">{costSource.purchase.area_sqft_per_unit} sq ft</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Precio unitario:</span>
                <div className="text-gray-900">${costSource.purchase.unit_price.toFixed(2)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Costo/ft²:</span>
                <div className="text-gray-900 font-medium">${costSource.purchase.cost_ft2_line.toFixed(4)}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Artículo:</span>
                <div className="text-gray-900">{costSource.purchase.item_name}</div>
              </div>
            </div>
          </div>
        );
      })()}
      
      <p className="text-xs text-slate-500">
        Fórmula: base=(cost_sqft × mult × área) + ink(ink_price×number_of_layers×área) + lam(lam_price×área) + cut(cut_factor×base solo en modo SQFT) → redondeo ↑.
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
  tiers: Array<{ id: number; mult: number; number_of_layers: number }>;
  audit: AuditEntry[];
  selectedProductForPurchaseInfo: string | null;
  onShowPurchaseInfo: (sku: string | null) => void;
}

function ProductRow({ 
  row, 
  onEditProduct, 
  onUpdateProduct, 
  providerName, 
  tiers, 
  audit, 
  selectedProductForPurchaseInfo, 
  onShowPurchaseInfo 
}: ProductRowProps) {
  const costSource = getCostSource(row.product.sku, audit);

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
        <div className="flex items-center justify-end gap-2">
          <span>{row.product.cost_sqft.toFixed(2)}</span>
          <div className="flex items-center gap-1">
            {/* Cost source badge */}
            <span 
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium cursor-help ${
                costSource.source === 'FACTURA' 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={
                costSource.source === 'FACTURA' && costSource.purchase
                  ? `Origen: Factura\nFactura: ${costSource.purchase.invoice_no || 'S/N'}\nFecha: ${new Date(costSource.purchase.date).toLocaleDateString()}\nCosto/ft²: $${costSource.purchase.cost_ft2_line.toFixed(4)}\n\nClick para ver detalles`
                  : 'Origen: Manual'
              }
              onClick={() => {
                if (costSource.source === 'FACTURA' && costSource.purchase) {
                  onShowPurchaseInfo(
                    selectedProductForPurchaseInfo === row.product.sku 
                      ? null 
                      : row.product.sku
                  );
                }
              }}
            >
              {costSource.source}
            </span>
          </div>
        </div>
      </Td>
      <Td>
        <span className={`text-xs px-2 py-1 rounded ${row.product.sell_mode === 'SQFT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {row.product.sell_mode}
        </span>
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
        {row.activePricing.cut_add ? row.activePricing.cut_add.toFixed(2) : 
         (row.product.cut_enabled && row.product.sell_mode === 'SHEET') ? 
         <span className="text-orange-500 text-xs" title="Cutting disabled for SHEET mode">⚠️</span> : "—"}
      </Td>
      <Td className="text-right tabular-nums">{row.activePricing.addons_total.toFixed(2)}</Td>
      <Td className="text-right tabular-nums font-medium">
        {row.finalPrice.toFixed(2)} 
      </Td>
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
