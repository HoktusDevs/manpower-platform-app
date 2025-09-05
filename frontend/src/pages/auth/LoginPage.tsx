import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import { authService } from '../../services/authService';

const USE_COGNITO = import.meta.env.VITE_USE_COGNITO === 'true';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(formData);
    
    if (success) {
      // Forzar navegación después del login exitoso
      // Obtener usuario del hook directamente
      const userData = USE_COGNITO 
        ? cognitoAuthService.getCurrentUser()
        : authService.getCurrentUser();
      
      if (userData) {
        const route = userData.role === 'admin' ? '/admin' : '/postulante';
        navigate(route);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Iniciar Sesión</h1>
          <p className="text-gray-600 mt-2">Manpower Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Recordarme
              </label>
            </div>
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-600">¿No tienes cuenta?</p>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/register/postulante"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 py-2 px-4 rounded-md font-medium transition duration-200 text-sm"
            >
              👤 Registro Postulante
            </Link>
            
            <Link
              to="/admin/register"
              className="bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 py-2 px-4 rounded-md font-medium transition duration-200 text-sm"
            >
              🔐 Acceso Admin
            </Link>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            ¿Olvidaste tu contraseña?{' '}
            <Link
              to="/forgot-password"
              className="text-blue-600 hover:text-blue-500"
            >
              Recuperar aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};