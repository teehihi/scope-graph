import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/layouts/AppLayout';
import { Cpu, UserCheck, Terminal } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <AppLayout
      title="Settings & Preferences"
      subtitle="System configuration, model intelligence, and account"
    >
      <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
        {/* Account Info */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151923]">Account Profile</h3>
              <p className="text-xs text-[#8B929E]">Active user credentials and session type</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                User Name
              </span>
              <span className="text-xs font-bold text-[#151923]">{user?.name || 'Developer'}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B929E] block">
                Email Address
              </span>
              <span className="text-xs font-mono font-medium text-[#151923]">
                {user?.email || 'demo@scopegraph.dev'}
              </span>
            </div>
          </div>

          {user?.isDemo && (
            <div className="p-3 rounded-xl bg-[#EBFACD] border border-[#C7F36B] text-xs text-[#151923] flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-[#151923] text-white">
                Demo
              </span>
              <span>Running in instant local demonstration mode. Session persists in browser storage.</span>
            </div>
          )}
        </div>

        {/* AI & Model Settings */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
              <Cpu className="w-5 h-5 text-[#526BEE]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151923]">Meta AI Intelligence Provider</h3>
              <p className="text-xs text-[#8B929E]">Configured LLM backend for impact reasoning</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
              <div>
                <span className="font-bold text-[#151923] block">Active Reasoning Model</span>
                <span className="text-[11px] text-[#8B929E] font-mono">meta-llama/Llama-3.3-70B-Instruct</span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1]">
              <div>
                <span className="font-bold text-[#151923] block">Analysis Fallback Strategy</span>
                <span className="text-[11px] text-[#8B929E]">
                  Deterministic AST symbol index verification with semantic fallback
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Enabled
              </span>
            </div>
          </div>
        </div>

        {/* Model Context Protocol (MCP) */}
        <div className="p-6 rounded-2xl bg-white border border-[#E4E7E1] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-[#151923]">
              <Terminal className="w-5 h-5 text-[#C7F36B]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151923]">Model Context Protocol (MCP) Setup</h3>
              <p className="text-xs text-[#8B929E]">Connect Claude Desktop, Cursor, or CLI agents</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            ScopeGraph exposes an MCP server allowing AI coding assistants to query dependencies and blast radius directly within your IDE:
          </p>

          <pre className="p-4 rounded-xl bg-[#151923] text-slate-100 font-mono text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "scopegraph": {
      "command": "python",
      "args": ["-m", "app.mcp.server"],
      "env": {
        "API_BASE_URL": "http://localhost:8000"
      }
    }
  }
}`}
          </pre>
        </div>
      </div>
    </AppLayout>
  );
};
