import React from 'react';
import type { Tier } from '@/lib/pricing/types';

interface TiersPanelProps {
  tiers: Tier[];
  onUpdateTier: (id: number, patch: Partial<Tier>) => void;
}

export function TiersPanel({ tiers, onUpdateTier }: TiersPanelProps) {
  return (
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
                onChange={(e) => onUpdateTier(t.id, { mult: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-1">
              <span>Ink×</span>
              <input
                type="number"
                className="w-20 rounded border border-slate-300 px-2 py-1"
                step={1}
                value={t.ink_factor}
                onChange={(e) => onUpdateTier(t.id, { ink_factor: Number(e.target.value) })}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
