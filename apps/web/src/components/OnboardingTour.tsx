import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type TourPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  title: string;
  description: React.ReactNode;
  targetSelector: string;
  placement?: TourPlacement;
  spotlightPadding?: number;
  spotlightRadius?: number;
  interactiveTip?: React.ReactNode;
}

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  isOpen: boolean;
  steps: TourStep[];
  onClose: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
}

function renderFormattedInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-[#151923]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderFormattedText(content: React.ReactNode): React.ReactNode {
  if (typeof content !== 'string') return content;
  
  if (content.includes('\n')) {
    const lines = content.split('\n').filter(Boolean);
    return (
      <div className="space-y-1.5 pt-0.5">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
          const cleanText = isBullet ? trimmed.replace(/^[•\-*]\s*/, '') : trimmed;

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-0.5">
                <span className="text-[#526BEE] font-bold text-xs leading-relaxed shrink-0">•</span>
                <span className="leading-relaxed flex-1">{renderFormattedInline(cleanText)}</span>
              </div>
            );
          }
          return (
            <p key={idx} className="leading-relaxed">
              {renderFormattedInline(trimmed)}
            </p>
          );
        })}
      </div>
    );
  }

  return renderFormattedInline(content);
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  steps,
  onClose,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  const currentStep = steps[currentStepIndex];
  const padding = currentStep?.spotlightPadding ?? 10;
  const radius = currentStep?.spotlightRadius ?? 16;

  // Measure target element position
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    function computeTargetRect() {
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
        }, 120);
      } else {
        setTargetRect(null);
      }
    }

    computeTargetRect();
    window.addEventListener('resize', computeTargetRect, { passive: true });
    window.addEventListener('scroll', computeTargetRect, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', computeTargetRect);
      window.removeEventListener('scroll', computeTargetRect, true);
    };
  }, [isOpen, currentStepIndex, currentStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        if (currentStepIndex < steps.length - 1) {
          event.preventDefault();
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (event.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          event.preventDefault();
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, onClose]);

  // Dimensions for 4 click-catcher barriers around spotlight
  const boxTop = targetRect ? Math.max(0, targetRect.top - padding) : 0;
  const boxLeft = targetRect ? Math.max(0, targetRect.left - padding) : 0;
  const boxWidth = targetRect ? targetRect.width + padding * 2 : 0;
  const boxHeight = targetRect ? targetRect.height + padding * 2 : 0;
  const boxBottom = boxTop + boxHeight;
  const boxRight = boxLeft + boxWidth;

  // Intercept global clicks outside the target spotlight and tooltip card
  useEffect(() => {
    if (!isOpen || !targetRect || !currentStep) return;

    function handleGlobalClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Keep tour open if clicking inside the floating tooltip card
      if (target.closest('[role="dialog"]')) return;

      // Allow clicks on the active target element
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
      if (el && el.contains(target)) return;

      // Allow clicks inside the spotlight cutout bounding box
      const x = event.clientX;
      const y = event.clientY;
      const isInside =
        x >= boxLeft && x <= boxRight && y >= boxTop && y <= boxBottom;
      if (isInside) return;

      // Click occurred outside: close tour
      onClose();
    }

    window.addEventListener('click', handleGlobalClick, true);
    return () => window.removeEventListener('click', handleGlobalClick, true);
  }, [isOpen, targetRect, currentStep, boxLeft, boxRight, boxTop, boxBottom, onClose]);

  if (!isOpen || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      if (onComplete) onComplete();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] font-sans pointer-events-none select-none overflow-hidden">
      {targetRect && (
        <>
          {/* 4 Invisible click-catcher barriers */}
          {/* Top Barrier */}
          <div
            style={{ height: `${boxTop}px` }}
            className="absolute top-0 left-0 right-0 pointer-events-auto bg-transparent cursor-pointer"
            onClick={onClose}
          />
          {/* Bottom Barrier */}
          <div
            style={{ top: `${boxBottom}px` }}
            className="absolute bottom-0 left-0 right-0 pointer-events-auto bg-transparent cursor-pointer"
            onClick={onClose}
          />
          {/* Left Barrier */}
          <div
            style={{
              top: `${boxTop}px`,
              height: `${boxHeight}px`,
              width: `${boxLeft}px`,
            }}
            className="absolute left-0 pointer-events-auto bg-transparent cursor-pointer"
            onClick={onClose}
          />
          {/* Right Barrier */}
          <div
            style={{
              top: `${boxTop}px`,
              height: `${boxHeight}px`,
              left: `${boxRight}px`,
            }}
            className="absolute right-0 pointer-events-auto bg-transparent cursor-pointer"
            onClick={onClose}
          />

          {/* Spotlight Highlight Frame: Rounded cutout box with Electric Lime border & seamless curved dark backdrop */}
          {/* The 9999px box-shadow curves organically with the border-radius, eliminating sharp square corners */}
          <div
            style={{
              top: `${boxTop}px`,
              left: `${boxLeft}px`,
              width: `${boxWidth}px`,
              height: `${boxHeight}px`,
              borderRadius: `${radius}px`,
              boxShadow:
                '0 0 0 9999px rgba(21, 25, 35, 0.58), 0 0 0 2px #C7F36B, 0 0 22px 3px rgba(199, 243, 107, 0.45)',
            }}
            className="absolute pointer-events-none transition-[top,left,width,height,border-radius] duration-200 ease-out z-[9992]"
          />
        </>
      )}

      {/* Floating Tooltip Card */}
      <TooltipCard
        step={currentStep}
        currentStep={currentStepIndex}
        totalSteps={steps.length}
        targetRect={targetRect}
        padding={padding}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={onClose}
        onSkip={onSkip ?? onClose}
      />
    </div>
  );
};

interface TooltipCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: SpotlightRect | null;
  padding: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onSkip: () => void;
}

const TooltipCard: React.FC<TooltipCardProps> = ({
  step,
  currentStep,
  totalSteps,
  targetRect,
  padding,
  onNext,
  onPrev,
  onClose,
  onSkip,
}) => {
  const { t } = useLanguage();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    arrowLeft?: number;
    arrowTop?: number;
    arrowPlacement: 'top' | 'bottom' | 'left' | 'right';
  }>({
    top: 100,
    left: 20,
    arrowLeft: 40,
    arrowTop: 40,
    arrowPlacement: 'top',
  });

  useEffect(() => {
    function computePosition() {
      if (!tooltipRef.current) return;
      const tooltipEl = tooltipRef.current;
      const tooltipWidth = tooltipEl.offsetWidth || 380;
      const tooltipHeight = tooltipEl.offsetHeight || 220;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 14;

      if (!targetRect) {
        setPosition({
          top: Math.max(16, (viewportHeight - tooltipHeight) / 2),
          left: Math.max(16, (viewportWidth - tooltipWidth) / 2),
          arrowLeft: tooltipWidth / 2,
          arrowTop: tooltipHeight / 2,
          arrowPlacement: 'top',
        });
        return;
      }

      const boxTop = Math.max(0, targetRect.top - padding);
      const boxBottom = targetRect.top + targetRect.height + padding;
      const boxHeight = targetRect.height + padding * 2;
      const boxLeft = Math.max(0, targetRect.left - padding);
      const boxWidth = targetRect.width + padding * 2;
      const boxRight = boxLeft + boxWidth;
      const targetCenterX = boxLeft + boxWidth / 2;
      const targetCenterY = boxTop + boxHeight / 2;

      const spaceBelow = viewportHeight - boxBottom;
      const spaceAbove = boxTop;
      const spaceLeft = boxLeft;
      const spaceRight = viewportWidth - boxRight;

      let placement = step.placement ?? 'auto';
      if (placement === 'auto') {
        if (spaceBelow >= tooltipHeight + gap + 16) {
          placement = 'bottom';
        } else if (spaceAbove >= tooltipHeight + gap + 16) {
          placement = 'top';
        } else if (spaceRight >= tooltipWidth + gap + 16) {
          placement = 'right';
        } else if (spaceLeft >= tooltipWidth + gap + 16) {
          placement = 'left';
        } else {
          placement = spaceBelow >= spaceAbove ? 'bottom' : 'top';
        }
      }

      let top = 0;
      let left = 0;
      let arrowPlacement: 'top' | 'bottom' | 'left' | 'right' = 'top';
      let arrowLeft = tooltipWidth / 2;
      let arrowTop = tooltipHeight / 2;

      if (placement === 'right') {
        if (spaceRight >= tooltipWidth + gap + 16) {
          left = boxRight + gap;
          top = Math.max(16, Math.min(targetCenterY - tooltipHeight / 2, viewportHeight - tooltipHeight - 16));
          arrowPlacement = 'left';
          arrowTop = Math.max(24, Math.min(targetCenterY - top, tooltipHeight - 24));
        } else {
          placement = spaceBelow >= spaceAbove ? 'bottom' : 'top';
        }
      } else if (placement === 'left') {
        if (spaceLeft >= tooltipWidth + gap + 16) {
          left = boxLeft - tooltipWidth - gap;
          top = Math.max(16, Math.min(targetCenterY - tooltipHeight / 2, viewportHeight - tooltipHeight - 16));
          arrowPlacement = 'right';
          arrowTop = Math.max(24, Math.min(targetCenterY - top, tooltipHeight - 24));
        } else {
          placement = spaceBelow >= spaceAbove ? 'bottom' : 'top';
        }
      }

      if (placement === 'top') {
        top = Math.max(16, boxTop - tooltipHeight - gap);
        left = Math.max(
          16,
          Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - 16)
        );
        arrowPlacement = 'bottom';
        arrowLeft = Math.max(24, Math.min(targetCenterX - left, tooltipWidth - 24));
      } else if (placement === 'bottom') {
        top = Math.min(viewportHeight - tooltipHeight - 16, boxBottom + gap);
        left = Math.max(
          16,
          Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - 16)
        );
        arrowPlacement = 'top';
        arrowLeft = Math.max(24, Math.min(targetCenterX - left, tooltipWidth - 24));
      }

      setPosition({
        top,
        left,
        arrowLeft,
        arrowTop,
        arrowPlacement,
      });
    }

    computePosition();
    window.addEventListener('resize', computePosition, { passive: true });
    window.addEventListener('scroll', computePosition, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', computePosition, true);
    };
  }, [targetRect, step, padding]);

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-modal="false"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="pointer-events-auto z-[9995] w-[calc(100vw-32px)] sm:w-[390px] max-w-[430px] rounded-3xl border border-[#E4E7E1] bg-white p-5 sm:p-6 shadow-2xl shadow-slate-950/25 transition-[top,left] duration-200 ease-out animate-in fade-in zoom-in-95 space-y-4"
    >
      {/* Tooltip Arrow Indicator */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={
            position.arrowPlacement === 'top' || position.arrowPlacement === 'bottom'
              ? { left: `${position.arrowLeft}px`, transform: 'translateX(-50%)' }
              : { top: `${position.arrowTop}px`, transform: 'translateY(-50%)' }
          }
          className={`absolute size-3.5 rotate-45 bg-white ${
            position.arrowPlacement === 'top'
              ? '-top-1.5'
              : position.arrowPlacement === 'bottom'
              ? '-bottom-1.5'
              : position.arrowPlacement === 'left'
              ? '-left-1.5'
              : '-right-1.5'
          }`}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] p-1 flex items-center justify-center shrink-0">
            <img
              src="/brand/scout-wave.gif"
              alt="Scout"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/brand/scout-default.svg';
              }}
            />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full bg-[#151923] px-2 py-0.5 text-[10px] font-mono font-bold text-[#C7F36B] uppercase tracking-wider">
              {t('tour.step')} {currentStep + 1} {t('tour.of')} {totalSteps}
            </span>
            <h3 className="text-sm font-bold text-[#151923] tracking-tight mt-0.5">
              {step.title}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t('tour.close')}
          className="text-[#8B929E] hover:text-[#151923] p-1.5 rounded-lg hover:bg-[#F7F8F5] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <div className="text-xs text-[#151923] leading-relaxed">
        {renderFormattedText(step.description)}
      </div>

      {/* Interactive tip badge */}
      {step.interactiveTip && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#C7F36B]/50 bg-[#F7F8F5] p-3 text-[11px] text-[#151923]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#526BEE] mt-0.5" />
          <div className="leading-relaxed flex-1 min-w-0">{renderFormattedText(step.interactiveTip)}</div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between gap-2 border-t border-[#E4E7E1] pt-3">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-[#8B929E] hover:text-[#151923] transition-colors cursor-pointer"
        >
          {t('tour.skip')}
        </button>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center gap-1 rounded-xl border border-[#E4E7E1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#151923] hover:bg-[#F7F8F5] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('tour.back')}
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[#151923] px-3.5 py-1.5 text-xs font-bold text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] transition-all cursor-pointer shadow-xs"
          >
            <span>{isLastStep ? t('tour.finish') : t('tour.next')}</span>
            {isLastStep ? (
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
