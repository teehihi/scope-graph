import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface RequirementPanelProps {
  onAnalyze: (requirement: string) => void;
  isAnalyzing: boolean;
  hasReport: boolean;
  onClear: () => void;
  activeRepoName: string | null;
}

export const RequirementPanel: React.FC<RequirementPanelProps> = ({
  onAnalyze,
  isAnalyzing,
  hasReport,
  onClear,
  activeRepoName,
}) => {
  const { t } = useLanguage();
  const defaultReq = t('dash.default_req');
  const [requirement, setRequirement] = useState(defaultReq);
  const prevDefaultRef = useRef(defaultReq);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (requirement === prevDefaultRef.current) {
      setRequirement(defaultReq);
    }
    prevDefaultRef.current = defaultReq;
  }, [defaultReq]);

  // Auto-resize textarea according to its content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Single line baseline height is 24px (text-sm leading-relaxed)
    const newHeight = Math.max(24, Math.min(el.scrollHeight, 200));
    el.style.height = `${newHeight}px`;
  }, [requirement]);

  const presets = [
    { label: t('dash.preset_email_label'), req: t('dash.preset_email_req') },
    { label: t('dash.preset_rate_label'), req: t('dash.preset_rate_req') },
    { label: t('dash.preset_token_label'), req: t('dash.preset_token_req') },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim() || isAnalyzing) return;
    onAnalyze(requirement.trim());
  };

  return (
    <div className="bg-white border-b border-[#E4E7E1] p-3.5 sm:p-5 shadow-2xs">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Header row: Title (clean & concise on mobile) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#151923] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Terminal className="w-3.5 h-3.5 text-[#526BEE]" />
              <span>{t('impact.proposed_req')}</span>
            </span>
            {activeRepoName && (
              <span className="hidden sm:flex text-[11px] font-mono text-slate-600 bg-[#F7F8F5] border border-[#E4E7E1] px-2.5 py-0.5 rounded-lg max-w-xs shadow-2xs items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[#8B929E] text-[10px]">{t('impact.target')}:</span>
                <strong className="text-[#151923] truncate">{activeRepoName}</strong>
              </span>
            )}
          </div>

          {/* Quick preset suggestions bar: Brand Kit v2 tokens (#151923 Ink, #F7F8F5 Warm White, #EBFACD Lime light) */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs">
            <span className="text-[11px] text-[#8B929E] font-medium shrink-0">
              {t('impact.examples')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRequirement(item.req)}
                  className="shrink-0 text-[11px] font-mono text-[#151923] bg-[#F7F8F5] hover:bg-[#EBFACD] border border-[#E4E7E1] hover:border-[#C7F36B] px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-[0.98] font-medium"
                  title={item.req}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Prompt Textarea Card */}
          <div className="relative rounded-2xl border-2 border-[#E4E7E1] bg-white focus-within:border-[#151923] focus-within:shadow-md transition-all shadow-xs overflow-hidden">
            <div className="p-3.5 sm:p-4">
              <label htmlFor="requirement-input" className="sr-only">
                {t('impact.proposed_req')}
              </label>
              <textarea
                id="requirement-input"
                ref={textareaRef}
                rows={1}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={t('dash.input_placeholder')}
                className="w-full text-xs sm:text-sm font-medium bg-transparent focus:outline-none text-[#151923] placeholder:text-slate-400 resize-none leading-relaxed min-h-[26px] max-h-[220px] block overflow-y-auto"
              />
            </div>

            {/* Bottom Action Strip */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-t border-[#E4E7E1] bg-[#F7F8F5]">
              <span className="text-[11px] text-[#8B929E] hidden sm:flex items-center gap-1 font-mono">
                {t('impact.key_hint_enter')}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
                {hasReport && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="h-9 px-3 rounded-xl border border-[#E4E7E1] bg-white hover:bg-slate-100 text-slate-600 hover:text-[#151923] text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    title={t('impact.reset_analysis')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">{t('impact.reset_analysis')}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!requirement.trim() || isAnalyzing}
                  className="flex-1 sm:flex-initial h-9 px-4 sm:px-5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 active:bg-black text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <img src="/brand/scout-exploring.gif" alt="Scout analyzing" className="w-4 h-4 rounded-full" />
                      <span>{t('impact.tracing')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-[#C7F36B] text-[#C7F36B]" />
                      <span>{t('impact.analyze_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
