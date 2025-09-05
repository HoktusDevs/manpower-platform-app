import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAWSNative } from '../../hooks/useAWSNative';
import { AccessDenied } from '../../core-ui';
import { 
  DashboardHeader, 
  DashboardMetrics, 
  QuickActions, 
  RecentActivity 
} from '../../components/AdminDashboard';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    fetchAllApplications,
    isAWSNativeAvailable,
  } = useAWSNative();

  const isAWSNative = isAWSNativeAvailable();

  useEffect(() => {
    if (user?.role === 'admin' && isAWSNative) {
      fetchAllApplications();
    }
  }, [user, isAWSNative, fetchAllApplications]);

  if (user?.role !== 'admin') {
    return (
      <AccessDenied
        message="Solo los administradores pueden acceder a este panel."
        redirectLabel="Ir al Dashboard de Postulante"
        onRedirect={() => navigate('/postulante')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <DashboardMetrics />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};