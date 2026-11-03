import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, AVAILABLE_LANGUAGES, Language } from '../context/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorDropdownProps {
  className?: string;
  variant?: 'pill' | 'rounded';
  align?: 'left' | 'right';
  showActiveFlag?: boolean;
}

export const LanguageSelectorDropdown: React.FC<LanguageSelectorDropdownProps> = ({
  className = '',
  variant = 'pill',
  align = 'right',
  showActiveFlag = true,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang =
    AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const roundedClasses = variant === 'pill' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('settings.lang.ui_label')}
        className={`flex items-center gap-1.5 bg-white border border-[#E4E7E1] ${roundedClasses} px-3 py-1.5 shadow-2xs hover:border-[#151923] hover:bg-slate-50 transition-all cursor-pointer focus:outline-none`}
      >
        <Globe className="w-3.5 h-3.5 text-[#8B929E] shrink-0" />
        {showActiveFlag && <span className="text-sm leading-none shrink-0 select-none">{currentLang.flag}</span>}
        <span className="text-xs font-bold text-[#151923] font-mono tracking-wide">
          {currentLang.code.toUpperCase()}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#8B929E] transition-transform duration-200 shrink-0 ml-0.5 ${
            isOpen ? 'rotate-180 text-[#151923]' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('settings.lang.ui_label')}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-64 rounded-2xl bg-white border border-[#E4E7E1] shadow-xl z-50 overflow-hidden animate-slide-down`}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-[#E4E7E1] bg-[#F7F8F5] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#151923]" />
              {t('settings.lang.ui_label')}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#E4E7E1] text-[#151923] font-bold shadow-2xs">
              {AVAILABLE_LANGUAGES.length}
            </span>
          </div>

          {/* Language Options List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {AVAILABLE_LANGUAGES.map((item) => {
              const isSelected = language === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLanguage(item.code as Language);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#151923] text-white shadow-xs font-semibold'
                      : 'hover:bg-slate-100 text-slate-700 hover:text-[#151923]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg leading-none select-none shrink-0">{item.flag}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs truncate ${
                            isSelected ? 'text-white font-bold' : 'text-slate-800 font-semibold'
                          }`}
                        >
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            isSelected ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          ({item.code.toUpperCase()})
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Check className="w-4 h-4 text-[#C7F36B]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
