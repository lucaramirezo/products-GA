import React from 'react';
import { buildPricedProductRow } from '@/lib/pricing/row';
import { KPI, Th, Td } from './ui';

interface ReportData {
  avgPerTier: Array<{ tier: number; avg: number }>;
  topCostChanges: Array<{
    entity: string;
    id: string;
    field: string;
    before: unknown;
    after: unknown;
    date: string;
    user: string;
    diff: string;
  }>;
}

interface ReportsPanelProps {
  reportData: ReportData;
  computedProducts: ReturnType<typeof buildPricedProductRow>[];
}

export function ReportsPanel({ reportData }: ReportsPanelProps) {
  return (
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
                <Td>{String(c.before)}</Td>
                <Td>{String(c.after)}</Td>
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
    </section>
  );
}
