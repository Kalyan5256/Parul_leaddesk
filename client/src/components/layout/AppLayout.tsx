import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ title, subtitle }) => {
  return (
    <div className="min-h-screen bg-pu-mesh text-slate-100 flex flex-col md:flex-row antialiased selection:bg-pu-gold selection:text-pu-navy overflow-x-hidden">
      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Topbar */}
        <Topbar title={title} subtitle={subtitle} />

        {/* Page Body Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <BottomNav />
      </div>
    </div>
  );
};
