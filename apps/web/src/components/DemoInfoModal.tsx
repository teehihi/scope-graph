import React, { useEffect } from 'react';
import { X, CheckCircle2, ArrowRight, ShieldCheck, Cpu, Database } from 'lucide-react';
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
  // Handle ESC key to close modal
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151923]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#F7F8F5] text-[#151923] rounded-2xl border border-[#E4E7E1] shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-[#151923] p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 shadow-inner">
              <ScopeGraphLogoMark dark size={26} />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#C7F36B] bg-[#C7F36B]/15 px-2 py-0.5 rounded-md">
                Interactive Environment
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                ScopeGraph Demo Mode
              </h2>
            </div>
          </div>
          <p className="text-xs text-[#8B929E] leading-relaxed max-w-md">
            Test full dependency graph visualizer and change impact analysis immediately with zero configuration.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E4E7E1] shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#526BEE]/10 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-[#151923]">Preloaded Microservices Repo</h3>
                <p className="text-[#8B929E] mt-0.5 leading-relaxed">
                  Includes a pre-indexed sample repository (`acme-store`) featuring FastAPI endpoints, SQLAlchemy ORM models, auth middleware, and pytest suites.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E4E7E1] shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#C7F36B]/20 text-[#151923] flex items-center justify-center shrink-0 mt-0.5">
                <Cpu className="w-4 h-4 text-[#151923]" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-[#151923]">Multi-Pass Impact Analysis</h3>
                <p className="text-[#8B929E] mt-0.5 leading-relaxed">
                  Run change queries like <code className="font-mono bg-[#EDF0F7] px-1 py-0.5 rounded text-[11px] text-[#151923]">Add 2FA confirmation endpoint</code> to see AST-grounded affected files, code evidence snippets, and test plans.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-[#E4E7E1] shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h3 className="font-bold text-[#151923]">100% In-Browser & Local</h3>
                <p className="text-[#8B929E] mt-0.5 leading-relaxed">
                  Uses deterministic offline providers. No external API keys, database setups, or credit card requirements needed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 text-[11px] text-[#8B929E] justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#526BEE]" />
            <span>Session stored locally. You can switch or upload your own repo at any time.</span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-xs font-semibold py-2.5 px-4 rounded-xl border border-[#E4E7E1] bg-white text-[#151923] hover:bg-[#EDF0F7] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirmDemo();
              }}
              className="flex-2 group inline-flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-lg hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shadow-sm"
            >
              <span>Launch Demo Session</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
