import type { ReactNode } from 'react';
import { Flex } from '../../core-ui';

/**
 * Settings Page
 * Configuration panel for system settings
 */
export function SettingsPage(): ReactNode {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Configuración
        </h1>
        <p className="mt-2 text-gray-600">
          Administra la configuración del sistema y preferencias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Settings Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Flex align="center" gap="sm" className="mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              General
            </h3>
          </Flex>
          <p className="text-gray-600 mb-4">
            Configuraciones básicas del sistema
          </p>
          <button className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
            Configurar
          </button>
        </div>

        {/* User Management Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Flex align="center" gap="sm" className="mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Usuarios
            </h3>
          </Flex>
          <p className="text-gray-600 mb-4">
            Gestión de usuarios y permisos
          </p>
          <button className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium">
            Configurar
          </button>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Flex align="center" gap="sm" className="mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Seguridad
            </h3>
          </Flex>
          <p className="text-gray-600 mb-4">
            Configuraciones de seguridad y acceso
          </p>
          <button className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
            Configurar
          </button>
        </div>

        {/* System Settings Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Flex align="center" gap="sm" className="mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sistema
            </h3>
          </Flex>
          <p className="text-gray-600 mb-4">
            Configuraciones técnicas del sistema
          </p>
          <button className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
            Configurar
          </button>
        </div>

        {/* Notifications Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Flex align="center" gap="sm" className="mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 4.828A4 4 0 015.5 4H9v1a3 3 0 006 0V4h3.5c.248 0 .487.06.69.168a2 2 0 01.81 2.664l-.723 1.447a40.056 40.056 0 00-1.422 4.503 3 3 0 00-.094-5.782M4.828 4.828L3 3m1.828 1.828L12 12m-8.11 2.654c.07-.417.411-.777.914-.914L9.228 12m-.914 2.328c.07.417.411.777.914.914L12.772 12m-.914 2.328L9.228 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Notificaciones
            </h3>
          </Flex>
          <p className="text-gray-600 mb-4">
            Configurar alertas y notificaciones
          </p>
          <button className="w-full px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium">
            Configurar
          </button>
        </div>

        {/* Backup & Export Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <Flex align="center" gap="sm" className="mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Backup
            </h3>
          </Flex>
          <p className="text-gray-600 mb-4">
            Respaldos y exportación de datos
          </p>
          <button className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
            Configurar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;