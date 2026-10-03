import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'dark' | 'glow-gold' | 'glow-red' | 'interactive';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className = '',
  padding = 'md',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
    xl: 'p-8 sm:p-10',
  }[padding];

  const variantStyles = {
    default: 'glass text-white',
    subtle: 'glass-subtle text-white',
    dark: 'glass-dark text-white',
    'glow-gold': 'glass text-white shadow-[0_0_35px_rgba(245,168,0,0.22)] border-pu-gold/30',
    'glow-red': 'glass text-white shadow-[0_0_35px_rgba(200,16,46,0.22)] border-pu-red/30',
    interactive: 'glass text-white hover:border-white/30 hover:shadow-[0_12px_40px_rgba(2,10,30,0.45)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
  }[variant];

  return (
    <div
      className={`rounded-2xl relative overflow-hidden ${variantStyles} ${paddingStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
