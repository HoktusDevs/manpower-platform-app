import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';

export const PluxeeCompanyDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga inicial
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-full bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Pluxee Company Portal</h1>
            <p className="text-gray-600 mt-1">
              Portal empresarial para la gestión de beneficios de empleados
            </p>
            {user && (
              <div className="mt-2 text-sm text-gray-500">
                Bienvenido, {user.fullName || user.email}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Card: Empleados */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-indigo-600">147</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Empleados</h3>
                <p className="text-sm text-gray-600">
                  Total de empleados con beneficios activos
                </p>
                <button className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-800">
                  Gestionar empleados →
                </button>
              </div>

              {/* Card: Presupuesto */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6 border border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">€8,450</div>
                    <div className="text-xs text-emerald-500">de €12,000</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Presupuesto Mensual</h3>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <p className="text-sm text-gray-600">
                  70% utilizado este mes
                </p>
              </div>

              {/* Card: Beneficios Activos */}
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-6 border border-rose-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-rose-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-rose-600">4</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tipos de Beneficios</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>• Vales de comida</div>
                  <div>• Tarjetas regalo</div>
                  <div>• Transporte</div>
                  <div>• Wellness</div>
                </div>
              </div>

              {/* Card: Uso Mensual */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">892</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transacciones</h3>
                <p className="text-sm text-gray-600">
                  Uso de beneficios este mes por empleados
                </p>
                <button className="mt-3 text-amber-600 text-sm font-medium hover:text-amber-800">
                  Ver detalles →
                </button>
              </div>

              {/* Card: Reportes */}
              <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-6 border border-violet-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-violet-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-violet-600">12</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reportes</h3>
                <p className="text-sm text-gray-600">
                  Reportes de uso y análisis disponibles
                </p>
                <button className="mt-3 text-violet-600 text-sm font-medium hover:text-violet-800">
                  Generar reporte →
                </button>
              </div>

              {/* Card: Configuración */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-6 border border-cyan-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-cyan-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuración</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Ajustar parámetros de beneficios y políticas empresariales
                </p>
                <button className="text-cyan-600 text-sm font-medium hover:text-cyan-800">
                  Acceder configuración →
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left">
                  <div className="flex items-center mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Agregar Empleado</span>
                  </div>
                  <p className="text-sm text-gray-600">Registrar nuevo empleado en el sistema</p>
                </button>

                <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all text-left">
                  <div className="flex items-center mb-2">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Generar Reporte</span>
                  </div>
                  <p className="text-sm text-gray-600">Crear reporte personalizado de uso</p>
                </button>

                <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all text-left">
                  <div className="flex items-center mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Ajustar Presupuesto</span>
                  </div>
                  <p className="text-sm text-gray-600">Modificar límites de beneficios</p>
                </button>

                <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-left">
                  <div className="flex items-center mb-2">
                    <div className="p-2 bg-orange-100 rounded-lg mr-3">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">Soporte</span>
                  </div>
                  <p className="text-sm text-gray-600">Contactar con soporte técnico</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};