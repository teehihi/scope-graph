import React from 'react';

/**
 * ScopeGraph Logo Mark (Concept 1: Focus Frame + Dependency Graph)
 * Center Trigger Node: Electric Lime #C7F36B
 * Branching Nodes & Paths: Graph Blue #526BEE
 * Focus Brackets: White (for dark tile) or Ink (for light tile)
 */
export const ScopeGraphLogoMark: React.FC<{
  className?: string;
  size?: number | string;
  dark?: boolean;
}> = ({ className = '', size = 36, dark = false }) => (
  <svg
    viewBox="0 0 120 120"
    width={size}
    height={size}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Focus Brackets (Scope selection frame) */}
    <g stroke={dark ? '#FFFFFF' : '#151923'} strokeWidth="9.5" strokeLinecap="square">
      <path d="M22 46V22h24" />
      <path d="M74 22h24v24" />
      <path d="M22 74v24h24" />
      <path d="M74 98h24V74" />
    </g>
    {/* Dependency Graph Links (Graph Blue) */}
    <g stroke="#526BEE" strokeWidth="5.5" strokeLinecap="round">
      <line x1="40" y1="76" x2="58" y2="62" />
      <line x1="62" y1="58" x2="80" y2="40" />
      <line x1="62" y1="62" x2="80" y2="80" />
    </g>
    {/* Graph Blue affected nodes */}
    <circle cx="38" cy="78" r="9" fill="#526BEE" />
    <circle cx="82" cy="38" r="9" fill="#526BEE" />
    <circle cx="82" cy="82" r="9" fill="#526BEE" />
    {/* Electric Lime center trigger node */}
    <circle cx="60" cy="60" r="13" fill="#C7F36B" />
  </svg>
);

/**
 * Standalone App Icon (Dark Squircle + Logo Mark)
 */
export const ScopeGraphAppIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-9 h-9', size = 36 }) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-xl bg-[#151923] p-1.5 flex items-center justify-center shadow-sm border border-slate-800/10 shrink-0 ${className}`}
  >
    <ScopeGraphLogoMark dark={true} className="w-full h-full" />
  </div>
);

/**
 * Scout v2 Mascot Head / AI Agent Role Icon
 */
export const RoleAiAgentIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-5 h-5', size = 20 }) => (
  <svg
    viewBox="0 0 120 120"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="8" y="8" width="104" height="104" rx="26" fill="#151923" />
    <circle cx="96" cy="26" r="6" fill="#C7F36B" />
    <g>
      <circle cx="60" cy="60" r="34" fill="white" />
      <path d="M46 34Q60 18 76 32Q62 40 46 34Z" fill="#C7F36B" />
      <circle cx="28" cy="60" r="9" fill="#C7F36B" />
      <circle cx="92" cy="60" r="9" fill="#C7F36B" />
      <rect x="38" y="46" width="44" height="30" rx="15" fill="#151923" />
      <ellipse cx="52" cy="61" rx="5" ry="7" fill="#7CC7FF" />
      <ellipse cx="68" cy="61" rx="5" ry="7" fill="#7CC7FF" />
      <path d="M56 69Q60 72 64 69" fill="none" stroke="#7CC7FF" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  </svg>
);

/**
 * Reviewer Role Icon (Shield with Lime Tick)
 */
export const RoleReviewerIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 120 120"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="8" y="8" width="104" height="104" rx="26" fill="#151923" />
    <circle cx="96" cy="26" r="6" fill="#C7F36B" />
    <g>
      <path
        d="M60 30l24 10v20c0 16-11 26-24 32C47 86 36 76 36 60V40z"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M50 60l7 7 14-15"
        fill="none"
        stroke="#C7F36B"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/**
 * Status: Analysis Completed
 */
export const StatusCompletedIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 120 120"
    width={size}
    height={size}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="60" cy="60" r="50" fill="#EDF0F7" />
    <circle cx="60" cy="60" r="32" fill="#526BEE" />
    <circle cx="60" cy="60" r="16" fill="#C7F36B" />
    <circle cx="86" cy="86" r="18" fill="#151923" />
    <path
      d="M78 86l6 6 12-12"
      stroke="#C7F36B"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Status: Potentially Affected / Warning
 */
export const StatusPotentiallyAffectedIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 120 120"
    width={size}
    height={size}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="60" cy="60" r="50" fill="#EDF0F7" />
    <circle cx="60" cy="60" r="28" fill="#526BEE" />
    <circle cx="86" cy="86" r="18" fill="#F5A623" />
    <path
      d="M86 78v10M86 92v2"
      stroke="#151923"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * GitHub Icon (Monochrome vector using currentColor for automatic hover sync)
 */
export const GitHubIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

/**
 * Google Multi-Color Icon (or monochrome when requested)
 */
export const GoogleIcon: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

