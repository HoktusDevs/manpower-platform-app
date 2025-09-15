import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface SidebarProps {
  onNavigate?: (path: string) => void;
  isPluxeePortal?: boolean;
  portalType?: 'admin' | 'empresa';
}

export function Sidebar({ onNavigate, isPluxeePortal = false, portalType }: SidebarProps): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Function to check if a menu item is active
  const isActiveRoute = (actionPath: string): boolean => {
    if (isPluxeePortal) {
      if (portalType === 'admin') {
        if (actionPath === '/pluxee/admin' && location.pathname === '/pluxee/admin') {
          return true;
        }
        return location.pathname === actionPath;
      } else if (portalType === 'empresa') {
        if (actionPath === '/pluxee/empresa' && location.pathname === '/pluxee/empresa') {
          return true;
        }
        return location.pathname === actionPath;
      }
    } else {
      if (actionPath === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/')) {
        return true;
      }
      return location.pathname === actionPath;
    }
    return false;
  };

  const handleAction = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
  };

  // Define menu items based on portal type
  const getMenuItems = () => {
    if (isPluxeePortal && portalType === 'admin') {
      return [
        {
          id: 'folders',
          label: 'Directorios y Archivos',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
          variant: 'info' as const,
          action: '/pluxee/admin/folders'
        }
      ];
    } else if (isPluxeePortal && portalType === 'empresa') {
      return [
        {
          id: 'folders',
          label: 'Documentos Empresariales',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
          variant: 'info' as const,
          action: '/pluxee/empresa/folders'
        }
      ];
    } else {
      // Regular admin menu items
      return [
        {
          id: 'dashboard',
          label: 'Panel Principal',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
          variant: 'primary' as const,
          action: '/admin'
        },
        {
          id: 'view-reports',
          label: 'Directorios y archivos',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
          variant: 'primary' as const,
          action: '/admin/folders&files'
        },
        {
          id: 'manage-jobs',
          label: 'Gestión de Empleos',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0h8m-8 0a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V8a2 2 0 00-2-2z" />
            </svg>
          ),
          variant: 'warning' as const,
          action: '/admin/jobs'
        },
        {
          id: 'manage-applications',
          label: 'Gestionar Postulaciones',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          variant: 'success' as const,
          action: '/admin/applications'
        },
        {
          id: 'settings',
          label: 'Configuración',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
          variant: 'info' as const,
          action: '/admin/settings'
        }
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside 
      className={`
        bg-white shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        h-full relative overflow-visible
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 z-20 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <svg 
          className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 19l-7-7 7-7" 
          />
        </svg>
      </button>

      {/* Menu Items */}
      <nav className="p-4 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAction(item.action)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-300 text-left ease-in-out
              ${
                isActiveRoute(item.action)
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-lg shadow-blue-100/50 scale-[1.02] backdrop-blur-sm'
                  : 'hover:bg-gradient-to-r hover:from-blue-25 hover:to-blue-50 hover:text-blue-600 hover:shadow-md hover:scale-[1.01]'
              }
            `}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className={`text-sm font-medium truncate ${
                isActiveRoute(item.action) ? 'font-semibold' : ''
              }`}>
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;