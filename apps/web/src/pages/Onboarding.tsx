import React, { useState } from 'react';
import { useRouter } from '../router';
import { useAuth } from '../context/AuthContext';
import { ScopeGraphLogoMark, GitHubIcon } from '../components/BrandIcons';
import { Check, ArrowRight, ShieldCheck, Building, Network, HelpCircle } from 'lucide-react';
import { OnboardingTour, TourStep } from '../components/OnboardingTour';

interface RoleOption {
  id: string;
  title: string;
  subtitle: string;
  iconSrc: string;
}

const ROLES: RoleOption[] = [
  {
    id: 'developer',
    title: 'Software Engineer',
    subtitle: 'Refactor code, inspect blast radius, and prevent breaking downstream imports.',
    iconSrc: '/brand/roles/role-developer.svg',
  },
  {
    id: 'ai-agent',
    title: 'AI Agent Architect',
    subtitle: 'Connect MCP tools, feed grounded AST context into Claude & Cursor.',
    iconSrc: '/brand/roles/role-ai-agent.svg',
  },
  {
    id: 'reviewer',
    title: 'Code Reviewer & QA',
    subtitle: 'Audit pull requests, inspect impacted test files, and detect regression risks.',
    iconSrc: '/brand/roles/role-reviewer.svg',
  },
  {
    id: 'maintainer',
    title: 'Lead / Maintainer',
    subtitle: 'Enforce module boundaries, architecture tiers, and manage schema changes.',
    iconSrc: '/brand/roles/role-maintainer.svg',
  },
];

const TOUR_STEPS: TourStep[] = [
  {
    id: 'account',
    targetSelector: '#tour-step-account',
    title: 'Account & Identity',
    placement: 'bottom',
    spotlightPadding: 8,
    spotlightRadius: 18,
    description:
      'Your **Avatar** and **Email** are automatically synchronized from GitHub. Your **Display Name** will be credited across impact analysis reports and architectural change briefs.',
    interactiveTip: 'You can type directly into this input to update your name right now!',
  },
  {
    id: 'workspace',
    targetSelector: '#tour-step-workspace',
    title: 'Workspace Environment',
    placement: 'bottom',
    spotlightPadding: 8,
    spotlightRadius: 18,
    description:
      'Each **Workspace** is an isolated sandbox housing your codebase repositories, AST symbol indexes, dependency graphs, and historical change audits.',
    interactiveTip: 'Try typing a custom workspace name (e.g. Core Platform) directly!',
  },
  {
    id: 'role',
    targetSelector: '#tour-step-role',
    title: 'Primary Engineering Role',
    placement: 'top',
    spotlightPadding: 8,
    spotlightRadius: 20,
    description:
      'Select your primary engineering discipline to tailor ScopeGraph’s intelligence: **Software Engineer**, **AI Agent Architect**, **Code Reviewer & QA**, or **Lead / Maintainer**.',
    interactiveTip: 'You can click any role card directly to switch your active profile now!',
  },
  {
    id: 'preview',
    targetSelector: '#tour-step-preview',
    title: 'Live Blast Radius Preview',
    placement: 'right',
    spotlightPadding: 8,
    spotlightRadius: 18,
    description:
      'Visualize how ScopeGraph classifies change impact: **Direct** (red: source changes), **Indirect** (amber: downstream callers), and **Test** (blue: affected test suites).',
    interactiveTip: 'All dependency edges are derived from deterministic AST facts — zero AI hallucinations.',
  },
];

export const Onboarding: React.FC = () => {
  const { navigate } = useRouter();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [workspace, setWorkspace] = useState(
    user?.name ? `${user.name}'s Workspace` : 'Primary Workspace'
  );
  const [selectedRole, setSelectedRole] = useState('developer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Auto-open guided tour on first visit
  React.useEffect(() => {
    const seenTour = localStorage.getItem('scopegraph_onboarding_tour_seen');
    if (!seenTour) {
      const timer = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTour = () => {
    setShowTour(false);
    localStorage.setItem('scopegraph_onboarding_tour_seen', 'true');
  };

  const activeRole = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const firstName = name.trim().split(' ')[0] || user?.name?.split(' ')[0] || 'Developer';

  const handleFinish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    updateUser({
      name: name.trim() || user?.name || 'Developer',
      workspace: workspace.trim() || 'Primary Workspace',
      role: selectedRole,
      onboarded: true,
    });

    setTimeout(() => {
      navigate('/app/dashboard');
    }, 400);
  };

  const handleSkip = () => {
    updateUser({
      onboarded: true,
    });
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#151923] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-[#C7F36B] selection:text-[#151923]">
      {/* Unified 2-Column Workspace Card */}
      <div className="w-full max-w-[1080px] bg-white rounded-3xl border border-[#E4E7E1] shadow-2xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* Left Companion Panel: Cohesive Soft Halo with Scout & Interactive Graph Demo */}
        <div className="lg:col-span-5 bg-[#F7F8F5] border-b lg:border-b-0 lg:border-r border-[#E4E7E1] p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Logo Lockup */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ScopeGraphLogoMark size={28} dark={false} />
                <span className="font-bold text-sm tracking-tight text-[#151923]">ScopeGraph</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-white text-[#151923] font-semibold border border-[#E4E7E1] shadow-xs">
                Setup 1 of 1
              </span>
            </div>

            {/* Scout Mascot Companion Box */}
            <div className="bg-white rounded-2xl border border-[#E4E7E1] p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F7F8F5] border border-[#E4E7E1] p-1 shrink-0 flex items-center justify-center">
                  <img
                    src="/brand/scout-wave.gif"
                    alt="Scout Mascot"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/brand/scout-default.svg';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#151923]">Scout</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#C7F36B] text-[#151923]">
                      Co-pilot
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B929E]">Code Intelligence Guide</p>
                </div>
              </div>

              <div className="text-xs text-[#151923] leading-relaxed bg-[#F7F8F5] rounded-xl p-3 border border-[#E4E7E1]/60">
                <span className="font-bold">Hey {firstName}!</span> I analyze your codebase before you write code so you never accidentally break downstream imports or database models.
              </div>
            </div>

            {/* Live Interactive Dependency Mini-Graph */}
            <div id="tour-step-preview" className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[#8B929E]">
                <span className="flex items-center gap-1">
                  <Network className="w-3.5 h-3.5 text-[#526BEE]" />
                  Blast Radius Preview
                </span>
                <span className="text-emerald-600 font-bold text-[10px] lowercase">live preview</span>
              </div>

              <div className="bg-white rounded-2xl border border-[#E4E7E1] p-3.5 space-y-2 shadow-xs font-mono text-[11px]">
                {/* Node 1: Direct */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#E5484D]/8 border border-[#E5484D]/25">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#E5484D] shrink-0" />
                    <span className="font-semibold text-[#151923] truncate">api/routes/auth.py</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-[#E5484D] px-1.5 py-0.2 rounded bg-white shrink-0 ml-2">
                    Direct
                  </span>
                </div>

                {/* Node 2: Indirect */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#F5A623]/8 border border-[#F5A623]/25">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#F5A623] shrink-0" />
                    <span className="font-semibold text-[#151923] truncate">services/user_service.py</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-[#F5A623] px-1.5 py-0.2 rounded bg-white shrink-0 ml-2">
                    Indirect
                  </span>
                </div>

                {/* Node 3: Test */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#526BEE]/8 border border-[#526BEE]/25">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#526BEE] shrink-0" />
                    <span className="font-semibold text-[#151923] truncate">tests/test_auth.py</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-[#526BEE] px-1.5 py-0.2 rounded bg-white shrink-0 ml-2">
                    Test
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Live Workspace Spec */}
          <div className="pt-4 border-t border-[#E4E7E1] space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8B929E]">
              Current Selected Environment
            </div>
            <div className="bg-white rounded-xl border border-[#E4E7E1] p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8B929E]">Workspace:</span>
                <span className="font-bold text-[#151923] truncate max-w-[170px]">
                  {workspace || 'Primary Workspace'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8B929E]">Active Lens:</span>
                <span className="font-bold text-[#526BEE] truncate">
                  {activeRole.title}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel: Clean Setup Workflow */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header with Quick Tour button */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E4E7E1]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-medium text-[#8B929E] uppercase tracking-wider">
                    Initial Setup
                  </span>
                  <span className="text-[#8B929E]/40">•</span>
                  <span className="text-[11px] font-mono text-[#8B929E]">Workspace Config</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#151923] tracking-tight">
                  Configure your environment
                </h1>
                <p className="text-xs text-[#8B929E]">
                  Confirm your account credentials and choose your default engineering focus.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTour(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#526BEE]/10 text-[#526BEE] hover:bg-[#526BEE] hover:text-white transition-all cursor-pointer shrink-0 mt-1 shadow-xs"
                title="Open interactive walkthrough"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Quick Tour</span>
              </button>
            </div>

            <form onSubmit={handleFinish} className="space-y-6">
              {/* Section 1: Account Details */}
              <div id="tour-step-account" className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E]">
                    1. Account Details
                  </span>
                  {user?.provider === 'github' && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#151923] bg-[#F7F8F5] px-2.5 py-0.5 rounded-md border border-[#E4E7E1]">
                      <GitHubIcon className="w-3.5 h-3.5 text-[#151923]" />
                      <span>GitHub Connected</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#F7F8F5] border border-[#E4E7E1]">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-11 h-11 rounded-full border-2 border-white shadow-xs object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#151923] text-white flex items-center justify-center font-bold text-xs">
                      {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SG'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#151923] truncate">
                        {user?.name || 'Developer'}
                      </span>
                      {user?.username && (
                        <span className="text-[11px] font-mono text-[#8B929E]">
                          @{user.username}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#8B929E]">
                      <span className="truncate">{user?.email}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#151923]">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How your team sees you"
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all"
                  />
                </div>
              </div>

              {/* Section 2: Workspace Setup */}
              <div id="tour-step-workspace" className="space-y-3 pt-2 border-t border-[#E4E7E1]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E]">
                  2. Workspace Setup
                </span>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#151923] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#8B929E]" />
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="e.g. Acme Core Engineering"
                    required
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E4E7E1] bg-[#F7F8F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#151923] text-[#151923] transition-all"
                  />
                </div>
              </div>

              {/* Section 3: Primary Role */}
              <div id="tour-step-role" className="space-y-3 pt-2 border-t border-[#E4E7E1]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#8B929E]">
                    3. Your Primary Role
                  </span>
                  <span className="text-[11px] text-[#8B929E]">Default lens</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ROLES.map((role) => {
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`text-left p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#151923] bg-[#F7F8F5] shadow-xs'
                            : 'border-[#E4E7E1] bg-white hover:border-[#151923]/30 hover:bg-[#F7F8F5]/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-8 h-8 rounded-xl bg-white border border-[#E4E7E1] flex items-center justify-center p-1.5">
                            <img
                              src={role.iconSrc}
                              alt={role.title}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#151923] border-[#151923] text-[#C7F36B]'
                                : 'border-[#E4E7E1] bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#151923]">{role.title}</div>
                          <p className="text-[11px] text-[#8B929E] leading-relaxed mt-0.5">
                            {role.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E4E7E1] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full sm:w-auto text-xs font-medium text-[#8B929E] hover:text-[#151923] hover:bg-[#C7F36B]/25 px-3 py-2 rounded-xl transition-all cursor-pointer order-2 sm:order-1"
                >
                  Skip setup for now
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto group flex items-center justify-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-[#151923] text-[#F7F8F5] hover:bg-[#C7F36B] hover:text-[#151923] hover:shadow-lg hover:shadow-[#C7F36B]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer shadow-sm order-1 sm:order-2"
                >
                  <span>Complete Setup & Enter ScopeGraph</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C7F36B] group-hover:text-[#151923] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-6 flex items-center gap-2 text-xs text-[#8B929E]">
        <ScopeGraphLogoMark size={16} dark={false} />
        <span>ScopeGraph — Deterministic change intelligence</span>
      </div>

      {/* Interactive AWS-Style Guided Walkthrough Overlay */}
      <OnboardingTour
        isOpen={showTour}
        onClose={handleCloseTour}
        steps={TOUR_STEPS}
      />
    </div>
  );
};
