"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'app-icon' | 'light-icon' | 'dark-icon' | 'full-light' | 'full-dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

// SVG Mark component for LF
function LFMark({ lColor = 'currentColor', fColor = '#1877F2', sizePx = 32 }: { lColor?: string; fColor?: string; sizePx?: number }) {
  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block shrink-0"
    >
      <defs>
        <linearGradient id="lf-blue-grad" x1="40" y1="20" x2="95" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2589FF" />
          <stop offset="100%" stopColor="#0052FF" />
        </linearGradient>
      </defs>
      
      {/* Slanted group for authentic LeadFlu italic angle */}
      <g transform="skewX(-14) translate(10, 0)">
        {/* 'L' Letter Stem & Foot */}
        <path
          d="M 22 18 L 38 18 L 30 62 L 62 62 L 59 76 L 12 76 Z"
          fill={lColor}
        />
        
        {/* 'F' Top Wing Stroke */}
        <path
          d="M 46 22 C 48 22 84 22 88 22 C 92 22 92 34 82 36 C 68 39 52 38 42 38 C 40 38 43 22 46 22 Z"
          fill="url(#lf-blue-grad)"
        />

        {/* 'F' Bottom Wing Stroke */}
        <path
          d="M 39 44 C 42 44 76 44 80 44 C 84 44 83 56 74 58 C 62 60 48 59 36 59 C 34 59 37 44 39 44 Z"
          fill="url(#lf-blue-grad)"
        />
      </g>
    </svg>
  );
}

export function LeadFluLogo({
  variant = 'full',
  className = '',
  size = 'md',
  showTagline = false
}: LogoProps) {

  // Sizing definitions
  const heights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-14',
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 56,
  };

  const currentIconSize = iconSizes[size];

  // App Icon variant (Squircle dark container)
  if (variant === 'app-icon') {
    return (
      <div className={cn("relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B1528] via-[#0D1B36] to-[#050B17] border border-blue-500/20 shadow-xl shadow-blue-950/40 p-2", className)}>
        <LFMark lColor="#FFFFFF" fColor="#1877F2" sizePx={currentIconSize} />
      </div>
    );
  }

  // Light Icon variant
  if (variant === 'light-icon') {
    return (
      <div className={cn("inline-flex items-center justify-center p-1.5 rounded-xl bg-white border border-slate-200 shadow-sm", className)}>
        <LFMark lColor="#0A1128" fColor="#1877F2" sizePx={currentIconSize} />
      </div>
    );
  }

  // Dark Icon variant
  if (variant === 'dark-icon') {
    return (
      <div className={cn("inline-flex items-center justify-center p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-md", className)}>
        <LFMark lColor="#FFFFFF" fColor="#1877F2" sizePx={currentIconSize} />
      </div>
    );
  }

  // Icon only (Theme adaptive)
  if (variant === 'icon') {
    return (
      <div className={cn("inline-flex items-center justify-center", className)}>
        <div className="dark:hidden">
          <LFMark lColor="#0B132B" fColor="#1877F2" sizePx={currentIconSize} />
        </div>
        <div className="hidden dark:block">
          <LFMark lColor="#FFFFFF" fColor="#1877F2" sizePx={currentIconSize} />
        </div>
      </div>
    );
  }

  // Full Wordmark (Adaptive or Specific)
  return (
    <div className={cn("inline-flex flex-col select-none", className)}>
      <div className={cn("inline-flex items-center gap-1 font-extrabold italic tracking-tight", heights[size])}>
        {/* Theme Adaptive Text Wordmark */}
        <div className="flex items-center">
          <div className="dark:hidden flex items-center">
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-[#0B132B] font-sans">
              Lead
            </span>
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-[#0066FF] font-sans">
              Flu
            </span>
          </div>

          <div className="hidden dark:flex items-center">
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white font-sans">
              Lead
            </span>
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-[#2589FF] font-sans">
              Flu
            </span>
          </div>
        </div>
      </div>
      {showTagline && (
        <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-400 mt-0.5">
          Freelance Editor Board
        </span>
      )}
    </div>
  );
}
