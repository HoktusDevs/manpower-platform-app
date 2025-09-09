import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAWSNative } from '../../hooks/useAWSNative';
import { 
  DashboardMetrics, 
  RecentActivity 
} from '../../components/AdminDashboard';

export const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const {
    fetchAllApplications,
    isAWSNativeAvailable,
  } = useAWSNative();

  const isAWSNative = isAWSNativeAvailable();

  useEffect(() => {
    if (user?.role === 'admin' && isAuthenticated && isAWSNative) {
      fetchAllApplications();
    }
  }, [user, isAuthenticated, isAWSNative, fetchAllApplications]);

  return (
    <>
      <DashboardMetrics />
      
      <div className="mt-6">
        <RecentActivity />
      </div>
    </>
  );
};