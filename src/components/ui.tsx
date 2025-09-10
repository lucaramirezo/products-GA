import React from 'react';
import { CommitNumberInput } from './CommitInputs';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

interface ThProps {
  children: React.ReactNode;
  className?: string;
}

export function Th({ children, className = "" }: ThProps) {
  return (
    <th className={`text-left font-medium uppercase tracking-wide text-[10px] md:text-[11px] px-4 py-2 ${className}`}>
      {children}
    </th>
  );
}

interface TdProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  title?: string;
}

export function Td({ children, className = "", colSpan, title }: TdProps) {
  return (
    <td colSpan={colSpan} title={title} className={`px-4 py-2 align-middle ${className}`}>
      {children}
    </td>
  );
}

interface KPIProps {
  label: string;
  value: string;
  sub?: string;
}

export function KPI({ label, value, sub }: KPIProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-lg md:text-xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-600 space-y-1">
      <span>{label}</span>
      <div className="text-slate-900 font-normal">{children}</div>
    </label>
  );
}

interface ParamInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}

export function ParamInput({ label, value, onChange, step = 0.01 }: ParamInputProps) {
  return (
    <label className="text-xs font-medium text-slate-600 space-y-1">
      <span>{label}</span>
      <CommitNumberInput
        value={value}
        onCommit={(newValue) => onChange(newValue || 0)}
        step={step}
        min={0}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
      />
    </label>
  );
}

interface AddCategoryFormProps {
  onAdd: (cat: string) => void;
}

export function AddCategoryForm({ onAdd }: AddCategoryFormProps) {
  const [cat, setCat] = React.useState("");
  
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
