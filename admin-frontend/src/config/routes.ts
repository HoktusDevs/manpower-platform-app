import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { MigrationDashboard } from '../pages/admin/MigrationDashboard';
import { FoldersAndFilesPage } from '../pages/admin/FoldersAndFilesPage';
import { TestWhatsappPage } from '../pages/admin/TestWhatsappPage';
import { MessagingPage } from '../pages/admin/MessagingPage';
import { SettingsPage } from '../pages/admin/SettingsPage';

export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  requireAuth?: boolean;
  requiredRole?: string;
  title?: string;
}

export const adminRoutes: RouteConfig[] = [
  {
    path: '',
    element: AdminDashboard,
    requireAuth: true,
    requiredRole: 'admin',
    title: 'Dashboard'
  },
  {
    path: 'migration',
    element: MigrationDashboard,
    requireAuth: true,
    requiredRole: 'admin',
    title: 'Migración'
  },
  {
    path: 'folders',
    element: FoldersAndFilesPage,
    requireAuth: true,
    requiredRole: 'admin',
    title: 'Carpetas y Archivos'
  },
  {
    path: 'test-whatsapp',
    element: TestWhatsappPage,
    requireAuth: true,
    requiredRole: 'admin',
    title: 'Test WhatsApp'
  },
  {
    path: 'messaging',
    element: MessagingPage,
    requireAuth: true,
    requiredRole: 'admin',
    title: 'Mensajería'
  },
  {
    path: 'settings',
    element: SettingsPage,
    requireAuth: true,
    requiredRole: 'admin',
    title: 'Configuración'
  }
];

export const externalRedirects = {
  auth: {
    login: 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com/login',
    register: 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com/register',
    forgotPassword: 'http://manpower-auth-frontend-dev.s3-website-us-east-1.amazonaws.com/forgot-password'
  },
};
