import React from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { useLanguage } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { RequirementPanel } from '../../components/RequirementPanel';
import { ReportPanel } from '../../components/ReportPanel';
import { EvidenceDrawer } from '../../components/EvidenceDrawer';
import { Network, CheckCircle, AlertCircle } from 'lucide-react';
import { ImpactItem } from '../../types';

export const ImpactPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const {
    activeRepo,
    isAnalyzing,
    analysisReport,
    analysisError,
    briefMarkdown,
    runAnalysisRequirement,
    clearAnalysis,
    selectedImpactItem,
    setSelectedImpactItem,
    selectedNodeData,
    setSelectedNodeData,
    nodes,
  } = useRepo();

  const handleSelectItem = (item: ImpactItem) => {
    setSelectedImpactItem(item);
    const matched = nodes.find((n) => (n.data as any).path === item.file_path);
    if (matched) {
      setSelectedNodeData(matched.data as any);
    }
  };

  // Cleanup selected node when navigating away or on unmount
  React.useEffect(() => {
    return () => {
      setSelectedNodeData(null);
      setSelectedImpactItem(null);
    };
  }, [setSelectedNodeData, setSelectedImpactItem]);

  return (
    <AppLayout
      title={t('impact.title')}
      subtitle={activeRepo?.name ? `${t('impact.subtitle')} • ${activeRepo.name}` : t('impact.subtitle')}
      actions={
        <div className="flex items-center gap-2">
          {analysisReport && (
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-[#151923] px-2.5 py-1.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] shadow-2xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-[11px] text-[#151923]">{t('report.complete')}</span>
              </div>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{analysisReport.operational_metadata?.model || 'Meta AI'}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{analysisReport.operational_metadata?.execution_time_seconds || 0}s</span>
            </div>
          )}
          {analysisReport && (
            <button
              onClick={() => navigate('/app/graph')}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Network className="w-3.5 h-3.5 text-[#526BEE]" />
              <span className="hidden sm:inline">{t('impact.view_in_graph')}</span>
              <span className="sm:hidden">{t('impact.view_graph_mobile')}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden bg-[#F7F8F5]">
        {/* Requirement Input Bar */}
        <RequirementPanel
          onAnalyze={(req, screenshot) => runAnalysisRequirement(req, null, screenshot)}
          isAnalyzing={isAnalyzing}
          hasReport={analysisReport !== null}
          onClear={clearAnalysis}
          activeRepoName={activeRepo?.name || null}
        />

        {analysisError && (
          <div role="alert" className="mx-3.5 sm:mx-5 mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex min-h-0 min-w-0 w-full max-w-full relative overflow-hidden">
          {isAnalyzing ? (
            /* Loading State: Scout Exploring */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <img
                src="/brand/scout-exploring.gif"
                alt="Scout Exploring"
                className="w-24 h-24 object-contain mx-auto drop-shadow-md"
              />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#151923]">{t('impact.scout_tracing')}</h3>
                <p className="text-xs text-[#8B929E] max-w-sm mx-auto">
                  {t('impact.scout_tracing_sub')}
                </p>
              </div>
            </div>
          ) : analysisReport ? (
            /* Results: Report Panel + Desktop Evidence Inspector */
            <div className="flex-1 flex min-h-0 min-w-0 w-full max-w-full overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                <ReportPanel
                  report={analysisReport}
                  onSelectItem={handleSelectItem}
                  selectedFilePath={selectedImpactItem?.file_path}
                  briefMarkdown={briefMarkdown}
                />
              </div>

              {/* Desktop Persistent Evidence Inspector */}
              {selectedNodeData && (
                <div className="hidden lg:flex w-96 xl:w-[440px] h-full border-l border-[#E4E7E1] bg-white shrink-0 flex-col min-h-0 overflow-hidden shadow-xs animate-slide-in-right">
                  <EvidenceDrawer
                    selectedNode={selectedNodeData}
                    impactItem={selectedImpactItem}
                    onClose={() => {
                      setSelectedNodeData(null);
                      setSelectedImpactItem(null);
                    }}
                    isDesktopInline={true}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Empty State: Scout Ready */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <img
                src="/brand/scout-default.svg"
                alt="Scout"
                className="w-20 h-20 opacity-90 drop-shadow-sm"
              />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#151923]">{t('impact.ready_title')}</h3>
                <p className="text-xs text-[#8B929E] max-w-md mx-auto">
                  {t('impact.ready_desc')}
                </p>
              </div>
            </div>
          )}

          {/* Evidence Drawer with Mobile Backdrop on smaller screens */}
          {selectedNodeData && (
            <div className="lg:hidden">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-30 animate-fade-in"
                onClick={() => {
                  setSelectedNodeData(null);
                  setSelectedImpactItem(null);
                }}
              />
              {/* Bottom Sheet Modal anchored below Header (top-14) with rounded top corners */}
              <div className="fixed top-14 inset-x-0 bottom-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 z-30 shadow-2xl flex flex-col bg-white rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-[#E4E7E1] overflow-hidden animate-slide-up sm:animate-slide-in-right">
                <EvidenceDrawer
                  selectedNode={selectedNodeData}
                  impactItem={selectedImpactItem}
                  onClose={() => {
                    setSelectedNodeData(null);
                    setSelectedImpactItem(null);
                  }}
                  isDesktopInline={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
