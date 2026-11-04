import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CheckCircle2, ChevronDown, Clock3, Code2, Monitor, RotateCcw, Smartphone, Sparkles, X } from 'lucide-react';
import { AppLayout } from '../../components/layouts/AppLayout';
import { UIProposalRenderer } from '../../components/UIProposalRenderer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRepo } from '../../context/RepoContext';
import { analyzeScreenshot, generateUIProposal, getUIProposalStatus, runAnalysis, UIProposalTargetConflict } from '../../api/client';
import { AnalysisReport, UIProposalProviderStatus, UIProposalResult, UITargetCandidate } from '../../types';

interface ProposalEntry {
  result: UIProposalResult;
  refinement?: string;
  report?: AnalysisReport;
  brief?: string;
  stale?: boolean;
}

export const UIProposalPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { activeRepo, repositories, setActiveRepo, loadSample, isLoadingSample } = useRepo();
  const [requirement, setRequirement] = useState('');
  const [refinement, setRefinement] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [history, setHistory] = useState<ProposalEntry[]>([]);
  const [selected, setSelected] = useState(-1);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [showSpec, setShowSpec] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [providerMode, setProviderMode] = useState<'offline' | 'live'>('offline');
  const [providerStatus, setProviderStatus] = useState<UIProposalProviderStatus | null>(null);
  const [targetChoices, setTargetChoices] = useState<UITargetCandidate[]>([]);
  const [selectedTargetPath, setSelectedTargetPath] = useState('');
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const repoDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const entry = history[selected];
  const storageKey = `scopegraph_ui_proposals_${user?.email || 'demo'}_${activeRepo?.id || 'none'}`;
  // The backend reports live/offline availability per repository. Live is
  // only offered when it is confirmed available; offline generation is
  // only offered when the backend says it is available, otherwise the
  // user would click Generate straight into a 503 (see ui_proposals.py:
  // generation is gated to local development).
  const liveAvailable = providerStatus?.live_available === true;
  const offlineUnavailable = providerStatus !== null && !providerStatus.offline_available;

  useEffect(() => {
    setHistory([]);
    setSelected(-1);
    setTargetChoices([]);
    setSelectedTargetPath('');
    if (!activeRepo) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length <= 20 && parsed.every((item) =>
          item?.result?.spec?.schema_version === '1' && item.result.spec.root?.type === 'Container' &&
          typeof item.result.spec.requirement === 'string' && item.result.spec.responsive && item.result.spec.design_tokens &&
          item.result.generation?.mode && Number.isInteger(item.result.spec.version))) {
          setHistory(parsed);
          setSelected(parsed.length - 1);
          setRequirement(parsed[0]?.result?.spec?.requirement || '');
        }
      }
    } catch { /* Corrupt local history is ignored. */ }
  }, [storageKey]);

  useEffect(() => {
    setProviderStatus(null);
    if (!activeRepo) return;
    let alive = true;
    void getUIProposalStatus(activeRepo.id, user?.sessionToken).then((status) => { if (alive) setProviderStatus(status); })
      .catch(() => { if (alive) setProviderStatus(null); });
    return () => { alive = false; };
  }, [activeRepo?.id, user?.sessionToken]);

  // If live was selected and the backend then reports it unavailable, fall
  // back to offline instead of leaving a hidden live mode selected.
  useEffect(() => {
    if (providerStatus && !providerStatus.live_available && providerMode === 'live') setProviderMode('offline');
  }, [providerStatus, providerMode]);

  // Click outside or Escape closes the custom repository dropdown,
  // following the RepoSelectorDropdown pattern used elsewhere in the app.
  useEffect(() => {
    if (!isRepoDropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (repoDropdownRef.current && !repoDropdownRef.current.contains(event.target as Node)) setIsRepoDropdownOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsRepoDropdownOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('mousedown', onPointerDown); window.removeEventListener('keydown', onKeyDown); };
  }, [isRepoDropdownOpen]);

  const persist = (items: ProposalEntry[]) => {
    setHistory(items);
    try { sessionStorage.setItem(storageKey, JSON.stringify(items.map(({ result, refinement }) => ({ result, refinement })))); }
    catch { setError(t('proposal.storage_error')); }
  };

  const generate = async (mode: 'new' | 'refine') => {
    if (!activeRepo || !requirement.trim() || (mode === 'refine' && (!entry || !refinement.trim()))) return;
    setGenerating(true); setError('');
    try {
      const baseRequirement = mode === 'refine' ? entry.result.spec.requirement : requirement.trim();
      const version = mode === 'refine' ? entry.result.spec.version + 1 : 1;
      const result = await generateUIProposal(activeRepo.id, baseRequirement, version,
        mode === 'refine' ? refinement.trim() : undefined,
        mode === 'refine' ? entry.result.spec : undefined, user?.sessionToken, providerMode,
        mode === 'refine' ? entry.result.patch?.target_label : undefined,
        selectedTargetPath || (mode === 'refine' ? entry.result.target_resolution?.selected?.ref : undefined));
      const next: ProposalEntry = { result, refinement: mode === 'refine' ? refinement.trim() : undefined };
      const items = mode === 'refine' ? [...history.slice(0, selected + 1).map((item) => ({ ...item, stale: Boolean(item.report) })), next] : [next];
      persist(items); setSelected(items.length - 1); setRefinement(''); setShowSpec(false);
      setTargetChoices([]); setSelectedTargetPath('');
    } catch (cause) {
      if (cause instanceof UIProposalTargetConflict) setTargetChoices(cause.candidates);
      setError(cause instanceof Error ? cause.message : t('proposal.error'));
    }
    finally { setGenerating(false); }
  };

  const analyze = async () => {
    if (!activeRepo || !entry) return;
    setAnalyzing(true); setError('');
    try {
      const target = entry.result.target_resolution?.selected;
      const patch = entry.result.patch;
      const text = entry.result.spec.requirement + (entry.refinement ? `\n${entry.refinement}` : '') +
        (target ? `\nValidated UI target candidate: ${target.path}:${target.line_start}.` : '') +
        (patch ? `\nRequested UI patch: ${JSON.stringify(patch.changes)}. Preserve unrelated behavior and avoid unrelated backend claims.` : '');
      const response = screenshot
        ? await analyzeScreenshot(activeRepo.id, text, screenshot, language, user?.sessionToken)
        : await runAnalysis(activeRepo.id, text, language, user?.sessionToken);
      if (!response.result) throw new Error(t('proposal.error'));
      const next = history.map((item, index) => index === selected ? { ...item, report: response.result, brief: response.brief || '', stale: false } : item);
      persist(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t('proposal.error')); }
    finally { setAnalyzing(false); }
  };

  const exportProposal = () => {
    if (!entry) return;
    const blob = new Blob([JSON.stringify({ requirement: entry.result.spec.requirement, proposal: entry.result, impact_report: entry.report || null, implementation_brief: entry.brief || null }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `scopegraph-ui-proposal-v${entry.result.spec.version}.json`;
    link.click(); URL.revokeObjectURL(url);
  };

  return <AppLayout title={t('proposal.title')} subtitle={t('proposal.subtitle')}>
    <div className="h-full overflow-y-auto p-4 lg:p-6" data-testid="proposal-workspace">
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#DDE1DB] bg-white p-3 text-xs">
        <span className="font-bold text-[#56606E]">{t('proposal.repository')}</span>
        <div className="relative" ref={repoDropdownRef}>
          <button type="button" aria-haspopup="listbox" aria-expanded={isRepoDropdownOpen} onClick={() => setIsRepoDropdownOpen((open) => !open)} className="flex min-w-44 items-center justify-between gap-2 rounded-lg border border-[#DDE1DB] bg-white px-3 py-2 font-semibold hover:bg-[#F7F8F5]">
            <span className="truncate">{activeRepo?.name || t('proposal.select_repo')}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isRepoDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isRepoDropdownOpen && (
            <div role="listbox" aria-label={t('proposal.select_repo')} className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#E4E7E1] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E4E7E1] bg-[#F7F8F5] p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E]">{t('repo.dropdown_header')} ({repositories.length})</span>
                <span className="font-mono text-[10px] text-[#8B929E]">ScopeGraph</span>
              </div>
              <div className="max-h-60 space-y-1 overflow-y-auto p-1.5">
                {repositories.map((repo) => {
                  const isSelected = activeRepo?.id === repo.id;
                  return (
                    <button key={repo.id} type="button" role="option" aria-selected={isSelected} onClick={() => { setActiveRepo(repo); setIsRepoDropdownOpen(false); }} className={`flex w-full items-center justify-between gap-2 rounded-xl p-2.5 text-left text-sm ${isSelected ? 'bg-[#151923] font-bold text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-[#151923]'}`}>
                      <span className="min-w-0 pr-2">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-mono text-xs">{repo.name}</span>
                          {isSelected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7F36B]" />}
                        </span>
                        {typeof repo.stats?.file_count === 'number' && <span className="mt-0.5 block font-mono text-[10px] opacity-75">{repo.stats.file_count} {t('repo.files')}</span>}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[#C7F36B]" />}
                    </button>
                  );
                })}
                {repositories.length === 0 && <p className="p-3 text-sm text-[#697380]">{t('proposal.select_repo')}</p>}
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={() => void loadSample()} disabled={isLoadingSample} className="rounded-lg border border-[#DDE1DB] px-3 py-2 font-semibold hover:bg-[#F7F8F5]">{t('proposal.load_sample')}</button>
        {providerStatus?.offline_available && <span className="ml-auto rounded-lg bg-[#EDF0F7] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#526BEE]">{t('proposal.local_only')}</span>}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#DDE1DB] bg-white p-3 text-xs" aria-label={t('proposal.mode')}>
        <strong className="mr-2">{t('proposal.mode')}</strong>
        <button type="button" aria-pressed={providerMode === 'offline'} onClick={() => setProviderMode('offline')} className={`rounded-lg border px-3 py-2 font-bold ${providerMode === 'offline' ? 'border-[#151923] bg-[#151923] text-white' : 'border-[#DDE1DB]'}`}>{t('proposal.offline')}</button>
        {liveAvailable && <button type="button" aria-pressed={providerMode === 'live'} onClick={() => setProviderMode('live')} className={`rounded-lg border px-3 py-2 font-bold ${providerMode === 'live' ? 'border-[#151923] bg-[#151923] text-white' : 'border-[#DDE1DB]'}`}>{t('proposal.live')}</button>}
        <span role="status" className={`ml-auto ${providerStatus?.live_available ? 'text-green-700' : 'text-[#697380]'}`}>{providerStatus?.live_available ? t('proposal.provider_ready') : t('proposal.provider_unavailable')}</span>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,0.9fr)_minmax(420px,1.6fr)_minmax(290px,1fr)]">
        <section className="space-y-4 rounded-2xl border border-[#DDE1DB] bg-white p-5" aria-label={t('proposal.requirement')}>
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#526BEE]" /><h2 className="text-sm font-bold">{t('proposal.requirement')}</h2></div>
          <textarea aria-label={t('proposal.requirement')} value={requirement} onChange={(event) => { setRequirement(event.target.value); setTargetChoices([]); setSelectedTargetPath(''); }} maxLength={2000} rows={6} placeholder={t('proposal.requirement_placeholder')} className="w-full resize-y rounded-xl border border-[#DDE1DB] p-3 text-sm outline-none focus:border-[#526BEE]" />
          {providerMode === 'live' && !providerStatus?.live_available && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('proposal.live_unavailable')}</p>}
          {providerMode === 'offline' && offlineUnavailable && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('proposal.offline_unavailable')}</p>}
          {targetChoices.length > 0 && <label className="block text-xs font-bold">{t('proposal.target_select')}<select value={selectedTargetPath} onChange={(event) => setSelectedTargetPath(event.target.value)} className="mt-2 w-full rounded-lg border border-[#DDE1DB] p-2"><option value="">{t('proposal.target_select')}</option>{targetChoices.map((candidate) => <option key={candidate.ref} value={candidate.ref}>{candidate.ref}</option>)}</select></label>}
          <button type="button" onClick={() => void generate('new')} disabled={!activeRepo || !requirement.trim() || generating || (providerMode === 'live' && !providerStatus?.live_available) || (providerMode === 'offline' && offlineUnavailable) || (targetChoices.length > 0 && !selectedTargetPath)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#151923] px-4 py-3 text-sm font-bold text-white hover:bg-[#303744] disabled:opacity-50">{generating ? t('proposal.generating') : entry ? t('proposal.regenerate') : t('proposal.generate')}<ArrowRight className="h-4 w-4" /></button>
          <div className="border-t border-[#DDE1DB] pt-4"><label className="mb-2 block text-sm font-bold" htmlFor="proposal-refine">{t('proposal.refine')}</label><textarea id="proposal-refine" value={refinement} onChange={(event) => setRefinement(event.target.value)} disabled={!entry} maxLength={1000} rows={3} placeholder={t('proposal.refine_placeholder')} className="w-full resize-y rounded-xl border border-[#DDE1DB] p-3 text-sm outline-none focus:border-[#526BEE] disabled:opacity-50" /><button type="button" onClick={() => void generate('refine')} disabled={!entry || !refinement.trim() || generating || entry.result.spec.version >= 20 || (providerMode === 'live' && !providerStatus?.live_available) || (providerMode === 'offline' && offlineUnavailable)} className="mt-2 w-full rounded-xl border border-[#151923] px-4 py-2.5 text-sm font-bold hover:bg-[#F7F8F5] disabled:opacity-50">{t('proposal.refine_action')}</button></div>
          {history.length > 0 && <div className="border-t border-[#DDE1DB] pt-4"><h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Clock3 className="h-4 w-4" />{t('proposal.history')}</h3><div className="flex flex-wrap gap-2">{history.map((item, index) => <button key={index} type="button" onClick={() => { setSelected(index); setError(''); }} aria-current={selected === index ? 'step' : undefined} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${selected === index ? 'bg-[#C7F36B]' : 'bg-[#F0F2EF] hover:bg-[#E4E7E1]'}`}>v{item.result.spec.version}{item.report ? ' ✓' : ''}</button>)}</div></div>}
          {selected > 0 && <button type="button" onClick={() => { setSelected(selected - 1); setError(''); }} className="flex items-center gap-2 rounded-lg border border-[#DDE1DB] px-3 py-2 text-xs font-bold"><RotateCcw className="h-3 w-3" />{t('proposal.revert')}</button>}
          <div className="border-t border-[#DDE1DB] pt-4"><span className="mb-2 block text-xs font-bold">{t('proposal.screenshot')}</span><input ref={fileInputRef} id="proposal-screenshot" type="file" accept="image/png,image/jpeg" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} className="sr-only" /><div className="flex items-center gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 rounded-lg bg-[#EDF0F7] px-3 py-1.5 text-xs font-bold hover:bg-[#E4E7E1]">{t('proposal.choose_file')}</button><span className="min-w-0 flex-1 truncate text-xs text-[#697380]">{screenshot ? screenshot.name : t('proposal.no_file')}</span>{screenshot && <button type="button" onClick={() => { setScreenshot(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} aria-label={t('common.close')} className="shrink-0 rounded-lg p-1 text-[#697380] hover:bg-[#F7F8F5] hover:text-[#151923]"><X className="h-4 w-4" /></button>}</div><p className="mt-2 text-xs text-[#697380]">{t('proposal.screenshot_note')}</p></div>
        </section>
        <section className="min-w-0 rounded-2xl border border-[#DDE1DB] bg-[#EEF0EC] p-4 lg:p-6" aria-label={t('proposal.preview')}>
          <div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="mr-auto text-sm font-bold">{t('proposal.preview')}</h2><button type="button" aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} className={`rounded-lg p-2 ${viewport === 'desktop' ? 'bg-[#151923] text-white' : 'bg-white'}`} title={t('proposal.desktop')}><Monitor className="h-4 w-4" /></button><button type="button" aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} className={`rounded-lg p-2 ${viewport === 'mobile' ? 'bg-[#151923] text-white' : 'bg-white'}`} title={t('proposal.mobile')}><Smartphone className="h-4 w-4" /></button><button type="button" onClick={() => setShowSpec((value) => !value)} disabled={!entry} className="rounded-lg bg-white p-2 disabled:opacity-50" title={t('proposal.spec')}><Code2 className="h-4 w-4" /></button></div>
          {entry ? <>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-md bg-[#C7F36B] px-2 py-1 font-bold">{entry.result.generation.mode === 'offline' ? t('proposal.offline') : t('proposal.live')}</span><span className="font-mono text-[#56606E]">{entry.result.generation.model}</span><span className="ml-auto text-[#697380]">v{entry.result.spec.version}</span></div>
            <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-[#697380]"><span>{entry.result.generation.request_count} {t('proposal.requests')}</span>{typeof entry.result.generation.token_usage?.total_tokens === 'number' && <span>{entry.result.generation.token_usage.total_tokens} {t('proposal.tokens')}</span>}<span>{t('proposal.cost_unavailable')}</span></div>
            <p className="mb-3 text-xs text-[#56606E]">{entry.result.preview_provenance === 'proposal_version' ? t('proposal.preview_version') : entry.result.preview_provenance === 'conceptual_approximation' ? t('proposal.preview_approx') : t('proposal.preview_new')}</p>
            <div className={entry.result.before_spec ? 'grid gap-4 2xl:grid-cols-2' : ''}>
              {entry.result.before_spec && <div><h3 className="mb-2 text-xs font-bold uppercase">{t('proposal.before')}</h3><UIProposalRenderer spec={entry.result.before_spec} viewport={viewport} /></div>}
              <div><h3 className="mb-2 text-xs font-bold uppercase">{t('proposal.after')}</h3><UIProposalRenderer spec={entry.result.spec} viewport={viewport} /></div>
            </div>
            {entry.result.change_summary && <div className="mt-4 rounded-xl bg-white p-3 text-xs"><strong>{t('proposal.change_summary')}</strong><p className="mt-1">{entry.result.change_summary}</p></div>}
            <div className="mt-4 rounded-xl bg-white p-3 text-xs"><strong>{t('proposal.target')}</strong><p className="mt-1">{entry.result.target_resolution?.status === 'source_backed' ? t('proposal.source_backed') : t('proposal.conceptual')}</p>{entry.result.target_resolution?.selected && <div className="mt-2"><code className="break-all">{entry.result.target_resolution.selected.path}:{entry.result.target_resolution.selected.line_start}</code><pre className="mt-2 overflow-auto rounded-lg bg-[#151923] p-2 text-[10px] text-white">{entry.result.target_resolution.selected.evidence}</pre></div>}</div>
            {showSpec && <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-[#151923] p-4 text-[11px] text-[#C7F36B]">{JSON.stringify(entry.result.spec, null, 2)}</pre>}
            <div className="mt-4 rounded-xl border border-[#DDE1DB] bg-white p-3 text-xs text-[#56606E]"><strong>{t('proposal.assumptions')}</strong><ul className="mt-2 list-inside list-disc">{entry.result.spec.assumptions.map((item, index) => <li key={index}>{item}</li>)}{entry.result.spec.uncertainties.map((item, index) => <li key={`u${index}`}>{item}</li>)}</ul></div>
          </> : <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-[#C8CEC5] bg-white p-8 text-center text-sm text-[#697380]">{t('proposal.empty')}</div>}
        </section>
        <section className="space-y-4 rounded-2xl border border-[#DDE1DB] bg-white p-5" aria-label={t('proposal.impact')}>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#526BEE]" /><h2 className="text-sm font-bold">{t('proposal.impact')}</h2></div><p className="text-xs leading-5 text-[#697380]">{t('proposal.impact_note')}</p>
          <button type="button" onClick={() => void analyze()} disabled={!entry || analyzing} className="w-full rounded-xl bg-[#C7F36B] px-4 py-3 text-sm font-bold hover:bg-[#B8E65A] disabled:opacity-50">{analyzing ? t('proposal.analyzing') : t('proposal.analyze')}</button>
          {!entry?.report && <div className="rounded-xl border border-dashed border-[#DDE1DB] p-5 text-center text-xs text-[#697380]">{t('proposal.no_impact')}</div>}
          {entry?.stale && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('proposal.impact_stale')}</p>}
          {entry?.report && <div className="space-y-4"><div className="rounded-xl bg-[#F7F8F5] p-3 text-xs">{entry.report.requirement_summary}</div>{(['direct', 'indirect'] as const).map((kind) => <div key={kind}><h3 className="mb-2 text-xs font-bold uppercase tracking-wider">{t(`proposal.${kind}`)}</h3>{entry.report?.affected_items.filter((item) => item.impact_type === kind).map((item, index) => <div key={index} className="mb-2 rounded-xl border border-[#DDE1DB] p-3 text-xs"><div className="font-mono font-bold break-all">{item.file_path}:{item.line_start || 0}</div><div className="mt-1 text-[#56606E]">{item.reason}</div>{item.evidence_snippet && <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-[#151923] p-2 text-[10px] text-white">{item.evidence_snippet}</pre>}</div>)}</div>)}<div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider">{t('proposal.potential')}</h3>{(entry.report.potential_impacts || []).map((item, index) => <div key={index} className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">{item.file_path}: {item.reason}</div>)}</div>{entry.brief && <details className="rounded-xl border border-[#DDE1DB] p-3 text-xs"><summary className="cursor-pointer font-bold">{t('proposal.brief')}</summary><pre className="mt-3 whitespace-pre-wrap font-sans leading-5">{entry.brief}</pre></details>}</div>}
          <button type="button" onClick={exportProposal} disabled={!entry} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDE1DB] px-4 py-2.5 text-xs font-bold hover:bg-[#F7F8F5] disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />{t('proposal.export')}</button>
          {history.length > 1 && <p className="flex items-center gap-2 text-xs text-[#697380]"><RotateCcw className="h-3 w-3" />{t('proposal.version_note')}</p>}
        </section>
      </div>
      {error && <div role="alert" className="mt-4 rounded-xl border border-[#E5484D] bg-red-50 p-3 text-sm text-[#9E232A]">{error}</div>}
    </div>
  </AppLayout>;
};
