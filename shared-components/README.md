# Shared Components - Token Management

Este paquete contiene servicios y componentes compartidos para la gestión de autenticación entre los diferentes frontends de la aplicación.

## Servicios Incluidos

### TokenService
Servicio singleton para gestionar tokens JWT y datos de usuario en localStorage.

### useHttpClient
Hook personalizado que incluye automáticamente tokens de autenticación en las requests HTTP y maneja refresh automático.

### ProtectedRoute
Componente para proteger rutas que requieren autenticación y/o roles específicos.

## Instalación

```bash
# En admin-frontend y applicant-frontend
npm install ../shared-components
```

## Uso

### 1. Proteger rutas con autenticación

```typescript
import { ProtectedRoute } from 'shared-components';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

### 2. Realizar requests HTTP autenticadas

```typescript
import { useHttpClient } from 'shared-components';

function MyComponent() {
  const httpClient = useHttpClient({
    baseUrl: 'https://api.example.com'
  });

  const fetchData = async () => {
    try {
      const data = await httpClient.get('/protected-endpoint');
      console.log(data);
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return <div>...</div>;
}
```

### 3. Gestión manual de tokens

```typescript
import { tokenService } from 'shared-components';

// Verificar autenticación
if (tokenService.isAuthenticated()) {
  console.log('Usuario autenticado');
}

// Obtener datos del usuario
const user = tokenService.getUser();
console.log('Rol del usuario:', user?.['custom:role']);

// Logout
tokenService.logout(); // Redirige automáticamente al auth-frontend
```

## Configuración de Puertos

El sistema asume los siguientes puertos por defecto:

- **auth-frontend**: `http://localhost:5173`
- **admin-frontend**: `http://localhost:6000`
- **applicant-frontend**: `http://localhost:6200`

## Flujo de Autenticación

1. **Login**: Usuario se autentica en `auth-frontend`
2. **Redirección**: Automática al frontend correspondiente según rol
3. **Persistencia**: Tokens se almacenan en localStorage compartido
4. **Protección**: `ProtectedRoute` verifica autenticación y rol
5. **Refresh**: Tokens se renuevan automáticamente cuando expiran
6. **Logout**: Limpia tokens y redirige a `auth-frontend`

## Roles Soportados

- `admin`: Acceso a admin-frontend
- `postulante`: Acceso a applicant-frontend

## API del TokenService

```typescript
interface TokenService {
  // Almacenamiento
  setTokens(tokenData: TokenData): void;
  setUser(user: User): void;

  // Obtención
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  getUser(): User | null;

  // Verificación
  isAuthenticated(): boolean;
  isTokenExpired(): boolean;

  // Utilitades
  getAuthHeader(): Record<string, string>;
  refreshAccessToken(authServiceUrl: string): Promise<boolean>;
  clearAuth(): void;
  logout(): void;
}
```

## Ejemplo de Implementación en Admin Frontend

```typescript
// App.tsx
import { ProtectedRoute } from 'shared-components';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

// AdminLayout.tsx
import { useHttpClient, tokenService } from 'shared-components';

function AdminLayout() {
  const httpClient = useHttpClient({
    baseUrl: 'https://api.admin.com'
  });

  const handleLogout = () => {
    tokenService.logout(); // Redirige a auth-frontend
  };

  return (
    <div>
      <nav>
        <button onClick={handleLogout}>Logout</button>
      </nav>
      <main>
        {/* Contenido del admin */}
      </main>
    </div>
  );
}
```

## Notas Importantes

- Los tokens se comparten entre todos los frontends via localStorage
- El refresh automático previene errores 401
- Las redirecciones son automáticas según el rol del usuario
- El sistema maneja la limpieza de tokens al hacer logout
- Compatible con la arquitectura micro-frontend existente