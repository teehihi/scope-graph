import React from 'react';
import { useRouter } from '../../router';
import { useRepo } from '../../context/RepoContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { RequirementPanel } from '../../components/RequirementPanel';
import { ReportPanel } from '../../components/ReportPanel';
import { EvidenceDrawer } from '../../components/EvidenceDrawer';
import { Network, RotateCcw } from 'lucide-react';
import { ImpactItem } from '../../types';

export const ImpactPage: React.FC = () => {
  const { navigate } = useRouter();
  const {
    activeRepo,
    isAnalyzing,
    analysisReport,
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

  return (
    <AppLayout
      title="Change Impact Analysis"
      subtitle={`Analyze requirements against ${activeRepo?.name || 'Codebase'}`}
      actions={
        <div className="flex items-center gap-2">
          {analysisReport && (
            <button
              onClick={() => navigate('/app/graph')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors"
            >
              <Network className="w-3.5 h-3.5 text-[#526BEE]" />
              <span>View in Graph</span>
            </button>
          )}
          {analysisReport && (
            <button
              onClick={clearAnalysis}
              className="p-1.5 rounded-lg border border-[#E4E7E1] text-[#8B929E] hover:text-[#151923] hover:bg-slate-100 transition-colors"
              title="Reset analysis"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 bg-[#F7F8F5]">
        {/* Requirement Input Bar */}
        <RequirementPanel
          onAnalyze={runAnalysisRequirement}
          isAnalyzing={isAnalyzing}
          hasReport={analysisReport !== null}
          onClear={clearAnalysis}
          activeRepoName={activeRepo?.name || null}
        />

        {/* Content Area */}
        <div className="flex-1 flex min-h-0 relative">
          {isAnalyzing ? (
            /* Loading State: Scout Exploring */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <img
                src="/brand/scout-exploring.gif"
                alt="Scout Exploring"
                className="w-24 h-24 object-contain mx-auto drop-shadow-md"
              />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#151923]">Scout is tracing impact paths...</h3>
                <p className="text-xs text-[#8B929E] max-w-sm mx-auto">
                  Reasoning over API endpoints, caller dependencies, and data models to extract evidence.
                </p>
              </div>
            </div>
          ) : analysisReport ? (
            /* Results: Report Panel */
            <div className="flex-1 flex flex-col min-h-0">
              <ReportPanel
                report={analysisReport}
                onSelectItem={handleSelectItem}
                selectedFilePath={selectedImpactItem?.file_path}
                briefMarkdown={briefMarkdown}
              />
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
                <h3 className="text-base font-bold text-[#151923]">Ready to Analyze Code Impact</h3>
                <p className="text-xs text-[#8B929E] max-w-md mx-auto">
                  Enter a proposed requirement above or pick one of the benchmark examples to see affected files, risk flags, and agent prompts.
                </p>
              </div>
            </div>
          )}

          {/* Evidence Drawer */}
          {selectedNodeData && (
            <EvidenceDrawer
              selectedNode={selectedNodeData}
              impactItem={selectedImpactItem}
              onClose={() => {
                setSelectedNodeData(null);
                setSelectedImpactItem(null);
              }}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};
