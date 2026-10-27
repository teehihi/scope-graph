import React from 'react';
import { GitBranch, Upload, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Repository } from '../types';

interface NavbarProps {
  repositories: Repository[];
  activeRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  onLoadSample: () => void;
  onOpenUpload: () => void;
  isLoadingSample: boolean;
  systemStatus: { status: string; database: string; redis: string } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  repositories,
  activeRepo,
  onSelectRepo,
  onLoadSample,
  onOpenUpload,
  isLoadingSample,
  systemStatus,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/20">
          <GitBranch className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900">ScopeGraph</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
              Meta AI Hackathon
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">Understand the impact before you change the code</p>
        </div>
      </div>

      {/* Repository selector & Action buttons */}
      <div className="flex items-center gap-3">
        {repositories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden md:inline">Repository:</span>
            <select
              value={activeRepo?.id || ''}
              onChange={(e) => {
                const found = repositories.find((r) => r.id === e.target.value);
                if (found) onSelectRepo(found);
              }}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.stats?.file_count || 0} files)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 1-Click Load Sample */}
        <button
          onClick={onLoadSample}
          disabled={isLoadingSample}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors disabled:opacity-50"
          title="Instant 1-Click Demo with sample Auth & User microservice"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isLoadingSample ? 'Loading Demo...' : 'Load Sample Repo'}</span>
        </button>

        {/* Upload ZIP */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>Upload ZIP</span>
        </button>

        {/* System Health indicator */}
        <div className="border-l border-slate-200 pl-3 flex items-center gap-1.5 text-xs">
          {systemStatus?.status === 'ready' ? (
            <div className="flex items-center gap-1 text-emerald-600 font-medium" title="Database & API operational">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">System Ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-600 font-medium" title="Connecting to backend...">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Backend Connecting</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
