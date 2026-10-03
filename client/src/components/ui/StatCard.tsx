import React from 'react';
import { GlassCard } from './GlassCard';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: 'gold' | 'red' | 'navy' | 'emerald' | 'cyan' | 'blue';
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'gold',
  className = '',
  onClick,
}) => {
  const accentGradients = {
    gold: 'from-amber-400/20 to-yellow-500/5 text-pu-gold border-pu-gold/30',
    red: 'from-red-500/20 to-rose-500/5 text-pu-red border-pu-red/30',
    navy: 'from-blue-600/20 to-indigo-500/5 text-sky-400 border-sky-400/30',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-400/30',
    cyan: 'from-cyan-500/20 to-blue-500/5 text-cyan-400 border-cyan-400/30',
    blue: 'from-blue-500/20 to-indigo-600/5 text-blue-400 border-blue-400/30',
  }[accentColor];

  const iconBg = {
    gold: 'bg-amber-400/10 text-pu-gold border-pu-gold/20',
    red: 'bg-red-500/10 text-pu-red border-pu-red/20',
    navy: 'bg-blue-600/10 text-sky-400 border-sky-400/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-400/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-400/20',
  }[accentColor];

  return (
    <GlassCard
      variant={onClick ? 'interactive' : 'default'}
      className={`relative group ${className}`}
      onClick={onClick}
    >
      <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${accentGradients} pointer-events-none`} />
      
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
            <span>{value}</span>
            {subtitle && (
              <span className="text-xs font-normal text-slate-400">{subtitle}</span>
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl border ${iconBg} shadow-inner`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          {trend.label && <span className="text-slate-400">{trend.label}</span>}
        </div>
      )}
    </GlassCard>
  );
};
