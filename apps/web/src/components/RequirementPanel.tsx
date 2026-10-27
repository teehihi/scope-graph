import React, { useState } from 'react';
import { Play, Terminal, RotateCcw } from 'lucide-react';

interface RequirementPanelProps {
  onAnalyze: (requirement: string) => void;
  isAnalyzing: boolean;
  hasReport: boolean;
  onClear: () => void;
  activeRepoName: string | null;
}

const PRESETS = [
  'Require email verification before users can change their email address.',
  'Add rate limiting to authentication and login endpoints.',
  'Implement password reset token expiration and invalidation.',
];

export const RequirementPanel: React.FC<RequirementPanelProps> = ({
  onAnalyze,
  isAnalyzing,
  hasReport,
  onClear,
  activeRepoName,
}) => {
  const [requirement, setRequirement] = useState(
    'Require email verification before users can change their email address.'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim() || isAnalyzing) return;
    onAnalyze(requirement.trim());
  };

  return (
    <div className="bg-white border-b border-slate-200 p-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-600" />
                Proposed Change Requirement
              </span>
              {activeRepoName && (
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono truncate max-w-xs">
                  Target: {activeRepoName}
                </span>
              )}
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-600 font-medium">Examples:</span>
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRequirement(preset)}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors truncate max-w-[200px]"
                  title={preset}
                >
                  {preset.split(' ')[0]} {preset.split(' ')[1]} {preset.split(' ')[2]}...
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="e.g. Require email verification before users can change their email address."
                className="w-full text-xs font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!requirement.trim() || isAnalyzing}
                className="flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 active:bg-black transition-all shadow-sm disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <img src="/brand/scout-exploring.gif" alt="Scout analyzing" className="w-4 h-4 rounded-full" />
                    <span>Scout is reasoning impact...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-[#C7F36B] text-[#C7F36B]" />
                    <span>Analyze Impact</span>
                  </>
                )}
              </button>

              {hasReport && (
                <button
                  type="button"
                  onClick={onClear}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Reset analysis"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
