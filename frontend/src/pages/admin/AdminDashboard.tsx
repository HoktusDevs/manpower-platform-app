import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAWSNative } from '../../hooks/useAWSNative';
import { AccessDenied } from '../../core-ui';
import { 
  DashboardHeader, 
  DashboardMetrics, 
  Sidebar,
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
    <div className="h-screen bg-gray-100 overflow-hidden">
      <DashboardHeader />
      
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar onNavigate={navigate} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <DashboardMetrics />
            
            <div className="mt-6">
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};