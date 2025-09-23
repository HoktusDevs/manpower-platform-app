import { type ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DashboardHeader, Sidebar } from '../AdminDashboard';

interface AdminLayoutProps {
  children?: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();

  // No authentication checks here - App.tsx already handles this
  // If we reach this component, user is already authenticated as admin

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <DashboardHeader />

      <div className="flex h-[calc(100vh-4rem)] overflow-visible">
        <Sidebar onNavigate={navigate} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};