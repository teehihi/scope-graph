import React, { useState } from 'react';
import { useRouter, Link } from '../../router';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ScopeGraphLogoMark } from '../BrandIcons';
import {
  LayoutDashboard,
  Network,
  Zap,
  FolderGit2,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  title,
  subtitle,
  actions,
  children,
}) => {
  const { pathname, navigate } = useRouter();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/app/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/app/graph', label: t('nav.graph'), icon: Network },
    { to: '/app/impact', label: t('nav.impact'), icon: Zap },
    { to: '/app/repositories', label: t('nav.repositories'), icon: FolderGit2 },
    { to: '/app/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#F7F8F5] text-[#151923] overflow-hidden font-sans selection:bg-[#C7F36B] selection:text-[#151923]">
      {/* 1. Desktop Dark Ink Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#151923] text-white flex-col shrink-0 border-r border-slate-800/40 z-30">
        {/* Top ScopeGraph Logo Lockup */}
        <div className="p-5 border-b border-slate-800/80">
          <Link to="/app/dashboard" className="flex items-center gap-3 group">
            <ScopeGraphLogoMark size={32} dark={true} className="shrink-0 group-hover:scale-105 transition-transform" />
            <div>
              <span className="font-extrabold text-base tracking-[-0.5px] text-white">
                ScopeGraph
              </span>
              <span className="block text-[10px] text-[#8B929E] font-medium leading-none mt-0.5">
                {t('nav.code_intel')}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] px-3 py-2">
            {t('nav.navigation')}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.to || (item.to !== '/app/dashboard' && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-800/90 text-white border border-slate-700/60 shadow-sm'
                    : 'text-[#8B929E] hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#C7F36B]' : 'text-[#8B929E]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#C7F36B]" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Row */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {user?.name || 'Developer'}
                </span>
                {user?.isDemo && (
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#C7F36B] text-[#151923]">
                    Demo
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#8B929E] truncate font-mono">
                {user?.email || 'demo@scopegraph.dev'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#8B929E] hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Drawer Backdrop & Sliding Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-[#151923] text-white flex flex-col z-50 lg:hidden shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <Link
            to="/app/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3"
          >
            <ScopeGraphLogoMark size={28} dark={true} className="shrink-0" />
            <div>
              <span className="font-extrabold text-sm tracking-[-0.5px] text-white">
                ScopeGraph
              </span>
              <span className="block text-[9px] text-[#8B929E] font-medium leading-none mt-0.5">
                {t('nav.code_intel')}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] px-3 py-2">
            {t('nav.navigation')}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.to || (item.to !== '/app/dashboard' && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-800/90 text-white border border-slate-700/60 shadow-sm'
                    : 'text-[#8B929E] hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#C7F36B]' : 'text-[#8B929E]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#C7F36B]" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Row */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {user?.name || 'Developer'}
                </span>
                {user?.isDemo && (
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#C7F36B] text-[#151923]">
                    Demo
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#8B929E] truncate font-mono">
                {user?.email || 'demo@scopegraph.dev'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#8B929E] hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content on the right */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Header Area: Page Title + Page-level actions */}
        <header className="h-14 sm:h-16 bg-white border-b border-[#E4E7E1] px-3.5 sm:px-8 flex items-center justify-between shrink-0 z-20 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -ml-1 rounded-xl text-[#151923] hover:bg-slate-100 lg:hidden shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-[#151923]" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-base font-bold text-[#151923] tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-[#8B929E] hidden md:block truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">{actions}</div>}
        </header>

        {/* Page Body */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
