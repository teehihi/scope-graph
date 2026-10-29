import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal, RotateCcw, Paperclip, ImageIcon, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface RequirementPanelProps {
  onAnalyze: (requirement: string, screenshot?: File | null) => void;
  isAnalyzing: boolean;
  hasReport: boolean;
  onClear: () => void;
  activeRepoName: string | null;
}

export const RequirementPanel: React.FC<RequirementPanelProps> = ({
  onAnalyze,
  isAnalyzing,
  hasReport,
  onClear,
  activeRepoName,
}) => {
  const { t } = useLanguage();
  const defaultReq = t('dash.default_req');
  const [requirement, setRequirement] = useState(defaultReq);
  const prevDefaultRef = useRef(defaultReq);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multimodal screenshot attachment state
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  useEffect(() => {
    if (requirement === prevDefaultRef.current) {
      setRequirement(defaultReq);
    }
    prevDefaultRef.current = defaultReq;
  }, [defaultReq]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  // Auto-resize textarea according to its content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.max(24, Math.min(el.scrollHeight, 200));
    el.style.height = `${newHeight}px`;
  }, [requirement]);

  const presets = [
    { label: t('dash.preset_email_label'), req: t('dash.preset_email_req') },
    { label: t('dash.preset_rate_label'), req: t('dash.preset_rate_req') },
    { label: t('dash.preset_token_label'), req: t('dash.preset_token_req') },
  ];

  const handleFileSelect = (file: File) => {
    setFormatError(null);
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setFormatError(t('impact.screenshot_format_error'));
      return;
    }
    // Max 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setFormatError(t('impact.screenshot_format_error'));
      return;
    }

    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setScreenshot(file);
    setScreenshotPreview(previewUrl);
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshot(null);
    setScreenshotPreview(null);
    setFormatError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    handleRemoveScreenshot();
    onClear();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim() || isAnalyzing) return;
    onAnalyze(requirement.trim(), screenshot);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelect(file);
          break;
        }
      }
    }
  };

  return (
    <div className="bg-white border-b border-[#E4E7E1] p-3.5 sm:p-5 shadow-2xs">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Header row: Title (clean & concise on mobile) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#151923] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Terminal className="w-3.5 h-3.5 text-[#526BEE]" />
              <span>{t('impact.proposed_req')}</span>
            </span>
            {activeRepoName && (
              <span className="hidden sm:flex text-[11px] font-mono text-slate-600 bg-[#F7F8F5] border border-[#E4E7E1] px-2.5 py-0.5 rounded-lg max-w-xs shadow-2xs items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[#8B929E] text-[10px]">{t('impact.target')}:</span>
                <strong className="text-[#151923] truncate">{activeRepoName}</strong>
              </span>
            )}
          </div>

          {/* Quick preset suggestions bar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs">
            <span className="text-[11px] text-[#8B929E] font-medium shrink-0">
              {t('impact.examples')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRequirement(item.req)}
                  className="shrink-0 text-[11px] font-mono text-[#151923] bg-[#F7F8F5] hover:bg-[#EBFACD] border border-[#E4E7E1] hover:border-[#C7F36B] px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-[0.98] font-medium"
                  title={item.req}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Prompt Textarea Card with Drag & Drop & Paste Support */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className={`relative rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${
              isDragging
                ? 'border-[#526BEE] bg-blue-50/40 shadow-md ring-2 ring-[#526BEE]/20'
                : 'border-[#E4E7E1] bg-white focus-within:border-[#151923] focus-within:shadow-md'
            }`}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-[#526BEE]/10 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-[#526BEE] bg-white px-3 py-1.5 rounded-xl border border-[#526BEE]/30 shadow-sm flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  {t('impact.drop_image_hint')}
                </span>
              </div>
            )}

            <div className="p-3.5 sm:p-4">
              <label htmlFor="requirement-input" className="sr-only">
                {t('impact.proposed_req')}
              </label>
              <textarea
                id="requirement-input"
                ref={textareaRef}
                rows={1}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={t('dash.input_placeholder')}
                className="w-full text-xs sm:text-sm font-medium bg-transparent focus:outline-none text-[#151923] placeholder:text-slate-400 resize-none leading-relaxed min-h-[26px] max-h-[220px] block overflow-y-auto"
              />
            </div>

            {/* Attached Screenshot Preview Chip */}
            {screenshotPreview && screenshot && (
              <div className="mx-3.5 sm:mx-4 mb-3 p-2 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot attachment"
                    className="w-10 h-10 object-cover rounded-lg border border-[#E4E7E1] shrink-0 bg-white shadow-2xs"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#151923] truncate max-w-[200px] sm:max-w-xs">
                        {screenshot.name}
                      </span>
                      <span className="text-[10px] font-mono text-[#8B929E]">
                        ({Math.round(screenshot.size / 1024)} KB)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveScreenshot}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-[#8B929E] hover:text-[#E5484D] transition-colors cursor-pointer shrink-0"
                  title={t('impact.remove_screenshot')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error banner if format or size is invalid */}
            {formatError && (
              <div className="mx-3.5 sm:mx-4 mb-3 p-2 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formatError}</span>
              </div>
            )}

            {/* Bottom Action Strip */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-t border-[#E4E7E1] bg-[#F7F8F5]">
              <div className="flex items-center gap-2">
                {/* File Attachment Trigger */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    screenshot
                      ? 'bg-[#EBFACD] text-[#151923] border border-[#C7F36B] shadow-2xs'
                      : 'text-slate-500 hover:text-[#151923] hover:bg-slate-200/60'
                  }`}
                  title={t('impact.attach_screenshot')}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <span className="text-[11px] text-[#8B929E] hidden md:flex items-center gap-1 font-mono">
                  {t('impact.key_hint_enter')}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
                {hasReport && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="h-9 px-3 rounded-xl border border-[#E4E7E1] bg-white hover:bg-slate-100 text-slate-600 hover:text-[#151923] text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    title={t('impact.reset_analysis')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-xs">{t('impact.reset_analysis')}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!requirement.trim() || isAnalyzing}
                  className="flex-1 sm:flex-initial h-9 px-4 sm:px-5 rounded-xl bg-[#151923] text-white hover:bg-slate-800 active:bg-black text-xs font-bold transition-all shadow-sm disabled:opacity-75 flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  {isAnalyzing ? (
                    <>
                      <img src="/brand/scout-exploring.gif" alt="Scout analyzing" className="w-4 h-4 rounded-full" />
                      <span className="flex items-center gap-1.5">
                        <span>{t('impact.tracing').replace(/\.{2,}$/, '')}</span>
                        <span className="inline-flex items-center gap-1 ml-0.5" aria-hidden="true">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] animate-bounce [animation-delay:-0.32s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] animate-bounce [animation-delay:-0.16s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] animate-bounce" />
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-[#C7F36B] text-[#C7F36B]" />
                      <span>{t('impact.analyze_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
