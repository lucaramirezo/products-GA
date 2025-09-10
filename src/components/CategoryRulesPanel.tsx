import React from 'react';
import type { CategoryRule } from '@/lib/pricing/types';
import { AddCategoryForm } from './ui';
import { CommitNumberInput } from './CommitInputs';

interface CategoryRulesPanelProps {
  categoryRules: CategoryRule[];
  onUpsertCategoryRule: (rule: CategoryRule) => void;
  onDeleteCategoryRule: (category: string) => void;
}

export function CategoryRulesPanel({ categoryRules, onUpsertCategoryRule, onDeleteCategoryRule }: CategoryRulesPanelProps) {
  return (
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
                onCommit={(newValue) => onUpsertCategoryRule({ ...r, min_pvp: newValue || undefined })}
                step={0.1}
                min={0}
                className="w-20 rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1">
              <span>Ovr Mult</span>
              <CommitNumberInput
                value={r.override_multiplier}
                onCommit={(newValue) => onUpsertCategoryRule({ ...r, override_multiplier: newValue || undefined })}
                step={0.1}
                min={0}
                className="w-20 rounded border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1">
              <span>Ovr Ink×</span>
              <CommitNumberInput
                value={r.override_ink_factor}
                onCommit={(newValue) => onUpsertCategoryRule({ ...r, override_ink_factor: newValue || undefined })}
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
        <AddCategoryForm
          onAdd={(cat) =>
            onUpsertCategoryRule({ category: cat })
          }
        />
      </div>
    </div>
  );
}
