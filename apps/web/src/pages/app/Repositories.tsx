import React, { useState } from 'react';
import { useRepo } from '../../context/RepoContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { UploadModal } from '../../components/UploadModal';
import { FolderGit2, Upload, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from '../../router';

export const RepositoriesPage: React.FC = () => {
  const { navigate } = useRouter();
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
      title="Code Repositories"
      subtitle="Manage ingested codebases and sample microservices"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadSample}
            disabled={isLoadingSample}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#EBFACD] text-[#151923] border border-[#C7F36B] hover:bg-[#dff7a6] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isLoadingSample ? 'Loading Demo...' : 'Reload Sample Repo'}</span>
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span>Upload ZIP Archive</span>
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#8B929E]">
              Ingested Repositories ({repositories.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {repositories.map((repo) => {
              const isActive = activeRepo?.id === repo.id;
              return (
                <div
                  key={repo.id}
                  className={`p-6 rounded-2xl bg-white border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'border-[#151923] shadow-md ring-2 ring-[#C7F36B]'
                      : 'border-[#E4E7E1] hover:border-[#8B929E]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <FolderGit2 className="w-6 h-6 text-[#151923]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#151923]">{repo.name}</h3>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#151923]" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-[#8B929E]">ID: {repo.id}</p>
                      <div className="flex items-center gap-4 text-xs text-[#8B929E] pt-1">
                        <span>{repo.stats?.file_count || 14} files</span>
                        <span>•</span>
                        <span>{repo.stats?.symbol_count || 32} symbols</span>
                        <span>•</span>
                        <span>Indexed AST &amp; Dependency graph</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {!isActive && (
                      <button
                        onClick={() => setActiveRepo(repo)}
                        className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#151923] transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveRepo(repo);
                        navigate('/app/graph');
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-white hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
