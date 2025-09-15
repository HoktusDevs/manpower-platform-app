import { useState } from 'react';

interface PostulanteSidebarProps {
  onNavigate: (path: string) => void;
}

// SVG Icons as components
const DocumentTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8z" />
  </svg>
);

const ClipboardDocumentListIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Cog6ToothIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'completar-aplicaciones',
    name: 'Completar Aplicaciones',
    icon: ClipboardDocumentListIcon,
    path: '/postulante/completar-aplicaciones',
    description: ''
  },
  {
    id: 'mis-aplicaciones',
    name: 'Mis Aplicaciones',
    icon: DocumentTextIcon,
    path: '/postulante/aplicaciones',
    description: ''
  },
  {
    id: 'buscar-empleos',
    name: 'Buscar Empleos',
    icon: BriefcaseIcon,
    path: '/aplicar',
    description: ''
  },
  {
    id: 'perfil',
    name: 'Mi Perfil',
    icon: UserIcon,
    path: '/postulante/perfil',
    description: ''
  },
  {
    id: 'configuracion',
    name: 'Configuración',
    icon: Cog6ToothIcon,
    path: '/postulante/configuracion',
    description: ''
  },
];

export const PostulanteSidebar = ({ onNavigate }: PostulanteSidebarProps) => {
  const [activeItem, setActiveItem] = useState<string>('completar-aplicaciones');

  const handleItemClick = (item: SidebarItem) => {
    setActiveItem(item.id);
    onNavigate(item.path);
  };

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center">
                  <Icon
                    className={`h-5 w-5 mr-3 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                      {item.name}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};