import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cognitoAuthService } from '../../services/cognitoAuthService';
import { Input, FormField, Button, Container, Typography, useToast } from '../../core-ui';


export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();
  const { showSuccess, showError, showLoading, hideToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    const loadingId = showLoading('Iniciando sesión', 'Verificando credenciales...');
    
    const success = await login(formData);
    hideToast(loadingId);
    
    if (success) {
      showSuccess('¡Bienvenido!', 'Has iniciado sesión correctamente');
      
      // Forzar navegación después del login exitoso
      const userData = cognitoAuthService.getCurrentUser();
      
      if (userData) {
        const route = userData.role === 'admin' ? '/admin' : '/postulante';
        navigate(route);
      }
    }
  };

  useEffect(() => {
    if (error) {
      showError('Error de autenticación', error);
    }
  }, [error, showError]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Container variant="elevated" className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <Typography variant="h1">Iniciar Sesión</Typography>
          <Typography variant="caption" color="muted" className="mt-2">
            Manpower Platform
          </Typography>
        </div>


        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormField label="Email" required>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              disabled={isLoading}
              fullWidth
            />
          </FormField>

          <FormField label="Contraseña" required>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={isLoading}
              fullWidth
            />
          </FormField>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
              Recordarme
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            fullWidth
            size="lg"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-sm text-gray-600">¿No tienes cuenta?</p>
          
          <div className="flex justify-center">
            <Link
              to="/register/postulante"
              className="text-blue-600 hover:text-blue-500 py-2 px-4 font-medium transition duration-200 text-sm"
            >
              Registrarse
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
      </Container>
    </div>
  );
};