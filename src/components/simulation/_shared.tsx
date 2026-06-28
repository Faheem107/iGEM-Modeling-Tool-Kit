'use client';

/**
 * Shared UI primitives for the simulation modules — themed panels, sliders, stat cards,
 * a collapsible "Show the math" block, and recharts color tokens. Keeps every new module
 * visually consistent with the existing toolkit (light/dark) while staying graph-first.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, Sigma } from 'lucide-react';

export interface Themed {
  isLightMode: boolean;
}

/** recharts color tokens for a given theme. */
export const chartColors = (light: boolean) => ({
  grid: light ? '#e7e0cf' : '#16233a',
  axis: light ? '#78716c' : '#64748b',
  tooltipBg: light ? '#ffffff' : '#0a0f18',
  tooltipBorder: light ? '#e7e5e4' : '#1e293b',
  text: light ? '#1c1917' : '#e2e8f0',
});

export const tooltipStyle = (light: boolean) => ({
  backgroundColor: light ? 'rgba(255,255,255,0.97)' : 'rgba(10,15,24,0.97)',
  border: `1px solid ${light ? '#e7e5e4' : '#1e293b'}`,
  borderRadius: 10,
  fontSize: 11,
  fontFamily: 'var(--font-montserrat), system-ui, sans-serif',
  color: light ? '#1c1917' : '#e2e8f0',
});

export function Panel({
  title, icon: Icon, isLightMode, children, className = '', right,
}: Themed & { title: string; icon?: LucideIcon; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <div className={`p-5 rounded-2xl border transition-colors duration-300 ${
      isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-800/80 shadow-xl'
    } ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? 'text-amber-950' : 'text-slate-100'}`}>
          {Icon && <Icon className={`w-4 h-4 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />}
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  label, value, min, max, step, unit, onChange, isLightMode, accent = 'accent-cyan-500', hint, format,
}: Themed & {
  label: React.ReactNode; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void; accent?: string; hint?: string; format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-[11px] mb-1">
        <span className={`font-semibold ${isLightMode ? 'text-stone-700' : 'text-slate-300'}`}>{label}</span>
        <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${
          isLightMode ? 'bg-stone-50 border-stone-200 text-stone-800 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-200'
        }`}>{format ? format(value) : value}{unit ? ` ${unit}` : ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 rounded cursor-ew-resize ${accent} ${isLightMode ? 'bg-stone-200' : 'bg-slate-800'}`}
      />
      {hint && <span className={`text-[9px] block mt-1 ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>{hint}</span>}
    </div>
  );
}

export function StatCard({
  label, value, unit, accent, isLightMode, sub, emphasize,
}: Themed & { label: string; value: string; unit?: string; accent: string; sub?: string; emphasize?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${
      isLightMode ? 'bg-[#fcfaf4] border-amber-900/10' : 'bg-[#05070c] border-slate-850'
    } ${emphasize ? 'ring-1 ring-inset ' + (isLightMode ? 'ring-amber-300/40' : 'ring-cyan-900/40') : ''}`}>
      <span className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`font-black ${emphasize ? 'text-lg' : 'text-sm'} ${accent}`}>{value}</span>
        {unit && <span className={`text-[10px] font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>{unit}</span>}
      </div>
      {sub && <span className={`block text-[9px] mt-0.5 ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>{sub}</span>}
    </div>
  );
}

/** Collapsible block hiding dense formulae behind a toggle (graph-first by default). */
export function MathDisclosure({ isLightMode, children, label = 'Show the math' }: Themed & { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border overflow-hidden ${isLightMode ? 'border-amber-900/10 bg-[#fcfaf5]' : 'border-slate-850 bg-[#06090f]'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider ${
          isLightMode ? 'text-stone-600 hover:bg-stone-100' : 'text-slate-400 hover:bg-slate-900/50'
        }`}
      >
        <span className="flex items-center gap-1.5"><Sigma className="w-3.5 h-3.5" /> {label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`px-4 py-3 text-[11px] leading-relaxed font-mono border-t ${
          isLightMode ? 'border-amber-900/10 text-stone-700' : 'border-slate-850 text-slate-300'
        }`}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Two-column module shell: controls (left) + visuals (right). */
export function ModuleShell({ isLightMode, controls, children }: Themed & { controls: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-2xl border transition-colors duration-300 ${
      isLightMode ? 'bg-[#fdfaf3] border-amber-900/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]' : 'bg-[#06080d] border-slate-800 shadow-xl'
    }`}>
      <div className="lg:col-span-5 space-y-5">{controls}</div>
      <div className="lg:col-span-7 space-y-5">{children}</div>
    </div>
  );
}
