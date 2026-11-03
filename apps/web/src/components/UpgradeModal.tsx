import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession, fetchSubscription } from '../api/client';
import { useRouter } from '../router';
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
  LoaderCircle,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { user, isLoading: isAuthLoading, updateUser } = useAuth();
  const { navigate } = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<'plus' | 'pro' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const activePlan = user ? user.plan : 'free';
  const autoCheckoutHandled = useRef(false);

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
      setCheckoutError(null);
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

  const handleSelectPlan = async (plan: 'free' | 'plus' | 'pro') => {
    if (plan === 'free' || checkoutPlan || isAuthLoading || activePlan === plan) return;
    if (!user) {
      const returnTo = `/?pricing=true&checkout=${plan}`;
      navigate(`/login?redirect=${encodeURIComponent(returnTo)}`);
      return;
    }

    setCheckoutError(null);
    setCheckoutPlan(plan);
    try {
      const session = await createCheckoutSession(plan, user.email);
      window.location.assign(session.checkout_url);
    } catch {
      setCheckoutPlan(null);
      setCheckoutError(t('pricing.checkout_failed'));
    }
  };

  useEffect(() => {
    if (!isOpen || isAuthLoading || !user?.email || autoCheckoutHandled.current) return;
    const requestedPlan = new URLSearchParams(window.location.search).get('checkout');
    if (requestedPlan !== 'plus' && requestedPlan !== 'pro') return;

    autoCheckoutHandled.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    void fetchSubscription(user.email)
      .then((subscription) => {
        if (subscription.plan === requestedPlan) {
          updateUser({ plan: subscription.plan });
          return;
        }
        void handleSelectPlan(requestedPlan);
      })
      .catch(() => setCheckoutError(t('pricing.checkout_failed')));
  }, [isOpen, isAuthLoading, user?.email]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleDialogClick}
      aria-labelledby="upgrade-dialog-title"
      aria-describedby="upgrade-dialog-desc"
      className="m-auto rounded-[32px] border border-slate-200/80 bg-white/95 backdrop-blur-xl p-0 text-[#151923] shadow-2xl shadow-slate-900/30 backdrop:bg-slate-950/70 backdrop:backdrop-blur-md max-w-5xl w-full max-h-[92vh] overflow-y-auto overscroll-contain outline-none transition-all"
    >
      <div className="relative p-6 sm:p-10">
        {/* Subtle Ambient Background Glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-gradient-to-b from-[#C7F36B]/15 via-[#526BEE]/10 to-transparent blur-3xl pointer-events-none rounded-full"
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('pricing.close')}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="relative text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tracking-wide mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C7F36B]" />
            <span>{t('pricing.nav_title')}</span>
          </div>

          <h2 id="upgrade-dialog-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('pricing.modal_title')}
          </h2>
          <p id="upgrade-dialog-desc" className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            {t('pricing.modal_desc')}
          </p>

          {checkoutError && (
            <div role="alert" className="mt-3 text-xs font-semibold text-rose-700">
              {checkoutError}
            </div>
          )}
        </div>

        {/* 3 Tier Cards Grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
          {/* TIER 1: COMMUNITY FREE */}
          <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-slate-900">{t('pricing.free_title')}</h3>
                {activePlan === 'free' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {t('pricing.current_plan_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 min-h-[36px]">{t('pricing.free_desc')}</p>

              {/* Price */}
              <div className="my-5">
                <span className="text-3xl font-extrabold text-slate-900">{t('pricing.free_price')}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">{t('pricing.free_period')}</span>
              </div>

              {/* Features */}
              <div className="space-y-3 border-t border-slate-200/70 pt-5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_scans_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_ai_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_models_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_vision_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_voice_free')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_support_free')}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              disabled
              className="w-full mt-7 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 text-xs font-bold cursor-default shadow-2xs text-center"
            >
              {t('pricing.free_cta')}
            </button>
          </div>

          {/* TIER 2: DEVELOPER PLUS (FEATURED / HIGH-END DARK CARD) */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-[#151923] text-white shadow-xl shadow-slate-900/25 relative sm:-translate-y-2 sm:scale-[1.02] border border-slate-700 transition-all duration-300">
            {/* Top Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#C7F36B] text-[#151923] text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1 shadow-md">
              <Zap className="w-3 h-3 fill-current" />
              <span>{t('pricing.plus_badge')}</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-base text-white">{t('pricing.plus_title')}</h3>
                {activePlan === 'plus' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] border border-[#C7F36B]/40">
                    {t('pricing.current_plan_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 min-h-[36px]">{t('pricing.plus_desc')}</p>

              {/* Price */}
              <div className="my-5">
                <span className="text-3xl font-extrabold text-[#C7F36B]">
                  {t('pricing.plus_price_monthly')}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">{t('pricing.plus_period')}</span>
              </div>

              {/* Features */}
              <div className="space-y-3 border-t border-slate-800 pt-5 text-xs text-slate-200">
                <div className="flex items-start gap-2.5 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_scans_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_ai_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-2.5 h-2.5" />
                  </div>
                  <span>{t('pricing.feature_models_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Eye className="w-2.5 h-2.5" />
                  </div>
                  <span>{t('pricing.feature_vision_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Mic className="w-2.5 h-2.5" />
                  </div>
                  <span>{t('pricing.feature_voice_plus')}</span>
                </div>
                <div className="flex items-start gap-2.5 font-medium">
                  <div className="w-4 h-4 rounded-full bg-[#C7F36B]/20 text-[#C7F36B] flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-2.5 h-2.5" />
                  </div>
                  <span>{t('pricing.feature_support_plus')}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={() => void handleSelectPlan('plus')}
              disabled={isAuthLoading || checkoutPlan !== null || activePlan === 'plus'}
              className={`w-full mt-7 py-3 rounded-xl transition-all text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm ${activePlan === 'plus' ? 'bg-slate-200 text-slate-500 cursor-default' : 'bg-[#C7F36B] text-[#151923] hover:bg-[#d6f88d] hover:shadow-lg hover:shadow-[#C7F36B]/30 active:scale-[0.99] cursor-pointer group'}`}
            >
              {activePlan === 'plus' ? (
                <span>{t('pricing.current_plan_badge')}</span>
              ) : checkoutPlan === 'plus' ? (
                <><LoaderCircle className="w-3.5 h-3.5 animate-spin" /><span>{t('pricing.checkout_loading')}</span></>
              ) : (
                <><span>{t('pricing.plus_cta')}</span><ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </div>

          {/* TIER 3: TEAM & ENTERPRISE PRO */}
          <div className="flex flex-col justify-between p-6 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-base text-slate-900">{t('pricing.pro_title')}</h3>
                {activePlan === 'pro' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#526BEE] border border-indigo-200">
                    {t('pricing.current_plan_badge')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 min-h-[36px]">{t('pricing.pro_desc')}</p>

              {/* Price */}
              <div className="my-5">
                <span className="text-3xl font-extrabold text-slate-900">
                  {t('pricing.pro_price_monthly')}
                </span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">{t('pricing.pro_period')}</span>
              </div>

              {/* Features */}
              <div className="space-y-3 border-t border-slate-200/70 pt-5 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_scans_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_ai_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-2.5 h-2.5" />
                  </div>
                  <span>{t('pricing.feature_models_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_vision_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                    <Crown className="w-2.5 h-2.5" />
                  </div>
                  <span>{t('pricing.feature_voice_pro')}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#526BEE] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span>{t('pricing.feature_support_pro')}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              type="button"
              onClick={() => void handleSelectPlan('pro')}
              disabled={isAuthLoading || checkoutPlan !== null || activePlan === 'pro'}
              className={`w-full mt-7 py-2.5 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs ${activePlan === 'pro' ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-default' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 cursor-pointer'}`}
            >
              {activePlan === 'pro' ? (
                <span>{t('pricing.current_plan_badge')}</span>
              ) : checkoutPlan === 'pro' ? (
                <><LoaderCircle className="w-3.5 h-3.5 animate-spin" /><span>{t('pricing.checkout_loading')}</span></>
              ) : (
                <><span>{t('pricing.pro_cta')}</span><ArrowRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>

      </div>
    </dialog>
  );
};
