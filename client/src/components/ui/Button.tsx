import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5 min-h-[32px]',
    md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2 min-h-[40px]',
    lg: 'px-6 py-3 text-base font-bold rounded-xl gap-2.5 min-h-[48px]',
  }[size];

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-pu-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-pu-navy font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 border border-amber-300/40 active:scale-[0.98]',
    secondary:
      'bg-white/10 hover:bg-white/15 text-white border border-white/20 shadow-md backdrop-blur-md active:scale-[0.98]',
    danger:
      'bg-gradient-to-r from-pu-red to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white font-semibold shadow-lg shadow-red-500/25 border border-red-400/30 active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-white/5 text-slate-200 border border-white/25 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white active:scale-[0.98]',
    glass:
      'glass hover:bg-white/15 text-white active:scale-[0.98]',
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
