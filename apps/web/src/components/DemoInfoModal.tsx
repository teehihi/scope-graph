import React, { useEffect } from 'react';
import { X, ArrowRight, GitBranch, Layers, Cpu, Shield } from 'lucide-react';
import { ScopeGraphLogoMark } from './BrandIcons';

interface DemoInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDemo: () => void;
}

export const DemoInfoModal: React.FC<DemoInfoModalProps> = ({
  isOpen,
  onClose,
  onConfirmDemo,
}) => {
  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151923]/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white text-[#151923] rounded-2xl border border-[#E4E7E1] shadow-2xl p-6 font-sans space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F7F8F5] border border-[#E4E7E1] flex items-center justify-center">
              <ScopeGraphLogoMark size={20} dark={false} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#151923] tracking-tight">
                Demo Workspace
              </h2>
              <p className="text-xs text-[#8B929E]">
                Ephemeral sandbox with pre-indexed repository
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg text-[#8B929E] hover:text-[#151923] hover:bg-[#F7F8F5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Technical Spec List */}
        <div className="space-y-2 text-xs divide-y divide-[#E4E7E1]/60">
          <div className="pt-2 first:pt-0 flex items-start gap-2.5">
            <GitBranch className="w-4 h-4 text-[#8B929E] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-[#151923]">Sample Repository:</span>{' '}
              <span className="font-mono text-[11px] text-[#526BEE] bg-[#526BEE]/8 px-1.5 py-0.5 rounded">
                acme-store / store-api
              </span>
              <p className="text-[11px] text-[#8B929E] mt-0.5">
                FastAPI microservice with 14 source files, SQLAlchemy models, and pytest suites.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-[#8B929E] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-[#151923]">Precomputed Graph:</span>{' '}
              <span className="text-[#8B929E]">
                28 dependency edges across API, Service, Database, and Test layers.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-[#8B929E] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-[#151923]">Analysis Engine:</span>{' '}
              <span className="text-[#8B929E]">
                Deterministic offline matcher. Tests change queries without needing external API keys.
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#8B929E] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-[#151923]">Local Sandbox:</span>{' '}
              <span className="text-[#8B929E]">
                Stored in browser session. You can upload custom repositories or reset data at any time.
              </span>
            </div>
          </div>
        </div>

        {/* Sample Query Preview */}
        <div className="p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] text-[11px] font-mono space-y-1">
          <div className="text-[10px] uppercase font-bold text-[#8B929E] tracking-wider font-sans">
            Ready-to-test prompt
          </div>
          <div className="text-[#151923] font-medium">
            "Add 2FA confirmation endpoint to auth service"
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-1 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 text-xs font-semibold py-2.5 px-3 rounded-xl border border-[#E4E7E1] bg-white text-[#151923] hover:bg-[#F7F8F5] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirmDemo();
            }}
            className="flex-1 group inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>Enter Demo</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};
