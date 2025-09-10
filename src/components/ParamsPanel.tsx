import React from 'react';
import type { PriceParams, Tier, CategoryRule } from '@/lib/pricing/types';
import { ParamInput, AddCategoryForm } from './ui';
import { CommitNumberInput } from './CommitInputs';

interface ParamsPanelProps {
  params: PriceParams;
  tiers: Tier[];
  categoryRules: CategoryRule[];
  onUpdateParams: (patch: Partial<PriceParams>) => void;
  onUpdateTier: (id: number, patch: Partial<Tier>) => void;
  onUpsertCategoryRule: (rule: CategoryRule) => void;
  onDeleteCategoryRule: (category: string) => void;
}

export function ParamsPanel({
  params,
  tiers,
  categoryRules,
  onUpdateParams,
  onUpdateTier,
  onUpsertCategoryRule,
  onDeleteCategoryRule
}: ParamsPanelProps) {
  const handleCategoryRuleUpdate = (category: string, field: keyof CategoryRule, value: number | undefined) => {
    const existingRule = categoryRules.find(r => r.category === category);
    const updatedRule = existingRule ? { ...existingRule, [field]: value } : { category, [field]: value };
    onUpsertCategoryRule(updatedRule);
  };

  const handleAddCategory = (cat: string) => {
    const exists = categoryRules.some(x => x.category === cat);
    if (!exists) {
      onUpsertCategoryRule({ category: cat });
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ParamInput
          label="Ink (€/ft²)"
          value={params.ink_price}
          onChange={(v) => onUpdateParams({ ink_price: v })}
        />
        <ParamInput
          label="Lamination (€/ft²)"
          value={params.lamination_price}
          onChange={(v) => onUpdateParams({ lamination_price: v })}
        />
        <ParamInput
          label={`Cut (${params.cut_unit === "per_sqft" ? "€/ft²" : "€/sheet"})`}
          value={params.cut_price}
          onChange={(v) => onUpdateParams({ cut_price: v })}
        />
        <ParamInput
          label="Rounding step (€)"
          value={params.rounding_step}
          step={0.01}
          onChange={(v) => onUpdateParams({ rounding_step: v })}
        />
        <ParamInput
          label="Min PVP global (ft²)"
          value={params.min_pvp_global ?? 0}
          onChange={(v) => onUpdateParams({ min_pvp_global: v })}
        />
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Cost method</label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            value={params.cost_method}
            onChange={(e) => onUpdateParams({ cost_method: e.target.value as "latest" })}
          >
            <option value="latest">Latest (MVP)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Cut unit</label>
          <select
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            value={params.cut_unit}
            onChange={(e) => onUpdateParams({ cut_unit: e.target.value as 'per_sqft' | 'per_sheet' })}
          >
            <option value="per_sqft">per_sqft</option>
            <option value="per_sheet">per_sheet</option>
          </select>
        </div>
      </div>

      {/* Tiers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-sm mb-2">Tiers (mult × ink factor)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {tiers.map((t) => (
            <div key={t.id} className="border rounded p-3 space-y-2">
              <h4 className="font-semibold">Tier {t.id}</h4>
              <label className="block">
                <span>Multiplier</span>
                <CommitNumberInput
                  value={t.mult}
                  onCommit={(newValue) => onUpdateTier(t.id, { mult: newValue || 0 })}
                  step={0.1}
                  min={0}
                  className="w-full rounded border border-slate-300 px-2 py-1 mt-1"
                />
              </label>
              <label className="block">
                <span>Ink Factor</span>
                <CommitNumberInput
                  value={t.ink_factor}
                  onCommit={(newValue) => onUpdateTier(t.id, { ink_factor: newValue || 0 })}
                  step={1}
                  min={0}
                  className="w-full rounded border border-slate-300 px-2 py-1 mt-1"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Category Rules */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-medium text-sm mb-2">Reglas por categoría</h3>
        <div className="space-y-3 text-xs">
          {categoryRules.map((r) => (
            <div key={r.category} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold min-w-28">{r.category}</span>
              <label className="flex items-center gap-1">
                <span>Min</span>
                <CommitNumberInput
                  value={r.min_pvp}
                  onCommit={(newValue) => handleCategoryRuleUpdate(r.category, 'min_pvp', newValue || undefined)}
                  step={0.1}
                  min={0}
                  className="w-20 rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>Ovr Mult</span>
                <CommitNumberInput
                  value={r.override_multiplier}
                  onCommit={(newValue) => handleCategoryRuleUpdate(r.category, 'override_multiplier', newValue || undefined)}
                  step={0.1}
                  min={0}
                  className="w-20 rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-1">
                <span>Ovr Ink×</span>
                <CommitNumberInput
                  value={r.override_ink_factor}
                  onCommit={(newValue) => handleCategoryRuleUpdate(r.category, 'override_ink_factor', newValue || undefined)}
                  step={1}
                  min={0}
                  className="w-16 rounded border border-slate-300 px-2 py-1"
                />
              </label>
              <button
                className="text-red-600 hover:underline"
                onClick={() => onDeleteCategoryRule(r.category)}
              >
                ✕
              </button>
            </div>
          ))}
          <AddCategoryForm onAdd={handleAddCategory} />
        </div>
      </div>
    </section>
  );
}
