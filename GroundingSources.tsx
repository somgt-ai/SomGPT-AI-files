import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import { GroundingSource } from '../types';

interface GroundingSourcesProps {
  sources: GroundingSource[];
  language?: string;
}

export const GroundingSources: React.FC<GroundingSourcesProps> = ({
  sources,
  language = 'so',
}) => {
  if (!sources || sources.length === 0) return null;

  const headerTitle =
    language === 'so'
      ? 'Ilaha la xaqiijiyay ee la baaray'
      : language === 'ar'
      ? 'المصادر الموثقة التي تمت مراجعتها'
      : 'Verified Sources Consulted';

  return (
    <div className="mt-3.5 pt-3 border-t border-slate-700/50">
      <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-cyan-400">
        <Globe className="w-3.5 h-3.5" />
        <span>{headerTitle} ({sources.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {sources.map((src, idx) => (
          <a
            key={`${src.url}-${idx}`}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-700/60 hover:border-cyan-500/40 transition-all text-left shadow-sm"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-slate-200 group-hover:text-cyan-300 truncate leading-snug">
                {src.title || src.domain || 'Source'}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <span className="truncate">{src.domain || 'web'}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
