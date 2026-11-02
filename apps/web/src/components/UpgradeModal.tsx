import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Check,
  Zap,
  Sparkles,
  Shield,
  Crown,
  Cpu,
  Eye,
  Mic,
  Activity,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [activePlan, setActivePlan] = useState<'free' | 'plus' | 'pro'>('free');
  const [upgradedMessage, setUpgradedMessage] = useState<string | null>(null);

  // Manage native <dialog> lifecycle
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      setUpgradedMessage(null);
    }
  }, [isOpen]);

  // Handle native cancel event (Esc key)
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  // Light dismiss on backdrop click
  const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleSelectPlan = (plan: 'free' | 'plus' | 'pro') => {
    if (plan === 'free') return;
    setActivePlan(plan);
    const planName = plan === 'plus' ? t('pricing.plus_title') : t('pricing.pro_title');
    setUpgradedMessage(t('pricing.upgrade_success', { plan: planName }));
    setTimeout(() => {
      setUpgradedMessage(null);
    }, 4000);
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleDialogClick}
      aria-labelledby="upgrade-dialog-title"
      aria-describedby="upgrade-dialog-desc"
      className="m-auto rounded-3xl border border-[#E4E7E1] bg-[#F7F8F5] p-0 text-[#151923] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm max-w-5xl w-full max-h-[92vh] overflow-y-auto overscroll-contain animate-in fade-in-0 zoom-in-95 duration-200 outline-none"
    >
      <div className="relative p-6 sm:p-10">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pricing.close')}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#8B929E] hover:text-[#151923] hover:bg-[#E4E7E1]/50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B] text-[11px] font-bold tracking-wide uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#151923]" />
            <span>{t('pricing.nav_title')}</span>
          </div>
          <h2 id="upgrade-dialog-title" className="text-2xl sm:text-3xl font-extrabold text-[#151923] tracking-tight">
            {t('pricing.modal_title')}
          </h2>
          <p id="upgrade-dialog-desc" className="text-xs sm:text-sm text-[#8B929E] mt-2 leading-relaxed">
            {t('pricing.modal_desc')}
          </p>

          {/* Billing Cycle Switcher */}
          <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-xl bg-white border border-[#E4E7E1] shadow-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-[#151923] text-white shadow-xs'
                  : 'text-[#8B929E] hover:text-[#151923]'
              }`}
            >
              {t('pricing.cycle_monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annually')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annually'
                  ? 'bg-[#151923] text-white shadow-xs'
                  : 'text-[#8B929E] hover:text-[#151923]'
              }`}
            >
              <span>{t('pricing.cycle_annually')}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#C7F36B] text-[#151923] font-extrabold">
                {t('pricing.save_20')}
              </span>
            </button>
          </div>

          {/* Success Banner */}
          {upgradedMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{upgradedMessage}</span>
            </div>
          )}
        </div>

        {/* 3 Tier Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* TIER 1: FREE */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl border-2 border-[#E4E7E1] bg-white relative transition-all duration-200 hover:border-slate-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-[#151923]">{t('pricing.free_title')}</h3>
                {activePlan === 'free' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {t('pricing.current_plan_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B929E] min-h-[36px]">{t('pricing.free_desc')}</p>

              {/* Price */}
              <div className="my-6">
                <span className="text-3xl font-extrabold text-[#151923]">{t('pricing.free_price')}</span>
                <span className="text-xs text-[#8B929E] ml-1.5 font-medium">{t('pricing.free_period')}</span>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 border-t border-[#E4E7E1] pt-5 text-xs text-[#151923]">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_scans_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_ai_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_models_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_vision_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_voice_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_support_free')}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              disabled
              className="w-full mt-8 py-3 rounded-xl border border-[#E4E7E1] bg-slate-50 text-slate-400 text-xs font-bold cursor-not-allowed text-center"
            >
              {t('pricing.free_cta')}
            </button>
          </div>

          {/* TIER 2: DEVELOPER PLUS (POPULAR) */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl border-2 border-[#151923] bg-white relative shadow-xl shadow-[#C7F36B]/15 transition-all duration-200 hover:-translate-y-1">
            {/* Top Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#151923] text-[#C7F36B] border border-[#C7F36B]/40 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 shadow-sm">
              <Zap className="w-3 h-3 text-[#C7F36B]" />
              <span>{t('pricing.plus_badge')}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-base text-[#151923]">{t('pricing.plus_title')}</h3>
                {activePlan === 'plus' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBFACD] text-[#151923] border border-[#C7F36B]">
                    {t('pricing.current_plan_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B929E] min-h-[36px]">{t('pricing.plus_desc')}</p>

              {/* Price */}
              <div className="my-6">
                <span className="text-3xl font-extrabold text-[#151923]">
                  {billingCycle === 'monthly' ? t('pricing.plus_price_monthly') : t('pricing.plus_price_annual')}
                </span>
                <span className="text-xs text-[#8B929E] ml-1.5 font-medium">{t('pricing.plus_period')}</span>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 border-t border-[#E4E7E1] pt-5 text-xs text-[#151923]">
                <div className="flex items-start gap-2.5 font-medium">
                  <Check className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_scans_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <Check className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_ai_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <Cpu className="w-4 h-4 text-[#151923] shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_models_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <Eye className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_vision_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <Mic className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_voice_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <Activity className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_support_plus')}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={() => handleSelectPlan('plus')}
              className="w-full mt-8 py-3 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-lg hover:shadow-[#C7F36B]/30 active:scale-[0.99] transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{t('pricing.plus_cta')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* TIER 3: PRO / ENTERPRISE */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl border-2 border-[#E4E7E1] bg-white relative transition-all duration-200 hover:border-[#526BEE]/50 hover:-translate-y-1">
            {/* Top Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-50 text-[#526BEE] border border-[#526BEE]/30 text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#526BEE]" />
              <span>{t('pricing.pro_badge')}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-[#151923]">{t('pricing.pro_title')}</h3>
                {activePlan === 'pro' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#526BEE]/10 text-[#526BEE] border border-[#526BEE]/30">
                    {t('pricing.current_plan_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B929E] min-h-[36px]">{t('pricing.pro_desc')}</p>

              {/* Price */}
              <div className="my-6">
                <span className="text-3xl font-extrabold text-[#151923]">
                  {billingCycle === 'monthly' ? t('pricing.pro_price_monthly') : t('pricing.pro_price_annual')}
                </span>
                <span className="text-xs text-[#8B929E] ml-1.5 font-medium">{t('pricing.pro_period')}</span>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 border-t border-[#E4E7E1] pt-5 text-xs text-[#151923]">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_scans_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_ai_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-[#526BEE] shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_models_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_vision_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_voice_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t('pricing.feature_support_pro')}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={() => handleSelectPlan('pro')}
              className="w-full mt-8 py-3 rounded-xl border-2 border-[#151923] bg-white text-[#151923] hover:bg-[#151923] hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{t('pricing.pro_cta')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Footer Guarantee Note */}
        <div className="mt-8 text-center text-xs text-[#8B929E] flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Meta Model API Hackathon Compliant • 100% Deterministic Code Grounding</span>
        </div>
      </div>
    </dialog>
  );
};
