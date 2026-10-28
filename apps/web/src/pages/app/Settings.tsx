import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, AVAILABLE_LANGUAGES, Language } from '../../context/LanguageContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import {
  Cpu,
  UserCheck,
  Terminal,
  Globe,
  Check,
  Copy,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

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
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
              <Cpu className="w-5 h-5 text-[#526BEE]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151923]">{t('settings.ai.title')}</h3>
              <p className="text-xs text-[#8B929E]">{t('settings.ai.desc')}</p>
            </div>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[#151923] block">{t('settings.ai.model')}</span>
                <span className="text-[11px] text-[#8B929E] font-mono truncate block">muse-spark-1.3 / Llama-3.3-70B-Instruct</span>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {t('settings.ai.connected')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[#151923] block">{t('settings.ai.fallback')}</span>
                <span className="text-[11px] text-[#8B929E] block">
                  {t('settings.ai.fallback_desc')}
                </span>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {t('settings.ai.enabled')}
              </span>
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
    </AppLayout>
  );
};
