import React, { useState } from 'react';
import brandLogoImg from '../assets/images/lm3d_brand_logo_1789754135077.jpg';

interface LM3DLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  showInitialsBadge?: boolean;
}

export const LM3DLogo: React.FC<LM3DLogoProps> = ({ 
  size = 'md', 
  className = '',
  showBadge = false,
  showInitialsBadge = false
}) => {
  const [imageError, setImageError] = useState(false);
  const displayBadge = showBadge || showInitialsBadge;

  // Dimensions & Circular shape
  const sizeConfig = {
    sm: { container: 'w-8 h-8 rounded-full', shadow: 'shadow-xs' },
    md: { container: 'w-10 h-10 sm:w-11 sm:h-11 rounded-full', shadow: 'shadow-md shadow-emerald-950/40' },
    lg: { container: 'w-12 h-12 sm:w-14 sm:h-14 rounded-full', shadow: 'shadow-lg shadow-emerald-950/50' },
    xl: { container: 'w-16 h-16 sm:w-20 sm:h-20 rounded-full', shadow: 'shadow-xl shadow-emerald-950/60' }
  }[size];

  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none group ${className}`}>
      {/* Outer ambient glow matching site theme */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/35 to-teal-400/35 rounded-full opacity-40 group-hover:opacity-75 blur-xs transition duration-300 pointer-events-none" />
      
      {/* Circular Emblem Container */}
      <div 
        className={`relative overflow-hidden bg-slate-950 border border-emerald-500/40 group-hover:border-emerald-400/70 flex items-center justify-center transition-all duration-200 ${sizeConfig.container} ${sizeConfig.shadow}`}
      >
        {!imageError && brandLogoImg ? (
          <img
            src={brandLogoImg}
            alt="LM3D Logo"
            className="w-full h-full object-cover object-center scale-102 group-hover:scale-108 transition-transform duration-300"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Exact Geometric Vector Reproduction of User's Circular Emblem in Site Colors */
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full p-0.5" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Outer Ring Gradient */}
              <linearGradient id="emblemRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              {/* Background gradient: dark slate */}
              <radialGradient id="emblemBg" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#090d16" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* LM 3D Emerald Gradient */}
              <linearGradient id="lmFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="40%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="lmSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* 3 Front: Electric Cyan / Teal (replacing toy blue) */}
              <linearGradient id="threeFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="60%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <linearGradient id="threeSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0e7490" />
                <stop offset="100%" stopColor="#155e75" />
              </linearGradient>

              {/* D Front: Bright Emerald / Mint (replacing toy red) */}
              <linearGradient id="dFront" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7f3d0" />
                <stop offset="50%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="dSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#065f46" />
                <stop offset="100%" stopColor="#022c22" />
              </linearGradient>
            </defs>

            {/* Circular Dark Base */}
            <circle cx="50" cy="50" r="48" fill="url(#emblemBg)" />

            {/* Outer Circular Ring */}
            <circle cx="50" cy="50" r="44.5" stroke="url(#emblemRing)" strokeWidth="5.5" fill="none" />
            <circle cx="50" cy="50" r="41.5" stroke="#059669" strokeWidth="0.8" opacity="0.5" fill="none" />

            {/* --- TOP: INTERLOCKING 'LM' 3D GEOMETRY --- */}
            {/* L Letter Extrusion / 3D Shadow */}
            <path 
              d="M20 18 H32 V47 H49 V56 H20 Z" 
              fill="url(#lmSide)" 
              transform="translate(1.5, 1.5)"
            />
            {/* L Letter Front Face */}
            <path 
              d="M20 18 H32 V47 H49 V56 H20 Z" 
              fill="url(#lmFront)" 
            />

            {/* M Letter Extrusion / 3D Shadow */}
            <path 
              d="M37 28 L46 28 L59 47 L72 28 L81 28 L81 64 L70 64 L70 42 L60 56 L58 56 L48 42 L48 56 L37 56 Z" 
              fill="url(#lmSide)" 
              transform="translate(1.5, 1.5)"
            />
            {/* M Letter Front Face (Overlapping L's foot) */}
            <path 
              d="M37 28 L46 28 L59 47 L72 28 L81 28 L81 64 L70 64 L70 42 L60 56 L58 56 L48 42 L48 56 L37 56 Z" 
              fill="url(#lmFront)" 
            />

            {/* Subtle 3D Edge Bevel Line on LM */}
            <path 
              d="M20 18 L32 18 L32 47 L49 47 L49 56" 
              stroke="#a7f3d0" 
              strokeWidth="0.75" 
              opacity="0.8" 
              fill="none" 
            />

            {/* --- BOTTOM: '3D' 3D GEOMETRY --- */}
            {/* '3' Extrusion in Teal/Cyan */}
            <g transform="translate(1.5, 1.5)">
              <path 
                d="M27 58 H49 L42 67 H46 C48.5 67 50 69 50 72 C50 77 47 80 43 80 H28 L30 74 H42 C43 74 44 73 44 72 C44 71 43 70 42 70 H36 L39 64 H27 Z" 
                fill="url(#threeSide)" 
              />
            </g>
            {/* '3' Front Face in Electric Cyan */}
            <path 
              d="M27 58 H49 L42 67 H46 C48.5 67 50 69 50 72 C50 77 47 80 43 80 H28 L30 74 H42 C43 74 44 73 44 72 C44 71 43 70 42 70 H36 L39 64 H27 Z" 
              fill="url(#threeFront)" 
            />

            {/* 'D' Extrusion in Emerald */}
            <g transform="translate(1.5, 1.5)">
              <path 
                d="M51 58 H64 C71.5 58 76 62.5 76 69 C76 75.5 71.5 80 64 80 H51 Z M57 64 V74 H63.5 C66.5 74 69 72 69 69 C69 66 66.5 64 63.5 64 Z" 
                fill="url(#dSide)" 
              />
            </g>
            {/* 'D' Front Face in Mint Emerald */}
            <path 
              d="M51 58 H64 C71.5 58 76 62.5 76 69 C76 75.5 71.5 80 64 80 H51 Z M57 64 V74 H63.5 C66.5 74 69 72 69 69 C69 66 66.5 64 63.5 64 Z" 
              fill="url(#dFront)" 
            />

            {/* Specular Highlight Arc on Circle */}
            <path 
              d="M20 20 A44.5 44.5 0 0 1 80 20" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeLinecap="round" 
              opacity="0.35" 
              fill="none" 
            />
          </svg>
        )}

        {/* Subtle glass reflection sweep */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none rounded-full" />
      </div>

      {displayBadge && (
        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-500 text-slate-950 text-[8px] font-black rounded-full font-mono shadow-xs border border-emerald-300 leading-none">
          3D
        </span>
      )}
    </div>
  );
};

// Also export as LMRDLogo for backward compatibility
export const LMRDLogo = LM3DLogo;
