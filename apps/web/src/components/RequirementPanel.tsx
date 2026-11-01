import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal, RotateCcw, Paperclip, ImageIcon, X, AlertCircle, Mic, MicOff, Sparkles, HelpCircle, Check, Palette, Ruler, Type, Move, Circle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VoiceStreamer } from '../utils/audioStreamer';
import { sendVoiceRequirement, refineRequirement, interpretScreenshotPreview, openRealtimeVoiceStream, RealtimeVoiceStream } from '../api/client';
import { ScreenshotPreviewResponse, SuggestedOption } from '../types';

interface RequirementPanelProps {
  onAnalyze: (requirement: string, screenshot?: File | null) => void;
  isAnalyzing: boolean;
  hasReport: boolean;
  onClear: () => void;
  activeRepoName: string | null;
  activeRepoId?: string | null;
}

type VoiceState = 'idle' | 'listening' | 'transcribing' | 'refining' | 'ready';

export const RequirementPanel: React.FC<RequirementPanelProps> = ({
  onAnalyze,
  isAnalyzing,
  hasReport,
  onClear,
  activeRepoName,
  activeRepoId,
}) => {
  const { t, language } = useLanguage();
  const defaultReq = t('dash.default_req');
  const [requirement, setRequirement] = useState(defaultReq);
  const prevDefaultRef = useRef(defaultReq);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multimodal screenshot attachment state
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotInsight, setScreenshotInsight] = useState<ScreenshotPreviewResponse | null>(null);
  const [isLoadingScreenshotInsight, setIsLoadingScreenshotInsight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Voice requirement state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [refinedRequirement, setRefinedRequirement] = useState<string>('');
  const [activeView, setActiveView] = useState<'refined' | 'original'>('refined');
  const [ambiguities, setAmbiguities] = useState<string[]>([]);
  const [suggestedColors, setSuggestedColors] = useState<{ name: string; hex: string }[]>([]);
  const [suggestedOptions, setSuggestedOptions] = useState<SuggestedOption[]>([]);
  const [voiceLatency, setVoiceLatency] = useState<{
    transcription: number;
    refinement: number;
    total: number;
    model: string;
  } | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const streamerRef = useRef<VoiceStreamer | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const voiceStreamRef = useRef<RealtimeVoiceStream | null>(null);
  const voiceStartedAtRef = useRef<number>(0);

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
      if (streamerRef.current) {
        streamerRef.current.stop();
      }
      voiceStreamRef.current?.close();
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
  const handleFileSelect = async (file: File) => {
    setFormatError(null);
    setScreenshotInsight(null);
    const validTypes = ['image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setFormatError(t('impact.screenshot_format_error'));
      return;
    }
    if (file.size > 5_000_000) {
      setFormatError(t('impact.screenshot_format_error'));
      return;
    }

    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setScreenshot(file);
    setScreenshotPreview(previewUrl);

    // Call background preview reading
    if (activeRepoId) {
      setIsLoadingScreenshotInsight(true);
      try {
        const insight = await interpretScreenshotPreview(activeRepoId, file, requirement);
        setScreenshotInsight(insight);
      } catch {
        // Non-blocking fallback
      } finally {
        setIsLoadingScreenshotInsight(false);
      }
    }
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshot(null);
    setScreenshotPreview(null);
    setScreenshotInsight(null);
    setFormatError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    handleRemoveScreenshot();
    setVoiceState('idle');
    setRawTranscript('');
    setRefinedRequirement('');
    setAmbiguities([]);
    setSuggestedColors([]);
    setSuggestedOptions([]);
    setVoiceLatency(null);
    setVoiceError(null);
    audioBlobRef.current = null;
    voiceStreamRef.current?.close();
    voiceStreamRef.current = null;
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

  // Start Voice Streaming & Recording
  const handleStartVoice = async () => {
    if (!activeRepoId) return;
    setVoiceError(null);
    setRequirement('');
    setRawTranscript('');
    setRefinedRequirement('');
    setAmbiguities([]);
    setSuggestedColors([]);
    setSuggestedOptions([]);
    setVoiceLatency(null);
    audioBlobRef.current = null;
    setVoiceState('listening');

    try {
      voiceStreamRef.current = await openRealtimeVoiceStream(activeRepoId, language, (transcript) => {
        setRequirement(transcript);
      });
    } catch {
      // Continue recording; the complete audio can still use the online file transcription endpoint.
      voiceStreamRef.current = null;
    }
    voiceStartedAtRef.current = Date.now();

    const streamer = new VoiceStreamer({
      onAutoStop: (audioBlob) => {
        streamerRef.current = null;
        audioBlobRef.current = audioBlob;
        void processRecordedAudio(audioBlob);
      },
      onError: (err) => {
        setVoiceError(err.message || 'Voice input failed');
        setVoiceState('idle');
      },
      onStateChange: (state) => {
        setVoiceState(state);
      },
      onAudioFrame: (frame) => voiceStreamRef.current?.sendAudio(frame),
    });

    streamerRef.current = streamer;
    try {
      await streamer.start();
    } catch (err: any) {
      setVoiceError(err.message || 'Could not access microphone');
      setVoiceState('idle');
    }
  };

  const processRecordedAudio = async (audioBlob: Blob) => {
    if (!activeRepoId) return;
    setVoiceError(null);
    setVoiceState('transcribing');
    let transcript = '';
    const liveStream = voiceStreamRef.current;
    voiceStreamRef.current = null;
    try {
      if (liveStream) {
        try {
          transcript = (await liveStream.finish()).trim();
        } finally {
          liveStream.close();
        }
      }

      if (!transcript) {
        const res = await sendVoiceRequirement(activeRepoId, audioBlob, language, language);
        setRawTranscript(res.raw_transcript);
        setRefinedRequirement(res.refinement_error ? '' : res.refined_requirement);
        setAmbiguities(res.ambiguities || []);
        setSuggestedColors(res.suggested_colors || []);
        setSuggestedOptions(res.suggested_options || []);
        setRequirement(res.refinement_error ? res.raw_transcript : res.refined_requirement);
        setActiveView(res.refinement_error ? 'original' : 'refined');
        setVoiceLatency({
          transcription: res.durations_seconds.transcription,
          refinement: res.durations_seconds.refinement,
          total: res.durations_seconds.total,
          model: res.models_used.refinement
            ? `${res.models_used.transcription} + ${res.models_used.refinement}`
            : res.models_used.transcription,
        });
        setVoiceError(res.refinement_error || null);
        setVoiceState('ready');
        return;
      }

      setRawTranscript(transcript);
      setRequirement(transcript);
      setVoiceState('refining');
      try {
        const res = await refineRequirement(activeRepoId, transcript, language);
        setRefinedRequirement(res.refinement_error ? '' : res.refined_requirement);
        setAmbiguities(res.ambiguities || []);
        setSuggestedColors(res.suggested_colors || []);
        setSuggestedOptions(res.suggested_options || []);
        setRequirement(res.refinement_error ? transcript : res.refined_requirement);
        setActiveView(res.refinement_error ? 'original' : 'refined');
        setVoiceError(res.refinement_error || null);
        const transcriptionDuration = Math.max(0, (Date.now() - voiceStartedAtRef.current) / 1000);
        setVoiceLatency({
          transcription: transcriptionDuration,
          refinement: res.duration_seconds,
          total: transcriptionDuration + res.duration_seconds,
          model: res.models_used.refinement,
        });
      } catch (error: any) {
        setRefinedRequirement('');
        setVoiceError(error.message || 'Online AI refinement failed. The transcript is preserved; retry refinement.');
      }
      setVoiceState('ready');
    } catch (err: any) {
      try {
        const res = await sendVoiceRequirement(activeRepoId, audioBlob, language, language);
        setRawTranscript(res.raw_transcript);
        setRefinedRequirement(res.refinement_error ? '' : res.refined_requirement);
        setAmbiguities(res.ambiguities || []);
        setSuggestedColors(res.suggested_colors || []);
        setSuggestedOptions(res.suggested_options || []);
        setRequirement(res.refinement_error ? res.raw_transcript : res.refined_requirement);
        setActiveView(res.refinement_error ? 'original' : 'refined');
        setVoiceError(res.refinement_error || null);
        setVoiceState('ready');
      } catch (fallbackError: any) {
        if (typeof fallbackError.rawTranscript === 'string' && fallbackError.rawTranscript.trim()) {
          setRawTranscript(fallbackError.rawTranscript);
          setRequirement(fallbackError.rawTranscript);
        }
        setVoiceError(fallbackError.message || err.message || 'Voice processing failed');
        setVoiceState('ready');
      }
    }
  };

  // Stop recording and send the complete audio to the configured online model.
  const handleStopVoice = async () => {
    if (!streamerRef.current) return;
    const streamer = streamerRef.current;
    streamerRef.current = null;
    const audioBlob = await streamer.stop();
    if (!audioBlob || audioBlob.size === 0) {
      voiceStreamRef.current?.close();
      voiceStreamRef.current = null;
      setVoiceError(t('voice.recording_empty_error'));
      setVoiceState('ready');
      return;
    }
    audioBlobRef.current = audioBlob;
    await processRecordedAudio(audioBlob);
  };

  const handleRetryVoice = async () => {
    if (activeRepoId && rawTranscript) {
      setVoiceError(null);
      setVoiceState('refining');
      try {
        const res = await refineRequirement(activeRepoId, rawTranscript, language);
        setRefinedRequirement(res.refinement_error ? '' : res.refined_requirement);
        setAmbiguities(res.ambiguities || []);
        setSuggestedColors(res.suggested_colors || []);
        setSuggestedOptions(res.suggested_options || []);
        setRequirement(res.refinement_error ? rawTranscript : res.refined_requirement);
        setActiveView(res.refinement_error ? 'original' : 'refined');
        setVoiceError(res.refinement_error || null);
        setVoiceLatency({
          transcription: voiceLatency?.transcription || 0,
          refinement: res.duration_seconds,
          total: (voiceLatency?.transcription || 0) + res.duration_seconds,
          model: res.models_used.refinement || '',
        });
        setVoiceState('ready');
        return;
      } catch (err: any) {
        setVoiceError(err.message || 'Requirement refinement failed');
        setVoiceState('ready');
        return;
      }
    }
    if (audioBlobRef.current) await processRecordedAudio(audioBlobRef.current);
  };

  const handleToggleView = (view: 'refined' | 'original') => {
    setActiveView(view);
    if (view === 'refined' && refinedRequirement) {
      setRequirement(refinedRequirement);
    } else if (view === 'original' && rawTranscript) {
      setRequirement(rawTranscript);
    }
  };

  return (
    <div className="bg-white border-b border-[#E4E7E1] p-3.5 sm:p-5 shadow-2xs">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Header row: Title */}
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
          <div id="tour-impact-presets" className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 text-xs">
            <span className="text-[11px] text-[#8B929E] font-medium shrink-0">
              {t('impact.examples')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRequirement(item.req);
                    setVoiceState('idle');
                    setAmbiguities([]);
                  }}
                  className="shrink-0 text-[11px] font-mono text-[#151923] bg-[#F7F8F5] hover:bg-[#EBFACD] border border-[#E4E7E1] hover:border-[#C7F36B] px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-[0.98] font-medium"
                  title={item.req}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dedicated Prompt Textarea Card with Voice & Screenshot Support */}
          <div
            id="tour-impact-input"
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
              voiceState === 'listening'
                ? 'border-[#C7F36B] bg-lime-50/20 ring-2 ring-[#C7F36B]/40'
                : isDragging
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

            {/* Voice Listening Waveform Banner */}
            {voiceState === 'listening' && (
              <div className="bg-[#151923] text-white px-3.5 py-2 flex items-center justify-between gap-3 text-xs animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7F36B] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C7F36B]" />
                  </span>
                  <span className="font-bold text-[#C7F36B]">{t('voice.listening')}</span>
                  <span className="text-white/70">{t('voice.live_transcript')}</span>
                  {/* Waveform visual bars */}
                  <span className="inline-flex items-center gap-0.5 ml-2">
                    <span className="w-1 h-3 bg-[#C7F36B] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-5 bg-[#C7F36B] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-2 bg-[#C7F36B] rounded-full animate-bounce [animation-delay:-0.4s]" />
                    <span className="w-1 h-4 bg-[#C7F36B] rounded-full animate-bounce [animation-delay:-0.2s]" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopVoice}
                  className="px-2.5 py-1 rounded-lg bg-[#C7F36B] text-[#151923] font-bold text-[11px] hover:bg-lime-300 transition-colors cursor-pointer"
                >
                  {t('voice.stop_btn')}
                </button>
              </div>
            )}

            {/* Voice Refinement Streaming Banner */}
            {voiceState === 'refining' && (
              <div className="bg-slate-100 text-[#151923] px-3.5 py-2 flex items-center gap-2 text-xs border-b border-[#E4E7E1] animate-fade-in font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#526BEE] animate-spin" />
                <span>{t('voice.refining')}</span>
              </div>
            )}

            {/* Original vs Refined Toggle Chip Bar (Feature 1.1) */}
            {voiceState === 'ready' && rawTranscript && (
              <div className="mx-3.5 mt-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="inline-flex p-0.5 rounded-lg bg-[#F7F8F5] border border-[#E4E7E1]">
                  <button
                    type="button"
                    onClick={() => handleToggleView('refined')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      activeView === 'refined'
                        ? 'bg-white text-[#151923] shadow-xs'
                        : 'text-[#8B929E] hover:text-[#151923]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 inline-block mr-1" />{t('voice.view_refined')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleView('original')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      activeView === 'original'
                        ? 'bg-white text-[#151923] shadow-xs'
                        : 'text-[#8B929E] hover:text-[#151923]'
                    }`}
                  >
                    <Mic className="w-3 h-3 inline-block mr-1" />{t('voice.view_original')}
                  </button>
                </div>

                {voiceLatency && (
                  <span className="text-[10px] font-mono text-[#8B929E] bg-[#F7F8F5] px-2 py-0.5 rounded-md border border-[#E4E7E1]">
                    {t('voice.latency_listen')}: {voiceLatency.transcription}s • {t('voice.latency_refine')}: {voiceLatency.refinement}s • {voiceLatency.model}
                  </span>
                )}
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
                readOnly={voiceState === 'listening'}
                disabled={voiceState === 'transcribing' || voiceState === 'refining'}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={voiceState === 'listening' ? t('voice.listening') : t('dash.input_placeholder')}
                className={`w-full text-xs sm:text-sm font-medium bg-transparent focus:outline-none placeholder:text-slate-400 resize-none leading-relaxed min-h-[26px] max-h-[220px] block overflow-y-auto ${
                  voiceState === 'listening'
                    ? 'text-slate-500 italic'
                    : voiceState === 'refining'
                    ? 'text-slate-600 bg-slate-50/50 cursor-not-allowed select-none'
                    : 'text-[#151923]'
                }`}
              />
            </div>

            {/* Ambiguities / Clarification Questions Prompt (Feature 1.4) */}
            {(ambiguities.length > 0 || suggestedColors.length > 0 || suggestedOptions.length > 0) && voiceState === 'ready' && (
              <div className="mx-3.5 sm:mx-4 mb-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2 animate-fade-in">
                {ambiguities.length > 0 && (
                  <>
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('voice.ambiguities_title')}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800/90 pl-1">
                      {ambiguities.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Dynamic Color Chips generated directly by AI Response */}
                {suggestedColors.length > 0 ? (
                  <div className="pt-1.5 border-t border-amber-200/60">
                    <div className="text-[10px] font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      <span>{t('voice.color_palette_hint')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {suggestedColors.map((color, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const updated = `${requirement.replace(/\.?$/, '')} (${color.name}: ${color.hex}).`;
                            setRequirement(updated);
                            setRefinedRequirement(updated);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono border border-slate-200 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer text-white"
                          style={{ backgroundColor: color.hex }}
                        >
                          <span className="w-2 h-2 rounded-full border border-black/20 bg-white" />
                          <span className="drop-shadow-xs">{color.name} ({color.hex})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {suggestedOptions.length > 0 && (
                  <div className="pt-1.5 border-t border-amber-200/60">
                    <div className="text-[10px] font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                      <Ruler className="w-3 h-3" />
                      <span>{t('voice.suggested_options_hint')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {suggestedOptions.map((option, i) => {
                        const OptionIcon = option.kind === 'font' ? Type : option.kind === 'spacing' ? Move : option.kind === 'radius' ? Circle : Ruler;
                        return (
                          <button
                            key={`${option.kind}-${option.value}-${i}`}
                            type="button"
                            onClick={() => {
                              const updated = `${requirement.replace(/\.?$/, '')} (${option.kind}: ${option.value}).`;
                              setRequirement(updated);
                              setRefinedRequirement(updated);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono border border-amber-200 bg-white text-amber-950 shadow-2xs hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                          >
                            <OptionIcon className="w-3 h-3" />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attached Screenshot Preview Chip with Pre-analysis Insight */}
            {screenshotPreview && screenshot && (
              <div className="mx-3.5 sm:mx-4 mb-3 p-2.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-2 animate-fade-in">
                <div className="flex items-center justify-between gap-3">
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
                      {screenshotInsight && (
                        <div className="text-[10px] font-medium text-[#526BEE] flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>{screenshotInsight.screen_type}</span>
                        </div>
                      )}
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

                {/* Pre-analysis Reading for Vibecoders */}
                {screenshotInsight && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 leading-relaxed">
                    <p className="font-medium text-[#151923]">{screenshotInsight.summary}</p>
                    {screenshotInsight.visible_elements && screenshotInsight.visible_elements.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        <span className="text-[10px] text-[#8B929E]">{t('report.detected_elements')}:</span>
                        {screenshotInsight.visible_elements.slice(0, 4).map((el, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-white border border-[#E4E7E1] text-[10px] font-mono text-slate-700">
                            {el}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {isLoadingScreenshotInsight && (
                  <div className="text-[10px] text-[#8B929E] flex items-center gap-1.5 italic">
                    <Sparkles className="w-3 h-3 animate-spin text-[#526BEE]" />
                    <span>{t('voice.analyzing_screenshot')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error banner if format or size is invalid */}
            {formatError && (
              <div className="mx-3.5 sm:mx-4 mb-3 p-2 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formatError}</span>
              </div>
            )}

            {/* Error banner if voice failed */}
            {voiceError && (
              <div className="mx-3.5 sm:mx-4 mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{voiceError}</span>
                {(audioBlobRef.current || rawTranscript) && (
                  <button
                    type="button"
                    onClick={handleRetryVoice}
                    disabled={voiceState === 'refining' || voiceState === 'transcribing'}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-bold hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {t('voice.retry_btn')}
                  </button>
                )}
              </div>
            )}

            {/* Bottom Action Strip */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 border-t border-[#E4E7E1] bg-[#F7F8F5]">
              <div className="flex items-center gap-2">
                {/* Voice Microphone Trigger Button */}
                <button
                  type="button"
                  onClick={voiceState === 'listening' ? handleStopVoice : handleStartVoice}
                  disabled={!activeRepoId || isAnalyzing || voiceState === 'transcribing' || voiceState === 'refining'}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    voiceState === 'listening'
                      ? 'bg-[#E5484D] text-white shadow-sm animate-pulse'
                      : voiceState === 'ready'
                      ? 'bg-[#C7F36B] text-[#151923] border border-[#151923]/20 shadow-2xs'
                      : 'text-slate-500 hover:text-[#151923] hover:bg-slate-200/60'
                  }`}
                  title={voiceState === 'listening' ? t('voice.stop_btn') : t('voice.mic_btn')}
                >
                  {voiceState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* File Attachment Trigger */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />

                <button
                  id="tour-impact-attach"
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
                  id="tour-impact-run-btn"
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
