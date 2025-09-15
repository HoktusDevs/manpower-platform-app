import { type ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PluxeeHeader } from './PluxeeHeader';
import { Sidebar } from './AdminDashboard';

interface PluxeeLayoutProps {
  children?: ReactNode;
  portalType: 'admin' | 'empresa';
}

export const PluxeeLayout = ({ children, portalType }: PluxeeLayoutProps) => {
  const navigate = useNavigate();

  // NO AUTHENTICATION CHECK - Pluxee is public

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <PluxeeHeader />

      <div className="flex h-[calc(100vh-4rem)] overflow-visible">
        <Sidebar
          onNavigate={navigate}
          isPluxeePortal={true}
          portalType={portalType}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};