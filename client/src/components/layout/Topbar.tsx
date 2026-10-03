import React from 'react';
import { ParulLogo } from '../common/ParulLogo';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 w-full glass border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile brand / Desktop page title */}
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <ParulLogo size="sm" showSubtitle={false} />
        </div>
        <div className="hidden md:block">
          {title && (
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{title}</span>
              {user?.team && (
                <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {user.team}
                </span>
              )}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User Avatar & Info */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-white/10">
            <Avatar name={user.full_name} size="sm" role={user.role} />
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-white block leading-none">
                {user.full_name}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 capitalize">
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors md:hidden"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
