import React from 'react';
import type { Provider } from '@/server/queries/getInitialData';

interface ProvidersPanelProps {
  providers: Provider[];
  onSimulateImport: (providerId: string) => void;
}

export function ProvidersPanel({ providers, onSimulateImport }: ProvidersPanelProps) {
  return (
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
                onClick={() => onSimulateImport(prov.id)}
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
  );
}
