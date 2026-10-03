import React, { useState } from 'react';

interface ParulLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const ParulLogo: React.FC<ParulLogoProps> = ({
  variant = 'auto',
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // Logo asset paths according to specification
  const logoSrc = variant === 'dark' ? '/parul-logo.png' : '/parul-logo-white.png';

  const sizeStyles = {
    sm: { icon: 'w-7 h-7 text-xs', text: 'text-sm font-bold', sub: 'text-[9px]' },
    md: { icon: 'w-9 h-9 text-sm', text: 'text-base font-bold', sub: 'text-[10px]' },
    lg: { icon: 'w-12 h-12 text-base', text: 'text-xl font-extrabold', sub: 'text-xs' },
    xl: { icon: 'w-16 h-16 text-lg', text: 'text-2xl font-black', sub: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {!imgError ? (
        <img
          src={logoSrc}
          alt="Parul University Crest"
          onError={() => setImgError(true)}
          className={`object-contain ${
            size === 'sm' ? 'h-7' : size === 'md' ? 'h-9' : size === 'lg' ? 'h-12' : 'h-16'
          }`}
        />
      ) : null}

      {/* Clearly marked placeholder component if png image is not supplied */}
      {imgError && (
        <div className="flex items-center gap-3">
          <div
            className={`${sizeStyles.icon} rounded-xl bg-gradient-to-br from-pu-gold via-pu-red to-pu-navy flex items-center justify-center font-black text-white shadow-lg shadow-black/30 border border-white/20`}
            title="Parul University Crest Placeholder (Replace with /parul-logo.png)"
          >
            PU
          </div>
          <div>
            <div className={`tracking-wider uppercase text-white font-sans flex items-center gap-1.5 ${sizeStyles.text}`}>
              <span>PARUL</span>
              <span className="text-pu-gold font-light">LEADDESK</span>
            </div>
            {showSubtitle && (
              <div className={`text-slate-400 font-medium tracking-wide uppercase ${sizeStyles.sub}`}>
                Admission Counselling Cell
              </div>
            )}
          </div>
        </div>
      )}

      {/* If image loaded, still show the title branding next to it */}
      {!imgError && (
        <div>
          <div className={`tracking-wider uppercase text-white font-sans flex items-center gap-1.5 ${sizeStyles.text}`}>
            <span>PARUL</span>
            <span className="text-pu-gold font-light">LEADDESK</span>
          </div>
          {showSubtitle && (
            <div className={`text-slate-400 font-medium tracking-wide uppercase ${sizeStyles.sub}`}>
              Admission Counselling Cell
            </div>
          )}
        </div>
      )}
    </div>
  );
};
