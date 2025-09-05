import { useState } from 'react';
import type { ReactNode } from 'react';

interface SidebarProps {
  onNavigate?: (path: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAction = (action: string) => {
    if (onNavigate) {
      onNavigate(action);
    }
  };

  const menuItems = [
    {
      id: 'create-form',
      label: 'Crear Nuevo Formulario',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      variant: 'info' as const,
      action: '/admin/forms/new'
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
      label: 'Ver Reportes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      variant: 'primary' as const,
      action: '/admin/reports'
    },
    {
      id: 'manage-users',
      label: 'Administrar Usuarios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      variant: 'secondary' as const,
      action: '/admin/users'
    }
  ];

  return (
    <aside 
      className={`
        bg-white shadow-lg transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        h-full relative overflow-hidden
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow z-10"
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
              hover:bg-gray-50 hover:shadow-sm
              ${item.variant === 'info' && 'hover:bg-blue-50 hover:text-blue-600'}
              ${item.variant === 'success' && 'hover:bg-green-50 hover:text-green-600'}
              ${item.variant === 'primary' && 'hover:bg-indigo-50 hover:text-indigo-600'}
              ${item.variant === 'secondary' && 'hover:bg-gray-100 hover:text-gray-700'}
            `}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className="text-sm font-medium truncate">
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