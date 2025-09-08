"use client";

// PRD functional mockup with extracted pricing engine (v1.2)

import React, { useMemo, useState } from "react";
import { buildPricedProductRow } from '@/lib/pricing/row';
import { exportRowsToCsv } from '@/lib/pricing/exportCsv';
import type { Product, Tier, CategoryRule, PriceParams as GlobalParams } from '@/lib/pricing/types';

// Local only (non-pricing) types
type Provider = { id: string; name: string; lastUpdate?: string };
type AuditEntry = { entity:string; id:string; field:string; before:any; after:any; date:string; user:string };

// Using extracted pricing engine only

// --- Helpers ------------------------------------------------------------
const CURRENCY = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

// Legacy override helper removed (now inferred from effective sources)

export default function ProductsApp() {
  // UI State
  const [tab, setTab] = useState<"productos" | "proveedores" | "parametros" | "reportes">("productos");
  const [query, setQuery] = useState("");
  const [editProduct, setEditProduct] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Data (mock)
  const [providers, setProviders] = useState<Provider[]>([
    { id: "prov_a", name: "Proveedor A", lastUpdate: new Date().toISOString() },
    { id: "prov_b", name: "Proveedor B", lastUpdate: new Date().toISOString() },
  ]);

  const [tiers, setTiers] = useState<Tier[]>([
    { id: 1, mult: 3.5, ink_factor: 1 },
    { id: 2, mult: 4.0, ink_factor: 1 },
    { id: 3, mult: 4.3, ink_factor: 2 },
    { id: 4, mult: 4.5, ink_factor: 2 },
    { id: 5, mult: 5.0, ink_factor: 2 },
  ]);

  const [params, setParams] = useState<GlobalParams>({
    ink_price: 0.55,
    lamination_price: 0,
    cut_price: 0,
    cut_unit: "per_sqft",
    rounding_step: 0.05,
    min_pvp_global: 0,
    cost_method: "latest",
  });

  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([
  { category: "LargeFormat", min_pvp: 6 },
  { category: "Stickers", override_multiplier: 4.2, override_ink_factor: 2, min_pvp: 2 },
  ]);

  const [products, setProducts] = useState<Product[]>([
    {
      sku: "SKU-001",
      name: "Vinyl Banner 1m²",
      category: "LargeFormat",
      providerId: "prov_a",
      cost_sqft: 2.1,
      area_sqft: 1,
      active_tier: 1,
      min_pvp: 5,
      ink_enabled: true,
      lam_enabled: false,
      cut_enabled: false,
      active: true,
    },
    {
      sku: "SKU-002",
      name: "Sticker Pack (10u)",
      category: "Stickers",
      providerId: "prov_b",
      cost_sqft: 0.9,
      area_sqft: 1,
      active_tier: 2,
      override_multiplier: 4.6,
      override_ink_factor: 2,
      ink_enabled: true,
      lam_enabled: false,
      cut_enabled: true,
      active: true,
    },
    {
      sku: "SKU-003",
      name: "Canvas Print",
      category: "LargeFormat",
      providerId: "prov_a",
      cost_sqft: 3.4,
      area_sqft: 1,
      active_tier: 3,
      ink_enabled: true,
      active: true,
    },
    {
      sku: "SKU-004",
      name: "Poster A3",
      category: "LargeFormat",
      providerId: "prov_b",
      cost_sqft: 1.15,
      area_sqft: 1,
      active_tier: 1,
      ink_enabled: true,
      active: false,
    },
  ]);

  const [audit, setAudit] = useState<AuditEntry[]>([]);

  function providerName(id: string) {
    return providers.find((p) => p.id === id)?.name ?? "—";
  }

  // Simulate provider cost perturbation
  function simulateImport(providerId: string) {
    const factor = 1 + (Math.random() * 0.18 - 0.06);
    setProducts((prev) =>
      prev.map((p) =>
        p.providerId === providerId
          ? { ...p, cost_sqft: Number((p.cost_sqft * factor).toFixed(3)) }
          : p
      )
    );
    setProviders((prev) =>
      prev.map((pr) => (pr.id === providerId ? { ...pr, lastUpdate: new Date().toISOString() } : pr))
    );
  }

  function logChange(entity: string, id: string, field: string, before: any, after: any) {
    if (before === after) return;
    setAudit((a) => [
      { entity, id, field, before, after, date: new Date().toISOString(), user: "admin" },
      ...a.slice(0, 199),
    ]);
  }

  // Derived product pricing
  const computedProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(p => q ? [p.sku,p.name,p.category,providerName(p.providerId)].join(' ').toLowerCase().includes(q) : true)
      .map(p => buildPricedProductRow({ product: p, tiers, params: params as any, categoryRule: categoryRules.find(c=>c.category===p.category) }));
  }, [products, query, categoryRules, tiers, params]);

  function exportCSV(full = false) { exportRowsToCsv(computedProducts as any, products as any, providerName, full); }

  // Reports (average margin by active tier & top cost changes from audit)
  const reportData = useMemo(() => {
    const byTier: Record<number, { sum: number; count: number }> = {} as any;
    const minApplied: Array<{ sku: string; name: string; diff: number }> = [];
    computedProducts.forEach((r) => {
      const t = r.product.active_tier;
      byTier[t] = byTier[t] || { sum: 0, count: 0 };
      byTier[t].sum += r.margin;
      byTier[t].count += 1;
      if (r.activePricing.min_applied) {
        minApplied.push({
          sku: r.product.sku,
            name: r.product.name,
            diff: Number((r.activePricing.min_total - r.activePricing.pvp_raw).toFixed(2)),
        });
      }
    });
    const avgPerTier = tiers.map((t) => ({
      tier: t.id,
      avg: byTier[t.id] ? byTier[t.id].sum / byTier[t.id].count : 0,
    }));
    minApplied.sort((a, b) => b.diff - a.diff);
    const topCostChanges = audit
      .filter((a) => a.field === "cost_sqft")
      .slice(0, 5)
      .map((a) => ({ ...a, diff: (a.after - a.before).toFixed(3) }));
    return { avgPerTier, topCostChanges, minApplied: minApplied.slice(0, 5) };
  }, [computedProducts, tiers, audit]);

  // Editing logic
  const currentProduct = products.find((p) => p.sku === editProduct) || null;
  const currentComputed = computedProducts.find((r) => r.product.sku === editProduct) || null;

  function updateProduct(sku: string, patch: Partial<Product>) {
    setProducts((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, ...patch } : p))
    );
    Object.entries(patch).forEach(([field, after]) => {
      const before = (products.find((p) => p.sku === sku) as any)?.[field];
      logChange("product", sku, field, before, after);
    });
  }

  function addNewProduct() {
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
    setProducts((prev) => [newP, ...prev]);
    setEditProduct(sku);
    logChange("product", sku, "create", undefined, JSON.stringify(newP));
  }

  // UI ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">P</div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Productos (Mock PRD)</h1>
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
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Buscar SKU, nombre, categoría o proveedor…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => exportCSV(false)}
                  className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => exportCSV(true)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Exportar Full
                </button>
                <button
                  onClick={() => setShowAudit((s) => !s)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {showAudit ? "Ocultar" : "Ver"} auditoría
                </button>
                <button
                  onClick={addNewProduct}
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
                    <tr
                      key={row.product.sku}
                      className={`border-t border-slate-100 hover:bg-slate-50/70 ${!row.product.active ? "opacity-50" : ""}`}
                    >
                      <Td>
                        <button
                          className="text-slate-700 hover:underline"
                          onClick={() => setEditProduct(row.product.sku)}
                        >
                          {row.product.sku}
                        </button>
                      </Td>
                      <Td className="whitespace-nowrap max-w-[180px] truncate" title={row.product.name}>{row.product.name}</Td>
                      <Td>{providerName(row.product.providerId)}</Td>
                      <Td>{row.product.category}</Td>
                      <Td className={`text-right tabular-nums ${row.product.cost_sqft === 0 ? 'text-red-600 font-semibold' : ''}`} title={row.product.cost_sqft === 0 ? 'Coste = 0 (revisar)' : undefined}>{row.product.cost_sqft.toFixed(2)}</Td>
                      <Td>
                        <select
                          className="bg-transparent border rounded px-1 py-0.5 text-[11px]"
                          value={row.product.active_tier}
                          onChange={(e) => updateProduct(row.product.sku, { active_tier: Number(e.target.value) as any })}
                        >
                          {tiers.map((t) => (
                            <option key={t.id} value={t.id}>{t.id}</option>
                          ))}
                        </select>
                      </Td>
                      <Td className="text-right tabular-nums" title={`Base per sqft: ${row.activePricing.base_per_sqft.toFixed(2)}`}>{row.activePricing.base_total.toFixed(2)}</Td>
                      <Td className="text-right tabular-nums">{row.activePricing.ink_add ? row.activePricing.ink_add.toFixed(2) : "—"}</Td>
                      <Td className="text-right tabular-nums">{row.activePricing.lam_add ? row.activePricing.lam_add.toFixed(2) : "—"}</Td>
                      <Td className="text-right tabular-nums">{row.activePricing.cut_add ? row.activePricing.cut_add.toFixed(2) : "—"}</Td>
                      <Td className="text-right tabular-nums">{row.activePricing.addons_total.toFixed(2)}</Td>
                      <Td className="text-right tabular-nums font-medium">
                        {row.finalPrice.toFixed(2)} {row.activePricing.min_applied && <span className="text-amber-600" title="Mínimo aplicado">*</span>}
                      </Td>
                      <Td className="text-center">{(row.product.min_pvp ?? 0).toFixed(2)}</Td>
                      <Td className="text-center">
                        <input
                          type="number"
                          className="w-16 border rounded px-1 py-0.5 text-[11px]"
                          value={row.product.area_sqft}
                          onChange={(e) => updateProduct(row.product.sku, { area_sqft: Math.max(0.01, Number(e.target.value)) })}
                        />
                      </Td>
                      <Td>
                        <input
                          type="checkbox"
                          checked={row.product.active}
                          onChange={(e) => updateProduct(row.product.sku, { active: e.target.checked })}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Fórmula: base=(cost_sqft × mult × área) + ink(ink_price×ink_factor×área opcional) + lam(lam_price×área) + cut(depende unidad) → aplica mínimo (min_per_ft² × área) → redondeo ↑ {params.rounding_step}.
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
        )}

        {tab === "proveedores" && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((prov) => (
                <div key={prov.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{prov.name}</h3>
                    <span className="text-[10px] text-slate-500">
                      {prov.lastUpdate ? new Date(prov.lastUpdate).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs hover:bg-slate-800"
                      onClick={() => simulateImport(prov.id)}
                    >
                      Simular import
                    </button>
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50"
                      onClick={() => alert("Conectar API proveedor: fase futura")}
                    >
                      Conectar API
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Cambios simulados recalculan PVP instantáneamente.
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "parametros" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ParamInput
                label="Ink (€/ft²)"
                value={params.ink_price}
                onChange={(v) => setParams((p) => ({ ...p, ink_price: v }))}
              />
              <ParamInput
                label="Lamination (€/ft²)"
                value={params.lamination_price}
                onChange={(v) => setParams((p) => ({ ...p, lamination_price: v }))}
              />
              <ParamInput
                label={`Cut (${params.cut_unit === "per_sqft" ? "€/ft²" : "€/sheet"})`}
                value={params.cut_price}
                onChange={(v) => setParams((p) => ({ ...p, cut_price: v }))}
              />
              <ParamInput
                label="Rounding step (€)"
                value={params.rounding_step}
                step={0.01}
                onChange={(v) => setParams((p) => ({ ...p, rounding_step: v }))}
              />
              <ParamInput
                label="Min PVP global (ft²)"
                value={params.min_pvp_global ?? 0}
                onChange={(v) => setParams((p) => ({ ...p, min_pvp_global: v }))}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Cost method</label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  value={params.cost_method}
                  onChange={(e) => setParams((p) => ({ ...p, cost_method: e.target.value }))}
                >
                  <option value="latest">Latest (MVP)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Cut unit</label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  value={params.cut_unit}
                  onChange={(e) => setParams((p) => ({ ...p, cut_unit: e.target.value as any }))}
                >
                  <option value="per_sqft">per_sqft</option>
                  <option value="per_sheet">per_sheet</option>
                </select>
              </div>
            </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-medium text-sm mb-3">Tiers</h3>
              <div className="space-y-3">
                {tiers.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold">Tier {t.id}</span>
                    <label className="flex items-center gap-1">
                      <span>Mult</span>
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-300 px-2 py-1"
                        step={0.1}
                        value={t.mult}
                        onChange={(e) =>
                          setTiers((prev) =>
                            prev.map((x) => (x.id === t.id ? { ...x, mult: Number(e.target.value) } : x))
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Ink×</span>
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-300 px-2 py-1"
                        step={1}
                        value={t.ink_factor}
                        onChange={(e) =>
                          setTiers((prev) =>
                            prev.map((x) => (x.id === t.id ? { ...x, ink_factor: Number(e.target.value) } : x))
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-medium text-sm mb-2">Reglas por categoría</h3>
              <div className="space-y-3 text-xs">
                {categoryRules.map((r) => (
                  <div key={r.category} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold min-w-28">{r.category}</span>
                    <label className="flex items-center gap-1">
                      <span>Min</span>
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-300 px-2 py-1"
                        value={r.min_pvp ?? 0}
                        onChange={(e) =>
                          setCategoryRules((prev) =>
                            prev.map((x) =>
                              x.category === r.category ? { ...x, min_pvp: Number(e.target.value) } : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Ovr Mult</span>
                      <input
                        type="number"
                        className="w-20 rounded border border-slate-300 px-2 py-1"
                        value={r.override_multiplier ?? 0}
                        onChange={(e) =>
                          setCategoryRules((prev) =>
                            prev.map((x) =>
                              x.category === r.category
                                ? { ...x, override_multiplier: Number(e.target.value) || undefined }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span>Ovr Ink×</span>
                      <input
                        type="number"
                        className="w-16 rounded border border-slate-300 px-2 py-1"
                        value={r.override_ink_factor ?? 0}
                        onChange={(e) =>
                          setCategoryRules((prev) =>
                            prev.map((x) =>
                              x.category === r.category
                                ? { ...x, override_ink_factor: Number(e.target.value) || undefined }
                                : x
                            )
                          )
                        }
                      />
                    </label>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setCategoryRules((prev) => prev.filter((x) => x.category !== r.category))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <AddCategoryForm
                  onAdd={(cat) =>
                    setCategoryRules((prev) =>
                      prev.some((x) => x.category === cat)
                        ? prev
                        : [...prev, { category: cat }]
                    )
                  }
                />
              </div>
            </div>
          </section>
        )}

        {tab === "reportes" && (
          <section className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {reportData.avgPerTier.map((r) => (
                <KPI key={r.tier} label={`Tier ${r.tier} avg margin`} value={`${(r.avg * 100).toFixed(1)}%`} />
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-medium text-sm mb-2">Cambios de coste recientes</h3>
              <table className="text-xs w-full">
                <thead className="text-slate-500">
                  <tr>
                    <Th>Hora</Th>
                    <Th>SKU</Th>
                    <Th>Antes</Th>
                    <Th>Después</Th>
                    <Th>Δ</Th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topCostChanges.map((c, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <Td>{new Date(c.date).toLocaleTimeString()}</Td>
                      <Td>{c.id}</Td>
                      <Td>{c.before}</Td>
                      <Td>{c.after}</Td>
                      <Td>{c.diff}</Td>
                    </tr>
                  ))}
                  {!reportData.topCostChanges.length && (
                    <tr>
                      <Td colSpan={5} className="text-center text-slate-500 py-4">Sin cambios registrados</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-medium text-sm mb-2">Top mínimos aplicados</h3>
              <table className="text-xs w-full">
                <thead className="text-slate-500">
                  <tr>
                    <Th>SKU</Th>
                    <Th>Producto</Th>
                    <Th>Diff (€)</Th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.minApplied.map((m) => (
                    <tr key={m.sku} className="border-t border-slate-100">
                      <Td>{m.sku}</Td>
                      <Td>{m.name}</Td>
                      <Td>{m.diff.toFixed(2)}</Td>
                    </tr>
                  ))}
                  {!reportData.minApplied.length && (
                    <tr>
                      <Td colSpan={3} className="text-center text-slate-500 py-4">Sin mínimos aplicados</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Product drawer */}
      {currentProduct && (
        <div className="fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditProduct(null)} />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Editar producto</h3>
              <button className="text-slate-500 hover:text-slate-900" onClick={() => setEditProduct(null)}>✕</button>
            </div>
            <div className="space-y-4 text-sm">
              <Field label="SKU"><span className="font-mono">{currentProduct.sku}</span></Field>
              <Field label="Nombre">
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={currentProduct.name}
                  onChange={(e) => updateProduct(currentProduct.sku, { name: e.target.value })}
                />
              </Field>
              <Field label="Cost (ft²)">
                <input
                  type="number"
                  step={0.01}
                  className="w-32 rounded border border-slate-300 px-3 py-2"
                  value={currentProduct.cost_sqft}
                  onChange={(e) => updateProduct(currentProduct.sku, { cost_sqft: Number(e.target.value) })}
                />
              </Field>
              <Field label="Area (ft²)">
                <input
                  type="number"
                  step={0.01}
                  className="w-32 rounded border border-slate-300 px-3 py-2"
                  value={currentProduct.area_sqft}
                  onChange={(e) => updateProduct(currentProduct.sku, { area_sqft: Math.max(0.01, Number(e.target.value)) })}
                />
              </Field>
              <Field label="Min PVP">
                <input
                  type="number"
                  step={0.1}
                  className="w-32 rounded border border-slate-300 px-3 py-2"
                  value={currentProduct.min_pvp ?? 0}
                  onChange={(e) =>
                    updateProduct(currentProduct.sku, {
                      min_pvp: Number(e.target.value) || undefined,
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Ink on?">
                  <input
                    type="checkbox"
                    checked={currentProduct.ink_enabled ?? false}
                    onChange={(e) => updateProduct(currentProduct.sku, { ink_enabled: e.target.checked })}
                  />
                </Field>
                <Field label="Lam on?">
                  <input
                    type="checkbox"
                    checked={currentProduct.lam_enabled ?? false}
                    onChange={(e) => updateProduct(currentProduct.sku, { lam_enabled: e.target.checked })}
                  />
                </Field>
                <Field label="Cut on?">
                  <input
                    type="checkbox"
                    checked={currentProduct.cut_enabled ?? false}
                    onChange={(e) => updateProduct(currentProduct.sku, { cut_enabled: e.target.checked })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Override Mult">
                  <input
                    type="number"
                    step={0.1}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={currentProduct.override_multiplier ?? ""}
                    onChange={(e) =>
                      updateProduct(currentProduct.sku, {
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
                    value={currentProduct.override_ink_factor ?? ""}
                    onChange={(e) =>
                      updateProduct(currentProduct.sku, {
                        override_ink_factor: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Activo">
                <input
                  type="checkbox"
                  checked={currentProduct.active}
                  onChange={(e) => updateProduct(currentProduct.sku, { active: e.target.checked })}
                />
              </Field>
              {currentComputed && (
                <div className="rounded border border-slate-200 p-3 text-xs bg-slate-50">
                  <div className="font-medium mb-1">Preview</div>
                  <div className="space-y-1">
                    <div>Base: {currentComputed.activePricing.base_total.toFixed(2)}</div>
                    <div>Add-ons: {currentComputed.activePricing.addons_total.toFixed(2)} (Ink {currentComputed.activePricing.ink_add.toFixed(2)} / Lam {currentComputed.activePricing.lam_add.toFixed(2)} / Cut {currentComputed.activePricing.cut_add.toFixed(2)})</div>
                    <div>Mínimo total: {currentComputed.activePricing.min_total.toFixed(2)}</div>
                    <div>Final: {CURRENCY(currentComputed.finalPrice)} ({currentComputed.finalSource}) {currentComputed.activePricing.min_applied && "*mín"}</div>
                    <div className="flex flex-wrap gap-1">
                      {currentComputed.tiersPreview.map((tp) => (
                        <span key={tp.tier} className={`px-2 py-0.5 rounded bg-white border text-[10px] ${tp.tier === currentProduct.active_tier ? "border-slate-500" : "border-slate-200"}`}>
                          T{tp.tier}:{tp.final.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-10 pb-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} — Functional mockup (PRD v1.2). No production guarantees.
      </footer>
    </div>
  );
}

// --- Reusable UI bits --------------------------------------------------
function TabButton({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm border ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left font-medium uppercase tracking-wide text-[10px] md:text-[11px] px-4 py-2 ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "", colSpan, title }: { children: React.ReactNode; className?: string; colSpan?: number; title?: string }) {
  return (
    <td colSpan={colSpan} title={title} className={`px-4 py-2 align-middle ${className}`}>
      {children}
    </td>
  );
}
function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-lg md:text-xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-600 space-y-1">
      <span>{label}</span>
      <div className="text-slate-900 font-normal">{children}</div>
    </label>
  );
}
function ParamInput({ label, value, onChange, step = 0.01 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="text-xs font-medium text-slate-600 space-y-1">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
      />
    </label>
  );
}
function AddCategoryForm({ onAdd }: { onAdd: (cat: string) => void }) {
  const [cat, setCat] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
        placeholder="Nueva categoría"
        value={cat}
        onChange={(e) => setCat(e.target.value)}
      />
      <button
        className="rounded bg-slate-900 text-white px-3 py-1 text-xs"
        onClick={() => {
          if (!cat.trim()) return;
          onAdd(cat.trim());
          setCat("");
        }}
      >
        Añadir
      </button>
    </div>
  );
}

