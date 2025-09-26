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
          action: '/admin/folders'
        },
        {
          id: 'test-whatsapp',
          label: 'Test Whatsapp',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          variant: 'success' as const,
          action: '/admin/test-whatsapp'
        },
        {
          id: 'test-ocr',
          label: 'Test OCR',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          variant: 'info' as const,
          action: '/admin/test-ocr'
        },
        {
          id: 'messaging',
          label: 'Mensajería',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
          variant: 'default' as const,
          action: '/admin/messaging'
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
        bg-white shadow-lg transition-all duration-500 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
        h-full relative overflow-visible
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-8 bg-white border border-gray-300 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out z-30 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-500 ease-in-out ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
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
              transition-all duration-500 ease-in-out
              ${
                isActiveRoute(item.action)
                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-lg shadow-blue-100/50 scale-[1.02] backdrop-blur-sm'
                  : 'hover:bg-gradient-to-r hover:from-blue-25 hover:to-blue-50 hover:text-blue-600 hover:shadow-md hover:scale-[1.01]'
              }
            `}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span 
              className={`
                text-sm font-medium truncate transition-all duration-500 ease-in-out overflow-hidden
                ${isCollapsed 
                  ? 'w-0 opacity-0 transform translate-x-2' 
                  : 'w-auto opacity-100 transform translate-x-0'
                }
                ${isActiveRoute(item.action) ? 'font-semibold' : ''}
              `}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;