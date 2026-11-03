import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, ExternalLink, Trash2, LoaderCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { AppLayout } from '../../components/layouts/AppLayout';
import { ReportPanel } from '../../components/ReportPanel';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useRouter } from '../../router';
import { AnalysisHistoryItem, deleteAnalysisHistory, fetchAnalysisHistory, fetchAnalysisReport, fetchImplementationBrief } from '../../api/client';
import { AnalysisReport } from '../../types';

export const AnalysisHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { search } = useRouter();
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ id: string; repositoryId: string; report: AnalysisReport; brief: string } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const sessionToken = user?.sessionToken || '';

  const reload = useCallback(async () => {
    if (!sessionToken) { setLoading(false); setItems([]); setError(t('history.error')); return; }
    setLoading(true);
    setError('');
    try {
      setItems(await fetchAnalysisHistory(sessionToken));
    } catch {
      setError(t('history.error'));
    } finally {
      setLoading(false);
    }
  }, [sessionToken, t]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!items.some((item) => item.status === 'queued' || item.status === 'processing')) return;
    const timer = window.setInterval(() => { void reload(); }, 5000);
    return () => window.clearInterval(timer);
  }, [items, reload]);

  const openReport = async (item: AnalysisHistoryItem) => {
    setOpeningId(item.analysis_id);
    try {
      const [report, brief] = await Promise.all([
        fetchAnalysisReport(item.analysis_id, sessionToken),
        fetchImplementationBrief(item.analysis_id, sessionToken),
      ]);
      setSelected({ id: item.analysis_id, repositoryId: item.repository_id, report, brief: brief.brief_markdown });
    } catch {
      setError(t('history.error'));
    } finally {
      setOpeningId(null);
    }
  };

  useEffect(() => {
    const analysisId = new URLSearchParams(search).get('analysis_id');
    const target = analysisId && items.find((item) => item.analysis_id === analysisId);
    if (target && target.status === 'completed' && !selected) void openReport(target);
  }, [search, items]);

  const remove = async (item: AnalysisHistoryItem) => {
    if (item.status === 'queued' || item.status === 'processing') return;
    try {
      if (!sessionToken) return;
      await deleteAnalysisHistory(item.analysis_id, sessionToken);
      setItems((current) => current.filter((row) => row.analysis_id !== item.analysis_id));
      if (selected?.id === item.analysis_id) setSelected(null);
    } catch {
      setError(t('history.error'));
    }
  };

  const dateFormat = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <AppLayout title={t('nav.history')} subtitle={t('history.retention')}>
      <div className="space-y-4 p-4 sm:p-6">
        {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="h-4 w-4" />{error}</div>}
        {selected && (
          <section className="overflow-hidden rounded-2xl border border-[#E4E7E1] bg-white">
            <div className="flex items-center justify-between border-b border-[#E4E7E1] p-4">
              <h2 className="font-bold text-[#151923]">{t('report.complete')}</h2>
              <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-2 rounded-lg border border-[#E4E7E1] px-3 py-2 text-sm font-semibold hover:bg-slate-50"><ArrowLeft className="h-4 w-4" />{t('history.back')}</button>
            </div>
            <ReportPanel report={selected.report} briefMarkdown={selected.brief} activeRepoId={selected.repositoryId} onSelectItem={() => undefined} />
          </section>
        )}
        <section className="overflow-hidden rounded-2xl border border-[#E4E7E1] bg-white">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#8B929E]"><LoaderCircle className="h-4 w-4 animate-spin" />{t('history.loading')}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-sm text-[#8B929E]"><Clock3 className="h-8 w-8" />{t('history.empty')}</div>
          ) : (
            <div className="divide-y divide-[#E4E7E1]">
              {items.map((item) => (
                <article key={item.analysis_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#151923]">{item.repository_name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : item.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{t(`history.status_${item.status === 'completed' ? 'completed' : item.status === 'failed' ? 'failed' : 'processing'}`)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-[#526071]">{item.requirement}</p>
                    <time className="block text-xs text-[#8B929E]" dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.status === 'completed' && <button type="button" onClick={() => void openReport(item)} disabled={openingId === item.analysis_id} className="inline-flex items-center gap-2 rounded-lg bg-[#151923] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><ExternalLink className="h-4 w-4" />{openingId === item.analysis_id ? t('history.loading') : t('history.open')}</button>}
                    {item.status !== 'queued' && item.status !== 'processing' && <button type="button" onClick={() => void remove(item)} aria-label={t('history.delete')} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /><span className="hidden sm:inline">{t('history.delete')}</span></button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};
