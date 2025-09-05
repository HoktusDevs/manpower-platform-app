import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface AdminFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  employeeId: string;
  department: string;
  adminLevel: string;
  accessCode: string;
  authorizedBy: string;
}

export const AdminRegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  const [securityPassed, setSecurityPassed] = useState(false);
  const [formData, setFormData] = useState<AdminFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    department: '',
    adminLevel: '',
    accessCode: '',
    authorizedBy: '',
  });

  // Security check: Only allow access during business hours (demo)
  useEffect(() => {
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 9 && currentHour <= 18;
    
    if (!isBusinessHours) {
      console.warn('🔐 SECURITY: Admin registration attempted outside business hours');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const verifyAccessCode = () => {
    // Security validation for access code
    const validCodes = ['ADMIN2025', 'MANPOWER_ADMIN', 'ENTERPRISE_ACCESS'];
    if (validCodes.includes(formData.accessCode.toUpperCase())) {
      setSecurityPassed(true);
    } else {
      alert('🔒 Código de acceso inválido. Contacta al administrador del sistema.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!securityPassed) {
      alert('🔐 Debe verificar el código de acceso primero.');
      return;
    }
    
    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      return;
    }

    // Additional security validation
    if (formData.password.length < 12) {
      alert('🔒 La contraseña de administrador debe tener al menos 12 caracteres.');
      return;
    }
    
    const success = await register({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      role: 'admin', // Rol fijo para esta página
      // Campos adicionales específicos de admin
      employeeId: formData.employeeId,
      department: formData.department,
      adminLevel: formData.adminLevel,
      authorizedBy: formData.authorizedBy,
    });
    
    if (success) {
      navigate('/admin');
    }
  };

  if (!securityPassed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border-2 border-red-200">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">🔐 Acceso Restringido</h1>
            <p className="text-red-600 font-semibold">Registro de Administrador</p>
            <p className="text-sm text-gray-600 mt-2">Solo personal autorizado</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Código de Acceso Administrativo
              </label>
              <input
                type="password"
                name="accessCode"
                value={formData.accessCode}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition duration-200"
                placeholder="Ingresa el código de seguridad"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este código es proporcionado por el departamento de TI
              </p>
            </div>

            <button
              type="button"
              onClick={verifyAccessCode}
              disabled={!formData.accessCode}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              Verificar Acceso
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              ¿No tienes código de acceso?{' '}
              <Link
                to="/contact-it"
                className="text-red-600 hover:text-red-500 font-semibold"
              >
                Contacta a TI
              </Link>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              ¿Eres postulante?{' '}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-500"
              >
                Registro normal aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-2xl border border-gray-300">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Registro de Administrador</h1>
          <p className="text-gray-600">Configuración de cuenta administrativa</p>
          <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full inline-block">
            ✅ Acceso Autorizado
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error de validación</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error.includes(',') ? (
                    <ul className="list-disc list-inside space-y-1">
                      {error.split(', ').map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Información Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
                placeholder="María González Silva"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ID de Empleado *
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
                placeholder="EMP001234"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Corporativo *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
              placeholder="maria.gonzalez@empresa.com"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Debe ser un email corporativo válido</p>
          </div>

          {/* Información Administrativa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Departamento *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
                disabled={isLoading}
              >
                <option value="">Selecciona departamento</option>
                <option value="rrhh">Recursos Humanos</option>
                <option value="it">Tecnologías de la Información</option>
                <option value="gerencia">Gerencia General</option>
                <option value="operaciones">Operaciones</option>
                <option value="finanzas">Finanzas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nivel de Administrador *
              </label>
              <select
                name="adminLevel"
                value={formData.adminLevel}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
                disabled={isLoading}
              >
                <option value="">Selecciona nivel</option>
                <option value="junior">Administrador Junior</option>
                <option value="senior">Administrador Senior</option>
                <option value="supervisor">Supervisor de RRHH</option>
                <option value="manager">Manager de Área</option>
                <option value="director">Director</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Autorizado Por *
            </label>
            <input
              type="text"
              name="authorizedBy"
              value={formData.authorizedBy}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
              placeholder="Nombre del supervisor que autoriza"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Manager o Director que aprueba esta cuenta</p>
          </div>

          {/* Seguridad Avanzada */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-semibold text-yellow-800 mb-3">🔐 Seguridad Administrativa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña Segura *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
                  placeholder="Mínimo 12 caracteres"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Incluye mayúsculas, números y símbolos</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar Contraseña *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition duration-200"
                  placeholder="Repite la contraseña"
                  disabled={isLoading}
                />
                {formData.password !== formData.confirmPassword && formData.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-1"
                disabled={isLoading}
              />
              <label className="ml-3 block text-sm text-gray-700">
                <span className="font-semibold text-red-800">Declaro bajo responsabilidad que:</span>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                  <li>Tengo autorización oficial para crear esta cuenta administrativa</li>
                  <li>Cumpliré con todas las políticas de seguridad de la empresa</li>
                  <li>Mantendré confidencial toda la información a la que tenga acceso</li>
                  <li>Notificaré inmediatamente cualquier brecha de seguridad</li>
                </ul>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || formData.password !== formData.confirmPassword || formData.password.length < 12}
            className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white py-3 px-6 rounded-lg hover:from-gray-800 hover:to-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isLoading ? 'Creando cuenta administrativa...' : '🔐 Crear Cuenta de Administrador'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-gray-700 hover:text-gray-900 font-semibold"
            >
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};