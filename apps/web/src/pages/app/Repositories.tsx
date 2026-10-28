import React, { useState, useEffect } from 'react';
import { useRepo } from '../../context/RepoContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { UploadModal } from '../../components/UploadModal';
import { GitHubImportModal } from '../../components/GitHubImportModal';
import { FolderGit2, Upload, RotateCcw, CheckCircle2, ArrowRight, Github, AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from '../../router';
import { triggerIndexing, deleteRepository } from '../../api/client';
import { Repository } from '../../types';

export const RepositoriesPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const {
    repositories,
    activeRepo,
    setActiveRepo,
    refreshRepositories,
    loadSample,
    isLoadingSample,
  } = useRepo();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isGitHubOpen, setIsGitHubOpen] = useState(() => {
    const shouldReopen = sessionStorage.getItem('scopegraph_reopen_github_modal') === 'true';
    if (shouldReopen) {
      sessionStorage.removeItem('scopegraph_reopen_github_modal');
      return true;
    }
    return false;
  });

  // Countdown timers (in seconds) for repositories that are currently indexing
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});

  // Auto-seed sample repository if user lands on empty repositories list
  useEffect(() => {
    if (repositories.length === 0 && !isLoadingSample) {
      loadSample();
    }
  }, [repositories.length, isLoadingSample, loadSample]);

  // Track any repository currently in indexing or pending status
  const hasIndexingRepo = repositories.some(
    (r) => r.status === 'indexing' || r.status === 'pending'
  );

  // Initialize countdowns for new indexing repositories
  useEffect(() => {
    repositories.forEach((r) => {
      if ((r.status === 'indexing' || r.status === 'pending') && countdowns[r.id] === undefined) {
        setCountdowns((prev) => ({ ...prev, [r.id]: 15 }));
      }
    });
  }, [repositories, countdowns]);

  // 1-second countdown tick for indexing repositories
  useEffect(() => {
    if (!hasIndexingRepo) return;

    const timer = setInterval(() => {
      setCountdowns((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [id, val] of Object.entries(prev)) {
          const newVal = val > 0 ? val - 1 : 0;
          if (newVal !== val) changed = true;
          next[id] = newVal;
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasIndexingRepo]);

  // 2.5s polling loop to refresh repository statuses while indexing
  useEffect(() => {
    if (!hasIndexingRepo) return;

    const pollInterval = setInterval(() => {
      refreshRepositories();
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [hasIndexingRepo, refreshRepositories]);

  const handleRetry = async (repoId: string) => {
    try {
      setCountdowns((prev) => ({ ...prev, [repoId]: 15 }));
      await triggerIndexing(repoId);
      await refreshRepositories();
    } catch (e) {
      console.error(e);
    }
  };

  // Repository deletion confirmation state
  const [deletingRepo, setDeletingRepo] = useState<Repository | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deletingRepo) return;
    setIsDeleting(true);
    try {
      await deleteRepository(deletingRepo.id);
      const remainingRepos = await refreshRepositories();
      if (activeRepo?.id === deletingRepo.id) {
        const nextActive = remainingRepos.find((r) => r.id !== deletingRepo.id) || null;
        setActiveRepo(nextActive);
      }
      setDeletingRepo(null);
    } catch (err: any) {
      console.error('Delete repository failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout
      title={t('repo.title')}
      subtitle={t('repo.subtitle')}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* GitHub Import Button */}
          <button
            onClick={() => setIsGitHubOpen(true)}
            className="group flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#151923] text-white hover:bg-[#C7F36B] hover:text-[#151923] transition-all shrink-0 shadow-2xs cursor-pointer"
            title={t('repo.import_github')}
          >
            <Github className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] transition-colors" />
            <span>GitHub</span>
          </button>

          {/* Upload ZIP Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white text-[#151923] border border-[#E4E7E1] hover:border-[#151923] hover:bg-slate-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
            title={t('repo.upload_zip')}
          >
            <Upload className="w-3.5 h-3.5 text-[#526BEE]" />
            <span className="font-bold">ZIP</span>
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8B929E]">
              {t('repo.ingested_title')} ({repositories.length})
            </h2>
          </div>

          {repositories.length === 0 ? (
            <div className="p-10 sm:p-14 text-center rounded-2xl bg-white border border-[#E4E7E1] space-y-4 shadow-2xs">
              <img
                src="/brand/scout-sleeping.svg"
                alt="Repository state"
                className={`w-16 h-16 mx-auto ${isLoadingSample ? 'animate-bounce' : 'opacity-75'} drop-shadow-xs`}
              />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#151923]">
                  {isLoadingSample ? t('repo.auto_loading_sample') : t('repo.empty_title')}
                </h3>
                <p className="text-xs text-[#8B929E] max-w-sm mx-auto">
                  {isLoadingSample ? t('repo.auto_loading_desc') : t('repo.empty_desc')}
                </p>
              </div>

              {isLoadingSample ? (
                <div className="flex items-center justify-center pt-2">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[#151923] bg-[#EBFACD] px-4 py-2 rounded-full border border-[#C7F36B] animate-pulse">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('repo.indexing_desc')}</span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  {/* GitHub Import Button */}
                  <button
                    onClick={() => setIsGitHubOpen(true)}
                    className="group flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-[#C7F36B] hover:text-[#151923] transition-all shadow-2xs cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] transition-colors" />
                    <span>{t('repo.import_github')}</span>
                  </button>
                  {/* Upload ZIP Button (placed next to GitHub) */}
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:border-[#151923] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#526BEE]" />
                    <span>{t('repo.upload_zip')}</span>
                  </button>
                  {/* Reload Sample Button */}
                  <button
                    onClick={loadSample}
                    disabled={isLoadingSample}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#dff7a6] transition-colors shadow-2xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoadingSample ? 'animate-spin' : ''}`} />
                    <span>{isLoadingSample ? '...' : t('repo.reload_sample')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {repositories.map((repo) => {
                const isActive = activeRepo?.id === repo.id;
                const isIndexing = repo.status === 'indexing' || repo.status === 'pending';
                const isError = repo.status === 'error';
                const isReady = repo.status === 'ready' || (!repo.status && repo.stats);
                const countdown = countdowns[repo.id] ?? 15;

                return (
                  <div
                    key={repo.id}
                    className={`p-5 sm:p-6 rounded-2xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isActive
                        ? 'bg-white border-2 border-[#151923] shadow-md'
                        : isIndexing
                        ? 'bg-slate-50/80 border-2 border-dashed border-amber-300 opacity-75 backdrop-blur-[0.5px] hover:opacity-95 shadow-2xs'
                        : isError
                        ? 'bg-white border-2 border-red-200 shadow-xs'
                        : 'bg-white border-2 border-[#E4E7E1] hover:border-[#8B929E]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isIndexing ? 'bg-amber-50 text-amber-600' : isError ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-[#151923]'
                      }`}>
                        {isIndexing ? (
                          <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-amber-600" />
                        ) : isError ? (
                          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                        ) : (
                          <FolderGit2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#151923]" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-[#151923] break-words">{repo.name}</h3>

                          {/* Indexing Countdown Tag */}
                          {isIndexing && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>
                                {countdown > 0
                                  ? t('repo.importing_ready_in', { seconds: countdown })
                                  : t('repo.ready_moment')}
                              </span>
                            </span>
                          )}

                          {/* Error Tag */}
                          {isError && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>{t('repo.status_error')}</span>
                            </span>
                          )}

                          {/* Active Tag */}
                          {isReady && isActive && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-[#151923]" />
                              <span>{t('repo.active')}</span>
                            </span>
                          )}

                          {/* Ready Tag (when not active) */}
                          {isReady && !isActive && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t('repo.status_ready')}</span>
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-xs text-[#8B929E]">ID: {repo.id}</p>

                        {/* Status Details / Stats Row */}
                        {isIndexing ? (
                          <div className="flex items-center gap-2 text-xs text-[#526BEE] font-medium pt-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#526BEE] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#526BEE]"></span>
                            </span>
                            <span>{t('repo.background_task_hint')}</span>
                          </div>
                        ) : isError ? (
                          <div className="text-xs text-red-600 font-mono pt-1 break-all line-clamp-1">
                            {repo.error_message || t('repo.status_error')}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 sm:gap-4 text-xs text-[#8B929E] pt-1 flex-wrap">
                            <span>{repo.stats?.file_count || 0} {t('repo.files')}</span>
                            <span>•</span>
                            <span>{repo.stats?.symbol_count || 0} {t('repo.symbols')}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{t('repo.indexed_desc')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {isIndexing ? (
                        <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-100 text-[#8B929E] border border-[#E4E7E1] cursor-not-allowed select-none">
                          <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#526BEE]" />
                          <span>{t('repo.indexing_button')}</span>
                        </div>
                      ) : isError ? (
                        <button
                          onClick={() => handleRetry(repo.id)}
                          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{t('repo.retry_btn')}</span>
                        </button>
                      ) : (
                        <>
                          {!isActive && (
                            <button
                              onClick={() => setActiveRepo(repo)}
                              className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#151923] transition-colors cursor-pointer"
                            >
                              {t('repo.set_active')}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveRepo(repo);
                              navigate('/app/graph');
                            }}
                            className="group flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer shadow-sm"
                          >
                            <span>{t('repo.explore')}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-1 transition-all duration-200" />
                          </button>
                        </>
                      )}

                      {/* Delete Repository Button */}
                      <button
                        onClick={() => setDeletingRepo(repo)}
                        className="p-2.5 rounded-xl text-[#8B929E] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer shrink-0"
                        title={t('repo.delete_btn')}
                        aria-label={t('repo.delete_btn')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={(repo) => {
            refreshRepositories();
            setActiveRepo(repo);
            setCountdowns((prev) => ({ ...prev, [repo.id]: 15 }));
          }}
        />

        {/* GitHub Import Modal */}
        <GitHubImportModal
          isOpen={isGitHubOpen}
          onClose={() => setIsGitHubOpen(false)}
          onImportSuccess={(repo) => {
            refreshRepositories();
            setActiveRepo(repo);
            setCountdowns((prev) => ({ ...prev, [repo.id]: 15 }));
          }}
        />

        {/* Delete Confirmation Modal */}
        {deletingRepo && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#151923]/60 backdrop-blur-xs p-4 sm:p-6 animate-fade-in font-sans">
            <div className="bg-white rounded-3xl border border-[#E4E7E1] shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up">
              {/* Header */}
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200 shadow-2xs">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#151923] tracking-tight">
                    {t('repo.delete_confirm_title')}
                  </h3>
                  <p className="text-xs text-[#8B929E] font-mono break-all line-clamp-1">
                    {deletingRepo.name}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                {t('repo.delete_confirm_desc', { name: deletingRepo.name })}
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E4E7E1]">
                <button
                  onClick={() => !isDeleting && setDeletingRepo(null)}
                  disabled={isDeleting}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#151923] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('repo.delete_cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('repo.deleting')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('repo.delete_confirm_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
