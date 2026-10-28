import React, { useState } from 'react';
import { useRepo } from '../../context/RepoContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { UploadModal } from '../../components/UploadModal';
import { FolderGit2, Upload, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from '../../router';

export const RepositoriesPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const {
    repositories,
    activeRepo,
    setActiveRepo,
    loadSample,
    isLoadingSample,
  } = useRepo();

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <AppLayout
      title={t('repo.title')}
      subtitle={t('repo.subtitle')}
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={loadSample}
            disabled={isLoadingSample}
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#dff7a6] transition-colors shrink-0 shadow-2xs"
            title={t('repo.reload_sample')}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoadingSample ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoadingSample ? '...' : t('repo.reload_sample')}</span>
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-2xs shrink-0"
            title={t('repo.upload_zip')}
          >
            <Upload className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span className="hidden sm:inline">{t('repo.upload_zip')}</span>
            <span className="sm:hidden font-bold text-xs">ZIP</span>
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
                alt="No repositories"
                className="w-16 h-16 mx-auto opacity-75 drop-shadow-xs"
              />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#151923]">
                  {t('repo.empty_title')}
                </h3>
                <p className="text-xs text-[#8B929E] max-w-sm mx-auto">
                  {t('repo.empty_desc')}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={loadSample}
                  disabled={isLoadingSample}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#dff7a6] transition-colors shadow-2xs"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isLoadingSample ? 'animate-spin' : ''}`} />
                  <span>{isLoadingSample ? '...' : t('repo.reload_sample')}</span>
                </button>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#C7F36B]" />
                  <span>{t('repo.upload_zip')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {repositories.map((repo) => {
                const isActive = activeRepo?.id === repo.id;
                return (
                  <div
                    key={repo.id}
                    className={`p-5 sm:p-6 rounded-2xl bg-white border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isActive
                        ? 'border-[#151923] shadow-md'
                        : 'border-[#E4E7E1] hover:border-[#8B929E]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <FolderGit2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#151923]" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-[#151923] break-words">{repo.name}</h3>
                          {isActive && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-[#151923]" />
                              <span>{t('repo.active')}</span>
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-[#8B929E]">ID: {repo.id}</p>
                        <div className="flex items-center gap-2 sm:gap-4 text-xs text-[#8B929E] pt-1 flex-wrap">
                          <span>{repo.stats?.file_count || 14} {t('repo.files')}</span>
                          <span>•</span>
                          <span>{repo.stats?.symbol_count || 32} {t('repo.symbols')}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{t('repo.indexed_desc')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {!isActive && (
                        <button
                          onClick={() => setActiveRepo(repo)}
                          className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#151923] transition-colors"
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
            setActiveRepo(repo);
            navigate('/app/graph');
          }}
        />
      </div>
    </AppLayout>
  );
};
