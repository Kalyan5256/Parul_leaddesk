import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus2,
  FolderKanban,
  Clock,
  Database,
  Users,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { isEmployee } = useAuth();

  // Primary navigation items based on role
  const navItems = isEmployee
    ? [
        { to: '/report', label: 'Report', icon: FilePlus2 },
        { to: '/my-leads', label: 'My Leads', icon: FolderKanban },
        { to: '/follow-ups', label: 'Follow-ups', icon: Clock },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/report', label: 'Report', icon: FilePlus2 },
        { to: '/leads', label: 'Leads', icon: Database },
        { to: '/followups', label: 'Command', icon: Clock },
        { to: '/team', label: 'Staff', icon: Users },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-white/10 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 text-[11px] font-medium ${
                  isActive
                    ? 'text-pu-gold font-bold scale-105'
                    : 'text-slate-400 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-lg ${
                      isActive ? 'bg-pu-gold/20 text-pu-gold' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="mt-0.5">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
