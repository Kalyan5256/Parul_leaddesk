import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ParulLogo } from '../common/ParulLogo';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus2,
  FolderKanban,
  Clock,
  Users,
  Database,
  BarChart3,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onNavigate }) => {
  const { user, logout, isEmployee, isTeamLead, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigational links filtered by role
  const navItems = [
    // Manager & Team Lead: Dashboard
    ...(!isEmployee
      ? [
          {
            to: '/dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            badge: undefined,
          },
        ]
      : []),

    // Core feature: Daily Report (Available to all)
    {
      to: '/report',
      label: 'Daily Report',
      icon: FilePlus2,
      badge: 'Core',
    },

    // My Leads
    {
      to: '/my-leads',
      label: 'My Leads',
      icon: FolderKanban,
      badge: undefined,
    },

    // Follow-ups
    {
      to: '/follow-ups',
      label: 'Follow-ups',
      icon: Clock,
      badge: undefined,
    },

    // Manager & Admin: All Leads
    ...(!isEmployee
      ? [
          {
            to: '/leads',
            label: 'All Leads',
            icon: Database,
            badge: undefined,
          },
        ]
      : []),

    // Manager & Admin: Follow-up Command Centre
    ...(!isEmployee
      ? [
          {
            to: '/followups',
            label: 'Command Centre',
            icon: BarChart3,
            badge: 'Kanban',
          },
        ]
      : []),

    // Manager & Admin: Staff Management
    ...(isManager || isAdmin
      ? [
          {
            to: '/team',
            label: 'Staff Management',
            icon: Users,
            badge: undefined,
          },
        ]
      : []),
  ];

  return (
    <aside
      className={`w-64 h-screen fixed left-0 top-0 flex flex-col glass-dark border-r border-white/10 z-40 select-none ${className}`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 bg-black/20">
        <ParulLogo size="md" />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-pu-gold to-amber-500 text-pu-navy shadow-lg shadow-amber-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-pu-navy' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-pu-navy text-white'
                            : 'bg-pu-gold/20 text-pu-gold border border-pu-gold/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-white/10 bg-black/30">
        {user && (
          <div className="p-2.5 rounded-xl glass-subtle border border-white/10 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user.full_name} size="sm" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate leading-tight">
                  {user.full_name}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="role" value={user.role} size="sm">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
