import React from 'react';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => (
  <button
    onClick={onClick}
    className={`flex select-none items-center outline-none ${className}`}
    aria-label="Emit home"
  >
    <span className="text-lg font-semibold tracking-tight text-foreground">
      Emit
    </span>
  </button>
);