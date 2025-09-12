"use client";

import React, { useState, useMemo } from 'react';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { exportRowsToCsv } from '@/lib/pricing/exportCsv';
import type { Product, Tier, CategoryRule, PriceParams } from '@/lib/pricing/types';
import type { Provider, AuditEntry, InitialData } from '@/server/queries/getInitialData';

// Server actions
import { updateProduct, createProduct } from '@/server/actions/productMutations';
import { updateParams } from '@/server/actions/paramsMutations';
import { updateTier } from '@/server/actions/tiersMutations';
import { upsertCategoryRule, deleteCategoryRule } from '@/server/actions/categoryRulesMutations';
import { simulateImport } from '@/server/actions/providerMutations';

// Components
import { TabButton } from './ui';
import { ProductsTable } from './ProductsTable';
import { ProductDrawer } from './ProductDrawer';
import { ParamsPanel } from './ParamsPanel';
import { ProvidersPanel } from './ProvidersPanel';
import { ReportsPanel } from './ReportsPanel';

interface ProductsAppClientProps {
  initialData: InitialData;
}

export default function ProductsAppClient({ initialData }: ProductsAppClientProps) {
  // UI State
  const [tab, setTab] = useState<"productos" | "proveedores" | "parametros" | "reportes">("productos");
  const [query, setQuery] = useState("");
  const [editProduct, setEditProduct] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Data State (initialized from server)
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [tiers, setTiers] = useState<Tier[]>(initialData.tiers);
  const [params, setParams] = useState<PriceParams>(initialData.params);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>(initialData.categoryRules);
  const [providers, setProviders] = useState<Provider[]>(initialData.providers);
  const [audit, setAudit] = useState<AuditEntry[]>(initialData.auditLog);

  // Helper functions
  function providerName(id: string) {
    return providers.find((p) => p.id === id)?.name ?? "—";
  }

  function logChange(entity: string, id: string, field: string, before: unknown, after: unknown) {
    if (before === after) return;
    setAudit((a) => [
      { entity, id, field, before, after, date: new Date().toISOString(), user: "admin" },
      ...a.slice(0, 199),
    ]);
  }

  // Derived product pricing
  const computedProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(p => 
      q ? [p.sku, p.name, p.category, providerName(p.providerId)].join(' ').toLowerCase().includes(q) : true
    );
    return filtered.map(p => 
      buildPricedProductRow({ 
        product: p, 
        tiers, 
        params, 
        categoryRule: categoryRules.find(c => c.category === p.category) 
      })
    );
  }, [products, query, categoryRules, tiers, params, providerName]);

  // Server action wrappers
  async function handleUpdateProduct(sku: string, patch: Partial<Product>) {
    try {
      const updated = await updateProduct(sku, patch);
      setProducts(prev => prev.map(p => p.sku === sku ? updated : p));
      
      // Log changes locally for immediate UI feedback
      Object.entries(patch).forEach(([field, after]) => {
        const before = products.find(p => p.sku === sku)?.[field as keyof Product];
        logChange("product", sku, field, before, after);
      });
    } catch (error) {
      console.error('Failed to update product:', error);
      // Could add toast notification here
    }
  }

  async function handleCreateProduct() {
    const nextIndex = products.length + 1;
    const sku = `NEW-${String(nextIndex).padStart(3, "0")}`;
    const newP: Product = {
      sku,
      name: "Nuevo producto",
      category: categoryRules[0]?.category || "General",
      providerId: providers[0]?.id || "prov_a",
      cost_sqft: 1,
      area_sqft: 1,
      active_tier: 1,
      ink_enabled: true,
      lam_enabled: false,
      cut_enabled: false,
      active: true,
    };

    try {
      const created = await createProduct(newP);
      setProducts(prev => [created, ...prev]);
      setEditProduct(created.sku); // Use the actual generated SKU
      logChange("product", created.sku, "create", undefined, JSON.stringify(created));
    } catch (error) {
      console.error('Failed to create product:', error);
    }
  }

  async function handleUpdateParams(patch: Partial<PriceParams>) {
    try {
      const updated = await updateParams(patch);
      setParams(updated);
      
      // Log changes locally
      Object.entries(patch).forEach(([field, after]) => {
        const before = params[field as keyof PriceParams];
        logChange("params", "1", field, before, after);
      });
    } catch (error) {
      console.error('Failed to update params:', error);
    }
  }

  async function handleUpdateTier(id: number, patch: Partial<Tier>) {
    try {
      const updated = await updateTier(id, patch);
      setTiers(prev => prev.map(t => t.id === id ? updated : t));
      
      // Log changes locally
      Object.entries(patch).forEach(([field, after]) => {
        const before = tiers.find(t => t.id === id)?.[field as keyof Tier];
        logChange("tier", id.toString(), field, before, after);
      });
    } catch (error) {
      console.error('Failed to update tier:', error);
    }
  }

  async function handleUpsertCategoryRule(rule: CategoryRule) {
    try {
      const updated = await upsertCategoryRule(rule);
      setCategoryRules(prev => {
        const existing = prev.find(r => r.category === rule.category);
        if (existing) {
          return prev.map(r => r.category === rule.category ? updated : r);
        } else {
          return [...prev, updated];
        }
      });
      
      logChange("category_rule", rule.category, "upsert", null, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to upsert category rule:', error);
    }
  }

  async function handleDeleteCategoryRule(category: string) {
    try {
      await deleteCategoryRule(category);
      setCategoryRules(prev => prev.filter(r => r.category !== category));
      logChange("category_rule", category, "delete", "exists", "deleted");
    } catch (error) {
      console.error('Failed to delete category rule:', error);
    }
  }

  async function handleSimulateImport(providerId: string) {
    try {
      const result = await simulateImport(providerId);
      
      // Update provider
      setProviders(prev => prev.map(p => p.id === providerId ? result.provider : p));
      
      // Refresh products from server (since costs were updated)
      // For now, we'll just trigger a page refresh in the background
      // TODO: Could implement a more sophisticated sync mechanism
      
      logChange("provider", providerId, "simulate_import", null, `Affected ${result.affectedProducts} products`);
    } catch (error) {
      console.error('Failed to simulate import:', error);
    }
  }

  function exportCSV(full = false) { 
    exportRowsToCsv(computedProducts, products, providerName, full); 
  }

  // Reports data
  const reportData = useMemo(() => {
    const byTier: Record<number, { sum: number; count: number }> = {};
    
    computedProducts.forEach((r) => {
      const t = r.product.active_tier;
      byTier[t] = byTier[t] || { sum: 0, count: 0 };
      byTier[t].sum += r.margin;
      byTier[t].count += 1;
    });
    
    const avgPerTier = tiers.map((t) => ({
      tier: t.id,
      avg: byTier[t.id] ? byTier[t.id].sum / byTier[t.id].count : 0,
    }));
    
    const topCostChanges = audit
      .filter((a) => a.field === "cost_sqft" && typeof a.after === 'number' && typeof a.before === 'number')
      .slice(0, 5)
      .map((a) => ({ ...a, diff: (a.after as number - (a.before as number)).toFixed(3) }));
    
    return { avgPerTier, topCostChanges };
  }, [computedProducts, tiers, audit]);

  // Current product for editing
  const currentProduct = products.find((p) => p.sku === editProduct) || null;
  const currentComputed = computedProducts.find((r) => r.product.sku === editProduct) || null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">P</div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Productos (DB-Powered)</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Pricing tiers & overrides</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <TabButton active={tab === "productos"} onClick={() => setTab("productos")}>Productos</TabButton>
            <TabButton active={tab === "proveedores"} onClick={() => setTab("proveedores")}>Proveedores</TabButton>
            <TabButton active={tab === "parametros"} onClick={() => setTab("parametros")}>Parámetros</TabButton>
            <TabButton active={tab === "reportes"} onClick={() => setTab("reportes")}>Reportes</TabButton>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">
        {tab === "productos" && (
          <ProductsTable
            computedProducts={computedProducts}
            query={query}
            onQueryChange={setQuery}
            showAudit={showAudit}
            onToggleAudit={() => setShowAudit(s => !s)}
            onExportCSV={exportCSV}
            onCreateProduct={handleCreateProduct}
            onEditProduct={setEditProduct}
            onUpdateProduct={handleUpdateProduct}
            providerName={providerName}
            audit={audit}
            tiers={tiers}
          />
        )}

        {tab === "proveedores" && (
          <ProvidersPanel
            providers={providers}
            onSimulateImport={handleSimulateImport}
          />
        )}

        {tab === "parametros" && (
          <ParamsPanel
            params={params}
            tiers={tiers}
            categoryRules={categoryRules}
            onUpdateParams={handleUpdateParams}
            onUpdateTier={handleUpdateTier}
            onUpsertCategoryRule={handleUpsertCategoryRule}
            onDeleteCategoryRule={handleDeleteCategoryRule}
          />
        )}

        {tab === "reportes" && (
          <ReportsPanel
            reportData={reportData}
            computedProducts={computedProducts}
          />
        )}

        {editProduct && currentProduct && currentComputed && (
          <ProductDrawer
            product={currentProduct}
            computed={currentComputed}
            providers={providers}
            categoryRules={categoryRules}
            tiers={tiers}
            onClose={() => setEditProduct(null)}
            onUpdate={handleUpdateProduct}
          />
        )}
      </main>
    </div>
  );
}
