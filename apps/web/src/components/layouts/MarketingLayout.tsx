import React from 'react';
import { Link } from '../../router';
import { ScopeGraphLogoMark } from '../BrandIcons';
import { useAuth } from '../../context/AuthContext';
import { Github, ArrowRight } from 'lucide-react';

export const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#151923] flex flex-col font-sans selection:bg-[#C7F36B] selection:text-[#151923]">
      {/* Slim Top Bar */}
      <header className="h-16 border-b border-[#E4E7E1] bg-[#F7F8F5]/90 backdrop-blur sticky top-0 z-40 px-6 sm:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <ScopeGraphLogoMark size={36} dark={false} className="shrink-0 group-hover:scale-105 transition-transform" />
          <span className="font-extrabold text-xl tracking-[-0.5px] text-[#151923]">
            ScopeGraph
          </span>
        </Link>

        {/* Center / Right Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#8B929E]">
          <a href="#how-it-works" className="hover:text-[#151923] transition-colors">
            How it works
          </a>
          <a href="#what-you-get" className="hover:text-[#151923] transition-colors">
            Features
          </a>
          <a href="#mcp" className="hover:text-[#151923] transition-colors">
            MCP Agent
          </a>
          <a href="#demo" className="hover:text-[#151923] transition-colors">
            Demo
          </a>
        </nav>

        {/* Auth CTA buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/app/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-white hover:bg-[#526BEE] hover:shadow-md hover:shadow-[#526BEE]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm"
            >
              <span>Go to App</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B]" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-semibold px-3 py-2 text-[#151923] hover:text-[#526BEE] transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="group flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-md hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-sm"
              >
                <span>Get started</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#E4E7E1] bg-white py-12 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <ScopeGraphLogoMark size={28} dark={false} />
            <div>
              <span className="font-extrabold text-sm tracking-[-0.5px] text-[#151923]">
                ScopeGraph
              </span>
              <p className="text-xs text-[#8B929E]">
                Understand the impact before you change the code.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#8B929E]">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#151923] transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
            </a>
            <span className="text-slate-300">•</span>
            <span>Built for Modern Engineering Teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
