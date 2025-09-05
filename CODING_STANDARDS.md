# 🏗️ Coding Standards - Enterprise Manpower Platform

## 📋 Overview

Este documento establece los estándares de código obligatorios para el proyecto. **TODO CÓDIGO DEBE CUMPLIR** estos estándares antes de ser commiteado.

## ✅ Requisitos Obligatorios

### 1. **Build & Type Safety**
```bash
# ✅ MUST PASS - Sin errores
npx tsc --noEmit

# ✅ MUST PASS - Sin warnings
npm run lint

# ✅ MUST PASS - Auto-fix aplicado
npm run lint -- --fix

# ✅ MUST PASS - GitHub Actions
git push origin main  # Debe pasar todos los workflows
```

### 2. **Principios de Arquitectura**

#### **Clean Architecture**
- **Separation of Concerns**: Cada módulo tiene una responsabilidad única
- **Dependency Inversion**: Depend de abstracciones, no de concreciones
- **Interface Segregation**: Interfaces pequeñas y específicas

```typescript
// ✅ GOOD - Clean separation
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}

class CognitoUserRepository implements UserRepository {
  async save(user: User): Promise<void> { /* implementation */ }
  async findById(id: string): Promise<User | null> { /* implementation */ }
}

// ❌ BAD - Mixed concerns
class UserService {
  saveUserAndSendEmail(user: User): Promise<void> { /* mixed concerns */ }
}
```

#### **SOLID Principles**

**S - Single Responsibility**
```typescript
// ✅ GOOD
class UserValidator {
  validate(user: User): ValidationResult { /* only validation */ }
}

class UserRepository {
  save(user: User): Promise<void> { /* only data persistence */ }
}

// ❌ BAD
class UserService {
  validateAndSaveAndSendEmail(user: User): Promise<void> { /* too many responsibilities */ }
}
```

**O - Open/Closed**
```typescript
// ✅ GOOD - Extensible sin modificar
interface AuthProvider {
  authenticate(credentials: Credentials): Promise<AuthResult>;
}

class CognitoAuthProvider implements AuthProvider { /* ... */ }
class LegacyAuthProvider implements AuthProvider { /* ... */ }

// ❌ BAD - Requires modification to extend
class AuthService {
  authenticate(type: 'cognito' | 'legacy', creds: any) { /* switch statement */ }
}
```

**L - Liskov Substitution**
```typescript
// ✅ GOOD - Subtypes are substitutable
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  area(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  constructor(side: number) { super(side, side); }
  // Behaves correctly as Rectangle
}
```

**I - Interface Segregation**
```typescript
// ✅ GOOD - Specific interfaces
interface Readable { read(): string; }
interface Writable { write(data: string): void; }
interface ReadWrite extends Readable, Writable {}

// ❌ BAD - Fat interface
interface FileHandler {
  read(): string;
  write(data: string): void;
  compress(): void;
  encrypt(): void;
  backup(): void; // Not all implementations need this
}
```

**D - Dependency Inversion**
```typescript
// ✅ GOOD - Depend on abstractions
class UserService {
  constructor(private repository: UserRepository) {} // Abstract interface
}

// ❌ BAD - Depend on concretions
class UserService {
  constructor(private cognitoRepo: CognitoUserRepository) {} // Concrete class
}
```

#### **YAGNI (You Aren't Gonna Need It)**
```typescript
// ✅ GOOD - Only what's needed now
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// ❌ BAD - Over-engineering for future "maybe" needs
interface User {
  id: string;
  email: string;
  role: UserRole;
  // These might be needed someday...
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
  permissions?: Permission[];
  auditLog?: AuditEntry[];
}
```

#### **KISS (Keep It Simple, Stupid)**
```typescript
// ✅ GOOD - Simple and clear
function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

// ❌ BAD - Unnecessarily complex
function isAdmin(user: User): boolean {
  const adminRoles = ['admin', 'administrator', 'root'];
  const userRole = user?.role?.toLowerCase()?.trim();
  return adminRoles.some(role => 
    role.localeCompare(userRole, undefined, { sensitivity: 'base' }) === 0
  );
}
```

### 3. **Code Quality Standards**

#### **TypeScript Strictness**
```typescript
// ✅ REQUIRED - Strict types
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

// ❌ FORBIDDEN - Any types
function processData(data: any): any { /* ... */ }
```

#### **Error Handling**
```typescript
// ✅ GOOD - Explicit error handling
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await userRepository.findById(id);
    return response;
  } catch (error) {
    console.error(`Failed to fetch user ${id}:`, error);
    throw new UserNotFoundError(`User ${id} not found`);
  }
}

// ❌ BAD - Silent failures
async function fetchUser(id: string): Promise<User | null> {
  try {
    return await userRepository.findById(id);
  } catch {
    return null; // Silent failure
  }
}
```

#### **Naming Conventions**
```typescript
// ✅ GOOD - Descriptive names
const isUserAuthenticated = checkUserAuthenticationStatus(user);
const authenticatedUsers = users.filter(user => user.isAuthenticated);

// ❌ BAD - Cryptic names
const isAuth = chkAuth(u);
const authUsers = users.filter(u => u.auth);
```

#### **Function Size & Complexity**
```typescript
// ✅ GOOD - Small, focused functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUser(user: User): ValidationResult {
  if (!validateEmail(user.email)) {
    return { valid: false, errors: ['Invalid email'] };
  }
  return { valid: true, errors: [] };
}

// ❌ BAD - Large, complex function
function processUser(userData: any): any {
  // 50+ lines of mixed validation, transformation, and business logic
}
```

### 4. **Architecture Patterns**

#### **Repository Pattern**
```typescript
// ✅ REQUIRED for data access
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

class CognitoUserRepository implements UserRepository {
  // Implementation details hidden
}
```

#### **Factory Pattern**
```typescript
// ✅ GOOD for complex object creation
class AuthProviderFactory {
  static create(type: AuthType): AuthProvider {
    switch (type) {
      case 'cognito': return new CognitoAuthProvider();
      case 'legacy': return new LegacyAuthProvider();
      default: throw new Error(`Unknown auth type: ${type}`);
    }
  }
}
```

#### **Observer Pattern**
```typescript
// ✅ GOOD for event handling
interface UserEventSubscriber {
  onUserRegistered(user: User): void;
  onUserLoggedIn(user: User): void;
}

class UserService {
  private subscribers: UserEventSubscriber[] = [];
  
  addSubscriber(subscriber: UserEventSubscriber): void {
    this.subscribers.push(subscriber);
  }
  
  private notifyUserRegistered(user: User): void {
    this.subscribers.forEach(sub => sub.onUserRegistered(user));
  }
}
```

## 🚫 Anti-Patterns Prohibidos

### 1. **God Objects**
```typescript
// ❌ FORBIDDEN
class UserManager {
  validateUser() {}
  saveUser() {}
  sendEmail() {}
  generateReport() {}
  processPayment() {}
  // ... 50 more methods
}
```

### 2. **Magic Numbers/Strings**
```typescript
// ❌ FORBIDDEN
if (user.status === 1) {} // What is 1?
setTimeout(() => {}, 30000); // What is 30000?

// ✅ REQUIRED
const UserStatus = {
  ACTIVE: 1,
  INACTIVE: 0
} as const;

const TIMEOUTS = {
  API_REQUEST: 30000,
  USER_SESSION: 1800000
} as const;
```

### 3. **Deep Nesting**
```typescript
// ❌ FORBIDDEN - Too deep
if (user) {
  if (user.permissions) {
    if (user.permissions.admin) {
      if (user.permissions.admin.level > 5) {
        // ... 4 levels deep
      }
    }
  }
}

// ✅ REQUIRED - Early returns
if (!user?.permissions?.admin) return false;
if (user.permissions.admin.level <= 5) return false;
return true;
```

## 📁 Project Structure Standards

```
src/
├── components/         # Reusable UI components
├── pages/             # Route components
├── services/          # Business logic & API calls
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
├── utils/             # Pure utility functions
├── constants/         # App constants
└── __tests__/         # Test files
```

## 🧪 Testing Standards

```typescript
// ✅ REQUIRED - Comprehensive tests
describe('UserService', () => {
  describe('validateUser', () => {
    it('should return valid result for valid user', () => {
      const user = { email: 'test@example.com', role: 'admin' };
      const result = userService.validateUser(user);
      expect(result.valid).toBe(true);
    });

    it('should return invalid result for user with invalid email', () => {
      const user = { email: 'invalid-email', role: 'admin' };
      const result = userService.validateUser(user);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email');
    });
  });
});
```

## 🔄 Pre-Commit Checklist

Antes de cada commit, **OBLIGATORIO** ejecutar:

```bash
# 1. ✅ Type checking
npx tsc --noEmit

# 2. ✅ Linting
npm run lint

# 3. ✅ Auto-fix issues
npm run lint -- --fix

# 4. ✅ Tests (if available)
npm test

# 5. ✅ Build verification
npm run build
```

## 🎯 GitHub Actions Integration

El pipeline **RECHAZARÁ** automáticamente cualquier código que:
- ❌ No pase `npx tsc --noEmit`
- ❌ No pase `npm run lint`
- ❌ No pase los tests
- ❌ No buildee correctamente

## 📚 Resources

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React Best Practices](https://react.dev/learn)

## ⚡ Quick Reference

```bash
# Validate code quality
npm run check-quality

# Fix all auto-fixable issues
npm run fix-all

# Full validation suite
npm run validate
```

---

**🎖️ Remember: Quality is not negotiable. Code is read more than it's written.**