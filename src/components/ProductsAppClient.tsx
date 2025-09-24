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

// Components
import { TabButton, LoadingSpinner, Alert, Card } from './ui';
import { ProductsTable } from './ProductsTable';
import { ProductDrawer } from './ProductDrawer';
import { ParamsPanel } from './ParamsPanel';
import { PurchasesPanel } from './PurchasesPanel';
import { ReportsPanel } from './ReportsPanel';

interface ProductsAppClientProps {
  initialData: InitialData;
}

export default function ProductsAppClient({ initialData }: ProductsAppClientProps) {
  // UI State
  const [tab, setTab] = useState<"productos" | "compras" | "parametros" | "reportes">("productos");
  const [query, setQuery] = useState("");
  const [editProduct, setEditProduct] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Loading states
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Data State (initialized from server)
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [tiers, setTiers] = useState<Tier[]>(initialData.tiers);
  const [params, setParams] = useState<PriceParams>(initialData.params);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>(initialData.categoryRules);
  const [providers, setProviders] = useState<Provider[]>(initialData.providers);
  const [audit, setAudit] = useState<AuditEntry[]>(initialData.auditLog);

  // Notification helper
  function showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }

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
      
      showNotification('success', 'Producto actualizado');
    } catch (error) {
      console.error('Failed to update product:', error);
      showNotification('error', 'Error al actualizar producto');
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
      sell_mode: 'SQFT', // Default to SQFT mode
      active: true,
    };

    try {
      const created = await createProduct(newP);
      setProducts(prev => [created, ...prev]);
      setEditProduct(created.sku); // Use the actual generated SKU
      logChange("product", created.sku, "create", undefined, JSON.stringify(created));
      showNotification('success', 'Nuevo producto creado exitosamente');
    } catch (error) {
      console.error('Failed to create product:', error);
      showNotification('error', 'Error al crear el producto');
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
      
      showNotification('success', 'Parámetros actualizados exitosamente');
    } catch (error) {
      console.error('Failed to update params:', error);
      showNotification('error', 'Error al actualizar los parámetros');
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
      
      showNotification('success', 'Tier actualizado exitosamente');
    } catch (error) {
      console.error('Failed to update tier:', error);
      showNotification('error', 'Error al actualizar el tier');
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
      showNotification('success', 'Regla de categoría actualizada exitosamente');
    } catch (error) {
      console.error('Failed to upsert category rule:', error);
      showNotification('error', 'Error al actualizar la regla de categoría');
    }
  }

  async function handleDeleteCategoryRule(category: string) {
    try {
      await deleteCategoryRule(category);
      setCategoryRules(prev => prev.filter(r => r.category !== category));
      logChange("category_rule", category, "delete", "exists", "deleted");
      showNotification('success', 'Regla de categoría eliminada exitosamente');
    } catch (error) {
      console.error('Failed to delete category rule:', error);
      showNotification('error', 'Error al eliminar la regla de categoría');
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

  // Navigation tabs configuration
  const tabs = [
    { 
      id: "productos" as const, 
      label: "Productos", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7" />
        </svg>
      ),
      count: products.length
    },
    { 
      id: "compras" as const, 
      label: "Compras", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    { 
      id: "parametros" as const, 
      label: "Parámetros", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      )
    },
    { 
      id: "reportes" as const, 
      label: "Reportes", 
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img src="/favicon.ico" alt="Productos" className="h-9 w-9 rounded-xl object-cover" />
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Productos GA</h1>
                  <p className="text-sm text-slate-500">Gestión de precios y productos</p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {tabs.map((tabConfig) => (
                <TabButton
                  key={tabConfig.id}
                  active={tab === tabConfig.id}
                  onClick={() => setTab(tabConfig.id)}
                  icon={tabConfig.icon}
                >
                  <span className="hidden xl:inline">{tabConfig.label}</span>
                  <span className="xl:hidden">{tabConfig.label.slice(0, 4)}</span>
                  {tabConfig.count && (
                    <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full ml-1">
                      {tabConfig.count}
                    </span>
                  )}
                </TabButton>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-slate-200 pt-4 animate-slide-up">
              <nav className="grid grid-cols-2 gap-2">
                {tabs.map((tabConfig) => (
                  <TabButton
                    key={tabConfig.id}
                    active={tab === tabConfig.id}
                    onClick={() => {
                      setTab(tabConfig.id);
                      setMobileMenuOpen(false);
                    }}
                    icon={tabConfig.icon}
                  >
                    {tabConfig.label}
                    {tabConfig.count && (
                      <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full ml-1">
                        {tabConfig.count}
                      </span>
                    )}
                  </TabButton>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-slide-in-right">
          <Alert
            type={notification.type}
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="space-y-6">
          {tab === "productos" && (
            <div className="animate-fade-in">
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
            </div>
          )}

          {tab === "compras" && (
            <div className="animate-fade-in">
              <PurchasesPanel
                suppliers={providers}
                products={products}
                onSuppliersChange={setProviders}
                categoryRules={categoryRules}
              />
            </div>
          )}

          {tab === "parametros" && (
            <div className="animate-fade-in">
              <ParamsPanel
                params={params}
                tiers={tiers}
                categoryRules={categoryRules}
                products={products}
                onUpdateParams={handleUpdateParams}
                onUpdateTier={handleUpdateTier}
                onUpsertCategoryRule={handleUpsertCategoryRule}
                onDeleteCategoryRule={handleDeleteCategoryRule}
              />
            </div>
          )}

          {tab === "reportes" && (
            <div className="animate-fade-in">
              <ReportsPanel
                reportData={reportData}
                computedProducts={computedProducts}
              />
            </div>
          )}
        </div>

        {/* Product Drawer */}
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
