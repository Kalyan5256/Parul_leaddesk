import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  role?: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  role,
  className = '',
}) => {
  const getInitials = (str: string) => {
    if (!str) return 'PU';
    const parts = str.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg font-bold',
  }[size];

  // Dynamic gradient based on name hash
  const colors = [
    'from-blue-600 to-indigo-700',
    'from-amber-500 to-yellow-600',
    'from-emerald-600 to-teal-700',
    'from-red-600 to-rose-700',
    'from-purple-600 to-indigo-800',
    'from-cyan-600 to-blue-700',
  ];
  const charCode = name ? name.charCodeAt(0) : 0;
  const gradient = colors[charCode % colors.length];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white font-semibold shadow-md border border-white/20 select-none ${sizeStyles} ${className}`}
      title={`${name} ${role ? `(${role})` : ''}`}
    >
      <span>{getInitials(name)}</span>
    </div>
  );
};
