import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Function to check if a menu item is active
  const isActiveRoute = (actionPath: string): boolean => {
    if (actionPath === '/admin' && (location.pathname === '/admin' || location.pathname === '/admin/')) {
      return true;
    }
    if (actionPath === '/admin/forms') {
      return location.pathname.startsWith('/admin/forms');
    }
    return location.pathname === actionPath;
  };

  const handleAction = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
  };

  const menuItems = [
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
      id: 'create-form',
      label: 'Gestión de Formularios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      variant: 'info' as const,
      action: '/admin/forms'
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
      id: 'view-reports',
      label: 'Directorios y archivos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      variant: 'primary' as const,
      action: '/admin/folders&files'
    }
  ];

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

      {/* Header */}
      <div className="p-4 border-b">
        <h3 className={`font-semibold text-gray-800 transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          {!isCollapsed && 'Acciones Rápidas'}
        </h3>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleAction(item.action)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-200 text-left
              ${
                isActiveRoute(item.action)
                  ? `
                    ${item.variant === 'info' && 'bg-blue-100 text-blue-700 border border-blue-200'}
                    ${item.variant === 'success' && 'bg-green-100 text-green-700 border border-green-200'}
                    ${item.variant === 'primary' && 'bg-indigo-100 text-indigo-700 border border-indigo-200'}
                    ${item.variant === 'warning' && 'bg-yellow-100 text-yellow-700 border border-yellow-200'}
                    shadow-sm
                  `
                  : `
                    hover:bg-gray-50 hover:shadow-sm
                    ${item.variant === 'info' && 'hover:bg-blue-50 hover:text-blue-600'}
                    ${item.variant === 'success' && 'hover:bg-green-50 hover:text-green-600'}
                    ${item.variant === 'primary' && 'hover:bg-indigo-50 hover:text-indigo-600'}
                    ${item.variant === 'warning' && 'hover:bg-yellow-50 hover:text-yellow-600'}
                  `
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
            {/* Active indicator */}
            {isActiveRoute(item.action) && (
              <span className={`
                ml-auto w-1.5 h-1.5 rounded-full
                ${item.variant === 'info' && 'bg-blue-500'}
                ${item.variant === 'success' && 'bg-green-500'}
                ${item.variant === 'primary' && 'bg-indigo-500'}
                ${item.variant === 'warning' && 'bg-yellow-500'}
              `} />
            )}
          </button>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;