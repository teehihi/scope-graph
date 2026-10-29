import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, AVAILABLE_LANGUAGES, Language } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { fetchSystemInfo, updateSystemSettings, testAiConnection } from '../../api/client';
import { SystemInfo } from '../../types';
import {
  Cpu,
  UserCheck,
  Terminal,
  Globe,
  Check,
  Copy,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  Activity,
} from 'lucide-react';

interface ProviderPreset {
  defaultModel: string;
  defaultBaseUrl: string;
  models: string[];
}

const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  meta_model_api: {
    defaultModel: 'muse-spark-1.3',
    defaultBaseUrl: 'https://api.meta.ai/v1',
    models: [
      'muse-spark-1.3',
      'llama-3.3-70b-instruct',
      'llama-3.1-405b-instruct',
      'llama-3.1-70b-instruct',
      'llama-3.1-8b-instruct',
    ],
  },
  groq: {
    defaultModel: 'llama-3.3-70b-versatile',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  together: {
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    ],
  },
  fireworks: {
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    defaultBaseUrl: 'https://api.fireworks.ai/inference/v1',
    models: [
      'accounts/fireworks/models/llama-v3p3-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-405b-instruct',
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
    ],
  },
  baseten: {
    defaultModel: 'meta-models/muse-spark-open-1026',
    defaultBaseUrl: 'https://inference.baseten.co/v1',
    models: [
      'meta-models/muse-spark-open-1026',
      'llama-3.3-70b-instruct',
      'llama-3.1-70b-instruct',
    ],
  },
  generic_openai_compat: {
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-4o-mini',
      'gpt-4o',
      'claude-3-5-sonnet',
      'deepseek-chat',
    ],
  },
  offline_demo: {
    defaultModel: 'offline-deterministic-v1',
    defaultBaseUrl: 'http://localhost:8000',
    models: [
      'offline-deterministic-v1',
    ],
  },
};

const PROVIDER_OPTIONS = [
  { value: 'meta_model_api', label: 'Meta Model API (Official)' },
  { value: 'groq', label: 'Groq (Llama 3 Ultra-fast)' },
  { value: 'together', label: 'Together AI' },
  { value: 'fireworks', label: 'Fireworks AI' },
  { value: 'baseten', label: 'Baseten' },
  { value: 'generic_openai_compat', label: 'OpenAI Compatible Endpoint' },
  { value: 'offline_demo', label: 'Offline Demo Mode (Zero Key)' },
];

const MAX_TOKENS_OPTIONS = [
  { value: 2000, label: '2,000 tokens' },
  { value: 4000, label: '4,000 tokens' },
  { value: 6000, label: '6,000 tokens' },
  { value: 8000, label: '8,000 tokens' },
  { value: 12000, label: '12,000 tokens' },
];

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Advanced modal custom dropdown states
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isTokensDropdownOpen, setIsTokensDropdownOpen] = useState(false);

  const closeAllDropdowns = () => {
    setIsProviderDropdownOpen(false);
    setIsModelDropdownOpen(false);
    setIsTokensDropdownOpen(false);
  };

  // Advanced form edit state
  const [editProvider, setEditProvider] = useState<string>('meta_model_api');
  const [editModel, setEditModel] = useState<string>('muse-spark-1.3');
  const [editBaseUrl, setEditBaseUrl] = useState<string>('https://api.meta.ai/v1');
  const [editApiKey, setEditApiKey] = useState<string>('');
  const [editTemperature, setEditTemperature] = useState<number>(0.1);
  const [editMaxTokens, setEditMaxTokens] = useState<number>(6000);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemInfo()
      .then((data) => setSystemInfo(data))
      .catch((err) => console.warn('Could not fetch real system info', err));
  }, []);

  useEffect(() => {
    if (systemInfo) {
      setEditProvider(systemInfo.provider || 'meta_model_api');
      setEditModel(systemInfo.model || 'muse-spark-1.3');
      setEditBaseUrl(systemInfo.base_url || 'https://api.meta.ai/v1');
      setEditTemperature(systemInfo.temperature ?? 0.1);
      setEditMaxTokens(systemInfo.max_tokens ?? 6000);
      setEditApiKey(systemInfo.custom_api_key || '');
    }
  }, [systemInfo, isAdvancedModalOpen]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAiConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setTestResult(null);
    try {
      const updated = await updateSystemSettings({
        provider: editProvider,
        model: editModel,
        base_url: editBaseUrl,
        api_key: editApiKey.trim(),
        temperature: editTemperature,
        max_tokens: editMaxTokens,
      });
      setSystemInfo(updated);
      setSaveSuccessMsg(t('settings.ai.save_success'));
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevertSystemKey = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setTestResult(null);
    try {
      const updated = await updateSystemSettings({
        reset_api_key: true,
      });
      setSystemInfo(updated);
      setEditApiKey('');
      setSaveSuccessMsg(t('settings.ai.save_success'));
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to revert key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setEditProvider(newProvider);
    const preset = PROVIDER_PRESETS[newProvider];
    if (preset) {
      setEditModel(preset.defaultModel);
      setEditBaseUrl(preset.defaultBaseUrl);
    }
  };

  const mcpConfig = `{
  "mcpServers": {
    "scopegraph": {
      "command": "python",
      "args": ["-m", "app.mcp.server"],
      "env": {
        "API_BASE_URL": "http://localhost:8000"
      }
    }
  }
}`;

  const handleCopyMcp = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const currentLangObj = AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <AppLayout
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
      actions={
        saveToast ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('common.saved')}</span>
          </span>
        ) : undefined
      }
    >
      <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* 1. Global Language & Regional Localization */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#526BEE] border border-blue-100">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#151923]">{t('settings.lang.title')}</h3>
                <p className="text-xs text-[#8B929E]">{t('settings.lang.desc')}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
                <span>{currentLangObj.flag}</span>
                <span>{currentLangObj.name}</span>
                <span className="text-[10px] text-slate-400">({currentLangObj.code.toUpperCase()})</span>
              </span>
            </div>
          </div>

          {/* Mobile: Interactive Dropdown Selector (sm:hidden) */}
          <div className="block sm:hidden pt-1 relative">
            <button
              type="button"
              onClick={() => setIsMobileDropdownOpen((prev) => !prev)}
              className="w-full p-3.5 rounded-xl border-2 border-[#151923] bg-[#F7F8F5] shadow-xs flex items-center justify-between text-left active:scale-[0.99] transition-transform"
              aria-expanded={isMobileDropdownOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl select-none leading-none shrink-0">{currentLangObj.flag}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#151923] truncate">{currentLangObj.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#151923] text-white flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 text-[#C7F36B]" />
                      <span>{t('common.active')}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {t(`settings.lang.${currentLangObj.code}_sub`)}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#151923] transition-transform duration-200 shrink-0 ml-2 ${
                  isMobileDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isMobileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsMobileDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#E4E7E1] bg-white shadow-xl divide-y divide-slate-100">
                  {AVAILABLE_LANGUAGES.map((item) => {
                    const isSelected = language === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          handleLanguageChange(item.code);
                          setIsMobileDropdownOpen(false);
                        }}
                        className={`w-full p-3.5 flex items-center justify-between text-left transition-colors ${
                          isSelected ? 'bg-[#F7F8F5]' : 'hover:bg-slate-50 active:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl select-none leading-none shrink-0">{item.flag}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isSelected ? 'text-[#151923]' : 'text-slate-800'}`}>
                                {item.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">({item.code.toUpperCase()})</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {t(`settings.lang.${item.code}_sub`)}
                            </p>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#151923] text-white flex items-center gap-1 shrink-0 ml-2">
                            <Check className="w-2.5 h-2.5 text-[#C7F36B]" />
                            <span>{t('common.active')}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                            {item.code.toUpperCase()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Desktop/Tablet: 12 Global Languages Grid (hidden sm:grid) */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {AVAILABLE_LANGUAGES.map((item) => {
              const isSelected = language === item.code;
              return (
                <div
                  key={item.code}
                  onClick={() => handleLanguageChange(item.code)}
                  className={`p-3.5 rounded-xl transition-all flex flex-col justify-between space-y-2 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-[#151923] bg-[#F7F8F5] shadow-xs'
                      : 'border border-[#E4E7E1] hover:border-slate-400 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl select-none leading-none">{item.flag}</span>
                    {isSelected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#151923] text-white flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 text-[#C7F36B]" />
                        <span>{t('common.active')}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">{item.code.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#151923]">{item.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                      {t(`settings.lang.${item.code}_sub`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Account Profile */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151923]">{t('settings.account.title')}</h3>
              <p className="text-xs text-[#8B929E]">{t('settings.account.desc')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block mb-1">
                {t('settings.account.name')}
              </span>
              <span className="text-xs font-bold text-[#151923]">{user?.name || 'Nguyễn Nhật Thiên'}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block mb-1">
                {t('settings.account.email')}
              </span>
              <span className="text-xs font-mono font-medium text-[#151923]">
                {user?.email || 'tee21052005@gmail.com'}
              </span>
            </div>
          </div>

          {user?.isDemo && (
            <div className="p-3 rounded-xl bg-[#EBFACD] border border-[#C7F36B] text-xs text-[#151923] flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-[#151923] text-white">
                {t('settings.account.demo_badge')}
              </span>
              <span>{t('settings.account.demo_notice')}</span>
            </div>
          )}
        </div>

        {/* 3. Meta AI Intelligence Provider */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
                <Cpu className="w-5 h-5 text-[#526BEE]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#151923]">{t('settings.ai.title')}</h3>
                <p className="text-xs text-[#8B929E]">{t('settings.ai.desc')}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAdvancedModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#526BEE]" />
              <span>{t('settings.ai.advanced_btn')}</span>
            </button>
          </div>

          <div className="pt-1 text-xs">
            {/* Active Model */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[#151923] block">{t('settings.ai.model')}</span>
                <span className="text-[11px] text-[#8B929E] font-mono truncate block mt-0.5">
                  {systemInfo?.model || 'muse-spark-1.3'}
                </span>
              </div>
              {systemInfo?.is_live ? (
                <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('settings.ai.live_connected')}</span>
                </span>
              ) : (
                <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                  {t('settings.ai.offline_mode')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Model Context Protocol (MCP) */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
                <Terminal className="w-5 h-5 text-[#526BEE]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#151923]">{t('settings.mcp.title')}</h3>
                <p className="text-xs text-[#8B929E]">{t('settings.mcp.desc')}</p>
              </div>
            </div>

            <button
              onClick={handleCopyMcp}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors shadow-xs"
            >
              {copiedMcp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMcp ? t('settings.mcp.copied') : t('settings.mcp.copy_btn')}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-[#151923] text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
            {mcpConfig}
          </pre>
        </div>
      </div>

      {/* Advanced AI Settings Modal */}
      {isAdvancedModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#151923]/60 backdrop-blur-xs p-4 sm:p-6 animate-fade-in font-sans">
            <div className="bg-white rounded-3xl border border-[#E4E7E1] shadow-2xl max-w-xl w-full p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E4E7E1]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#526BEE]/10 text-[#526BEE] flex items-center justify-center shadow-2xs">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#151923] tracking-tight">{t('settings.ai.advanced_title')}</h3>
                    <p className="text-xs text-[#8B929E]">{t('settings.ai.advanced_subtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedModalOpen(false)}
                  className="p-1.5 rounded-xl text-[#8B929E] hover:text-[#151923] hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Interactive Editable Form */}
              <div className="space-y-4 text-xs relative">
                {/* Backdrop to close custom dropdowns */}
                {(isProviderDropdownOpen || isModelDropdownOpen || isTokensDropdownOpen) && (
                  <div className="fixed inset-0 z-40" onClick={closeAllDropdowns} />
                )}

                {/* 1. Provider & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Provider Custom Dropdown */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1.5 relative">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                      {t('settings.ai.provider_label')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProviderDropdownOpen(!isProviderDropdownOpen);
                        setIsModelDropdownOpen(false);
                        setIsTokensDropdownOpen(false);
                      }}
                      className="w-full bg-white border border-[#E4E7E1] focus:border-[#526BEE] hover:bg-slate-50/50 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#151923] flex items-center justify-between shadow-2xs cursor-pointer text-left transition-colors"
                    >
                      <span className="truncate">
                        {PROVIDER_OPTIONS.find((p) => p.value === editProvider)?.label || editProvider}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5 transition-transform duration-150 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProviderDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-[#E4E7E1] bg-white shadow-xl py-1 divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fade-in font-sans">
                        {PROVIDER_OPTIONS.map((item) => {
                          const isSelected = editProvider === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => {
                                handleProviderChange(item.value);
                                setIsProviderDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                                isSelected ? 'bg-[#F7F8F5] font-bold text-[#151923]' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">{item.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#526BEE] shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Model Custom Combobox with Dropdown Suggestions */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1.5 relative">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                      {t('settings.ai.model_label')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editModel}
                        onChange={(e) => setEditModel(e.target.value)}
                        className="w-full bg-white border border-[#E4E7E1] focus:border-[#526BEE] rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-mono font-bold text-[#151923] outline-hidden shadow-2xs"
                        placeholder="e.g. muse-spark-1.3, llama-3.3-70b-instruct"
                      />
                      {(PROVIDER_PRESETS[editProvider]?.models?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsModelDropdownOpen(!isModelDropdownOpen);
                            setIsProviderDropdownOpen(false);
                            setIsTokensDropdownOpen(false);
                          }}
                          aria-label={t('settings.ai.model_label')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 cursor-pointer transition-colors"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {isModelDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-[#E4E7E1] bg-white shadow-xl py-1 divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fade-in font-sans">
                        {(PROVIDER_PRESETS[editProvider]?.models || []).map((m) => {
                          const isSelected = editModel === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setEditModel(m);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs font-mono flex items-center justify-between transition-colors ${
                                isSelected ? 'bg-[#F7F8F5] font-bold text-[#151923]' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">{m}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#526BEE] shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. API Key Section */}
                <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E]">
                      {t('settings.ai.api_key_status')}
                    </span>
                    {systemInfo?.api_key_source === 'custom' && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{t('settings.ai.key_custom_active')}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleRevertSystemKey}
                          disabled={isSaving}
                          className="font-bold text-[#526BEE] hover:underline flex items-center gap-1 cursor-pointer text-[10px]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{t('settings.ai.key_revert_btn')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      placeholder={
                        systemInfo?.has_api_key
                          ? '••••••••••••••••'
                          : t('settings.ai.key_placeholder_custom')
                      }
                      className="w-full bg-white border border-[#E4E7E1] focus:border-[#526BEE] rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-[#151923] outline-hidden shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Base URL */}
                <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                    {t('settings.ai.base_url_label')}
                  </label>
                  <input
                    type="text"
                    value={editBaseUrl}
                    onChange={(e) => setEditBaseUrl(e.target.value)}
                    className="w-full bg-white border border-[#E4E7E1] focus:border-[#526BEE] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#151923] outline-hidden shadow-2xs"
                    placeholder="https://api.meta.ai/v1"
                  />
                </div>

                {/* 4. Temperature (Độ ngẫu nhiên) & Max Tokens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E]">
                        {t('settings.ai.temp_label')}
                      </label>
                      <span className="text-xs font-mono font-bold text-[#151923] bg-white px-2 py-0.5 rounded border border-[#E4E7E1]">
                        {editTemperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={editTemperature}
                      onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[#151923] cursor-pointer"
                    />
                    <p className="text-[10px] text-[#8B929E] leading-tight">
                      {editTemperature <= 0.3
                        ? t('settings.ai.temp_hint_deterministic')
                        : t('settings.ai.temp_hint_creative')}
                    </p>
                  </div>

                  {/* Max Tokens Custom Dropdown (Dropup - opens upwards inside modal) */}
                  <div className="p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                      {t('settings.ai.max_tokens_label')}
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsTokensDropdownOpen(!isTokensDropdownOpen);
                          setIsProviderDropdownOpen(false);
                          setIsModelDropdownOpen(false);
                        }}
                        className="w-full bg-white border border-[#E4E7E1] focus:border-[#526BEE] hover:bg-slate-50/50 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#151923] flex items-center justify-between shadow-2xs cursor-pointer text-left transition-colors"
                      >
                        <span>
                          {MAX_TOKENS_OPTIONS.find((opt) => opt.value === editMaxTokens)?.label || `${editMaxTokens} tokens`}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5 transition-transform duration-150 ${isTokensDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isTokensDropdownOpen && (
                        <div className="absolute left-0 right-0 bottom-full mb-1.5 z-50 rounded-xl border border-[#E4E7E1] bg-white shadow-2xl py-1 divide-y divide-slate-100 max-h-56 overflow-y-auto animate-fade-in font-sans">
                          {MAX_TOKENS_OPTIONS.map((opt) => {
                            const isSelected = editMaxTokens === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setEditMaxTokens(opt.value);
                                  setIsTokensDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-mono flex items-center justify-between transition-colors ${
                                  isSelected ? 'bg-[#F7F8F5] font-bold text-[#151923]' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{opt.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#526BEE] shrink-0 ml-2" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-[#8B929E]">
                      {t('settings.ai.fallback_desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer: Test Connection alongside Close and Save */}
              <div className="pt-4 border-t border-[#E4E7E1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Left: Test Connection Button & Result Feedback */}
                <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 text-[#526BEE] ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? t('settings.ai.testing_connection') : t('settings.ai.test_connection_btn')}</span>
                  </button>

                  {testResult && (
                    <div
                      className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 max-w-xs animate-fade-in ${
                        testResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                      title={testResult.message}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span className="truncate">{testResult.message}</span>
                    </div>
                  )}

                  {saveSuccessMsg && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 animate-fade-in shadow-2xs shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{saveSuccessMsg}</span>
                    </span>
                  )}
                </div>

                {/* Right: Close and Save buttons */}
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-white border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {t('common.close')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[#151923] text-white hover:bg-black transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isSaving ? '...' : t('settings.ai.save_btn')}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppLayout>
  );
};
