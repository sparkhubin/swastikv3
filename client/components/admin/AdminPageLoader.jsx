import React from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminPageLoader({ 
  title = "Loading data...", 
  subtitle = "Fetching latest records from database...",
  rows = 4
}) {
  return (
    <div className="w-full py-12 px-4 flex flex-col items-center justify-center space-y-6 animate-fade-in">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-1.5 max-w-sm">
        <h3 className="text-base font-black uppercase tracking-wider text-white">
          {title}
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          {subtitle}
        </p>
      </div>

      {/* Modern Skeleton Cards Placeholder */}
      <div className="w-full max-w-4xl space-y-3 pt-2 opacity-60">
        <div className="h-10 bg-slate-800/60 rounded-xl animate-pulse w-full border border-white/5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div 
              key={i} 
              className="h-28 bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-slate-800/80 rounded w-3/4" />
                  <div className="h-2 bg-slate-800/60 rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 bg-slate-800/40 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
