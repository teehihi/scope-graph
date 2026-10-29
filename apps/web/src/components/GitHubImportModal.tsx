import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Github, Lock, Globe, Loader2, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Loader } from './Loader';
import { fetchGitHubAuthUrl, fetchGitHubRepos, GitHubOAuthConfigurationError, importGitHubRepo } from '../api/client';
import { Repository, GitHubRepoItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (repo: Repository) => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthUnavailable, setOauthUnavailable] = useState(false);

  // GitHub token can be in user object or localStorage
  const token = user?.githubToken || (user?.email ? localStorage.getItem(`scopegraph_gh_token_${user.email}`) : null);

  const loadRepos = async (authToken: string, bypassCache: boolean = false) => {
    const cacheKey = `scopegraph_cached_gh_repos_${authToken.slice(-10)}`;
    if (!bypassCache) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRepos(parsed);
            setIsLoading(false);
          }
        } catch {}
      }
    }

    // Only show full loader if we have no repos currently in state or cache
    const cached = !bypassCache ? sessionStorage.getItem(cacheKey) : null;
    if (!cached) {
      setIsLoading(true);
    }

    setError(null);
    try {
      const data = await fetchGitHubRepos(authToken, bypassCache);
      setRepos(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err: any) {
      if (repos.length === 0) {
        setError(err.message || t('github_modal.error_load'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      loadRepos(token);
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setOauthUnavailable(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectGitHub = async () => {
    if (isConnecting || oauthUnavailable) return;
    setIsConnecting(true);
    setError(null);
    try {
      const url = await fetchGitHubAuthUrl();
      // Save current page and intent to reopen GitHub modal after OAuth returns
      sessionStorage.setItem('scopegraph_auth_return_url', window.location.pathname + window.location.search);
      sessionStorage.setItem('scopegraph_reopen_github_modal', 'true');
      sessionStorage.setItem('scopegraph_oauth_action', 'link_account');
      window.location.href = url;
    } catch (err) {
      if (err instanceof GitHubOAuthConfigurationError) {
        setOauthUnavailable(true);
        setError(t('github_modal.error_unconfigured'));
      } else {
        setError(t('github_modal.error_connect'));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImport = async (repoItem: GitHubRepoItem) => {
    if (!token) return;
    setImportingId(repoItem.id);
    setError(null);

    try {
      // 1. Kick off the asynchronous repository creation
      const importPromise = importGitHubRepo({
        clone_url: repoItem.clone_url,
        name: repoItem.name,
        full_name: repoItem.full_name,
        default_branch: repoItem.default_branch,
        access_token: token,
        owner_email: user?.email,
      });

      // 2. Keep the button in "Đang nhập..." state for ~2.5 - 3 seconds for visual feedback
      const [imported] = await Promise.all([
        importPromise,
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      // 3. Return immediately to the repositories page
      onImportSuccess(imported);
      onClose();
    } catch (err: any) {
      setError(err.message || t('github_modal.error_import'));
    } finally {
      setImportingId(null);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#151923]/60 backdrop-blur-xs p-4 sm:p-6 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-[#E4E7E1] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E4E7E1] flex items-center justify-between bg-[#F7F8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#151923] text-white flex items-center justify-center shadow-2xs">
              <Github className="w-5 h-5 text-[#C7F36B]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#151923] tracking-tight">
                {t('github_modal.title')}
              </h3>
              <p className="text-xs text-[#8B929E]">
                {t('github_modal.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8B929E] hover:text-[#151923] hover:bg-white border border-transparent hover:border-[#E4E7E1] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!token ? (
          // Disconnected State
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-[#F7F8F5] border border-[#E4E7E1] flex items-center justify-center shadow-xs">
              <Github className="w-8 h-8 text-[#151923]" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h4 className="text-base font-bold text-[#151923]">
                {t('github_modal.connect_title')}
              </h4>
              <p className="text-xs text-[#8B929E] leading-relaxed">
                {t('github_modal.connect_desc')}
              </p>
            </div>
            {error && (
              <div role="alert" className="w-full max-w-md flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={handleConnectGitHub}
              disabled={isConnecting || oauthUnavailable}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[#151923] text-white text-xs font-bold hover:bg-[#C7F36B] hover:text-[#151923] transition-all shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              <span>{t('github_modal.connect_btn')}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        ) : (
          // Connected - Repo List State
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search Bar & Actions */}
            <div className="p-4 border-b border-[#E4E7E1] flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8B929E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('github_modal.search_placeholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F7F8F5] border border-[#E4E7E1] rounded-xl focus:outline-none focus:border-[#526BEE] focus:bg-white text-[#151923] placeholder-[#8B929E]"
                />
              </div>
              <button
                onClick={() => loadRepos(token, true)}
                disabled={isLoading}
                title={t('github_modal.refresh')}
                className="p-2.5 rounded-xl border border-[#E4E7E1] hover:border-[#151923] bg-white text-[#151923] transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#526BEE]' : ''}`} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="m-4 mb-0 flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* Repo List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-[#E4E7E1]/50">
              {isLoading && repos.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center space-y-6">
                  <Loader color="#151923" />
                  <p className="text-xs text-[#8B929E] font-medium animate-pulse">
                    {t('github_modal.loading_repos')}
                  </p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm font-bold text-[#151923]">
                    {t('github_modal.no_repos_found')}
                  </p>
                  <p className="text-xs text-[#8B929E]">
                    {t('github_modal.no_repos_desc')}
                  </p>
                </div>
              ) : (
                filteredRepos.map((r) => {
                  const isImporting = importingId === r.id;
                  return (
                    <div
                      key={r.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#151923] truncate">
                            {r.full_name}
                          </span>
                          {r.private ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              <Lock className="w-2.5 h-2.5" />
                              {t('github_modal.badge_private')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                              <Globe className="w-2.5 h-2.5" />
                              {t('github_modal.badge_public')}
                            </span>
                          )}
                        </div>

                        {r.description && (
                          <p className="text-[11px] text-[#8B929E] truncate mt-0.5">
                            {r.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1 text-[10px] text-[#8B929E] font-mono">
                          {r.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#526BEE]" />
                              {r.language}
                            </span>
                          )}
                          <span>Branch: {r.default_branch}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleImport(r)}
                        disabled={isImporting || importingId !== null}
                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          isImporting
                            ? 'bg-[#151923] text-[#C7F36B]'
                            : 'bg-white border border-[#E4E7E1] hover:border-[#151923] hover:bg-[#151923] hover:text-white text-[#151923]'
                        }`}
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C7F36B]" />
                            <span>{t('github_modal.btn_importing')}</span>
                          </>
                        ) : (
                          <>
                            <span>{t('github_modal.btn_import')}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#E4E7E1] bg-[#F7F8F5] flex items-center justify-between text-xs text-[#8B929E]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t('github_modal.connected_as')} <strong className="text-[#151923] font-mono">{user?.username || user?.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleConnectGitHub}
                className="text-xs text-[#526BEE] hover:underline font-semibold"
              >
                {t('github_modal.reconnect')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
