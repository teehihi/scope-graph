import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../router';
import { useRepo } from '../context/RepoContext';
import { useLanguage } from '../context/LanguageContext';
import { ChevronDown, Plus, FolderGit2, Check, ArrowRight } from 'lucide-react';

export const RepoSelectorDropdown: React.FC = () => {
  const { navigate } = useRouter();
  const { repositories, activeRepo, setActiveRepo } = useRepo();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!repositories || repositories.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-semibold bg-white border border-[#E4E7E1] rounded-xl px-3 py-1.5 sm:py-2 text-[#151923] shadow-2xs hover:border-[#151923] hover:bg-slate-50 transition-all cursor-pointer max-w-[220px] sm:max-w-xs focus:outline-none"
        aria-expanded={isOpen}
      >
        <FolderGit2 className="w-3.5 h-3.5 text-[#526BEE] shrink-0" />
        <span className="truncate font-mono">
          {activeRepo?.name || t('repo.select_placeholder')}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8B929E] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Modal / Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-[#E4E7E1] shadow-xl z-50 overflow-hidden animate-slide-down">
          {/* Header */}
          <div className="p-3 border-b border-[#E4E7E1] bg-[#F7F8F5] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E] flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-[#151923]" />
              {t('repo.dropdown_header')} ({repositories.length})
            </span>
            <span className="text-[10px] text-[#8B929E] font-mono">ScopeGraph</span>
          </div>

          {/* List of Repos */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {repositories.map((repo) => {
              const isSelected = activeRepo?.id === repo.id;
              return (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => {
                    setActiveRepo(repo);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#151923] text-white shadow-xs font-bold'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-[#151923]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono truncate">{repo.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C7F36B] shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5 flex items-center gap-2 font-mono">
                      <span>{repo.stats?.file_count || 14} {t('repo.files')}</span>
                      <span>•</span>
                      <span className="truncate">AST Indexed</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#C7F36B] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Bottom Action Footer: Thêm & Quản lý kho mã nguồn */}
          <div className="p-2 border-t border-[#E4E7E1] bg-[#F7F8F5]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/app/repositories');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E4E7E1] hover:border-[#151923] hover:bg-slate-50 text-[#151923] text-xs font-bold transition-all shadow-2xs group cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#526BEE] group-hover:scale-110 transition-transform" />
              <span>{t('repo.manage_add_btn')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8B929E] group-hover:translate-x-0.5 transition-transform ml-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
