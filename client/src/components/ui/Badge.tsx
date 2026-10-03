import React from 'react';

export type LeadStatus =
  | 'New'
  | 'Interested'
  | 'Follow Up'
  | 'Not Interested'
  | 'Admission Done'
  | 'Wrong Number';

export type LeadType = 'online' | 'offline';

export type RoleType = 'employee' | 'team_lead' | 'manager' | 'admin';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'status'
    | 'type'
    | 'role'
    | 'neutral'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'repeat';
  value?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  value,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 rounded-lg font-semibold',
  }[size];

  // Specific mapping for lead status
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-500/15 text-blue-300 border border-blue-400/30';
      case 'Interested':
        return 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30';
      case 'Follow Up':
        return 'bg-amber-500/20 text-amber-300 border border-amber-400/30';
      case 'Not Interested':
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/40';
      case 'Admission Done':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm shadow-emerald-500/20';
      case 'Wrong Number':
        return 'bg-rose-500/20 text-rose-300 border border-rose-400/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  // Specific mapping for lead type
  const getTypeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case 'online':
        return 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30';
      case 'offline':
        return 'bg-amber-500/15 text-amber-300 border border-amber-400/30';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  // Specific mapping for user role
  const getRoleStyles = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-300 border border-purple-400/30';
      case 'manager':
        return 'bg-pu-gold/20 text-pu-gold border border-pu-gold/30';
      case 'team_lead':
        return 'bg-blue-500/20 text-sky-300 border border-blue-400/30';
      case 'employee':
        return 'bg-slate-800 text-slate-300 border border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border border-slate-700';
    }
  };

  let resolvedStyles = '';
  if (variant === 'status' && value) {
    resolvedStyles = getStatusStyles(value);
  } else if (variant === 'type' && value) {
    resolvedStyles = getTypeStyles(value);
  } else if (variant === 'role' && value) {
    resolvedStyles = getRoleStyles(value);
  } else if (variant === 'repeat') {
    resolvedStyles = 'bg-orange-500/20 text-orange-300 border border-orange-400/40';
  } else {
    const genericVariants = {
      neutral: 'bg-white/10 text-slate-200 border border-white/15',
      success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
      warning: 'bg-amber-500/20 text-amber-300 border border-amber-400/30',
      danger: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
      info: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
      repeat: 'bg-orange-500/20 text-orange-300 border border-orange-400/40',
      status: 'bg-slate-800 text-slate-300 border border-slate-700',
      type: 'bg-slate-800 text-slate-300 border border-slate-700',
      role: 'bg-slate-800 text-slate-300 border border-slate-700',
    };
    resolvedStyles = genericVariants[variant];
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 uppercase tracking-wider select-none ${sizeStyles} ${resolvedStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
};
