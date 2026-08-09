import React from 'react';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => (
  <button
    onClick={onClick}
    className={`flex select-none items-center gap-2.5 outline-none ${className}`}
    aria-label="Emit home"
  >
    <span className="flex size-8 items-center justify-center rounded-md bg-primary shadow-[0_0_20px_-4px_var(--primary)]">
      <svg width="19" height="18" viewBox="0 0 20 18" fill="none" aria-hidden="true">
        <rect x="1" y="8" width="3" height="7" rx="1" fill="white" opacity="0.7" />
        <rect x="6" y="5" width="3" height="13" rx="1" fill="white" />
        <rect x="11" y="7" width="3" height="9" rx="1" fill="white" opacity="0.85" />
        <rect x="16" y="4" width="3" height="15" rx="1" fill="white" opacity="0.6" />
      </svg>
    </span>
    <span className="text-lg font-semibold tracking-tight text-foreground">
      Emit
    </span>
  </button>
);