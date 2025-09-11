import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Settings Page
 * Display current user account information
 */
export function SettingsPage(): ReactNode {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Configuración
        </h1>
        <p className="mt-2 text-gray-600">
          Información de tu cuenta
        </p>
      </div>

      {/* User Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Información de la Cuenta</h2>
          <p className="text-sm text-gray-600">Detalles de tu cuenta de usuario</p>
        </div>
        
        <div className="px-6 py-6">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <dt className="text-sm font-medium text-gray-700">Nombre Completo</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.fullName || 'No disponible'}</dd>
            </div>

            {/* Email */}
            <div>
              <dt className="text-sm font-medium text-gray-700">Correo Electrónico</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.email || 'No disponible'}</dd>
            </div>

            {/* User ID */}
            <div>
              <dt className="text-sm font-medium text-gray-700">ID de Usuario</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{user?.userId || 'No disponible'}</dd>
            </div>

            {/* Role */}
            <div>
              <dt className="text-sm font-medium text-gray-700">Rol</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.role === 'admin' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user?.role === 'admin' ? 'Administrador' : user?.role || 'No disponible'}
                </span>
              </dd>
            </div>

            {/* Account Status */}
            <div>
              <dt className="text-sm font-medium text-gray-700">Estado de la Cuenta</dt>
              <dd className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Activa
                </span>
              </dd>
            </div>


            {/* Created At */}
            <div>
              <dt className="text-sm font-medium text-gray-700">Cuenta Creada</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'No disponible'}
              </dd>
            </div>

            {/* Email Verified */}
            <div>
              <dt className="text-sm font-medium text-gray-700">Email Verificado</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user?.emailVerified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {user?.emailVerified ? 'Verificado' : 'Pendiente'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

    </div>
  );
}

export default SettingsPage;