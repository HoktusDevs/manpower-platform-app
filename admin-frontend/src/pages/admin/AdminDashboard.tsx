import { 
  DashboardMetrics, 
  RecentActivity 
} from '../../components/AdminDashboard';

export const AdminDashboard = () => {
  return (
    <>
      <DashboardMetrics />
      
      <div className="mt-6">
        <RecentActivity />
      </div>
    </>
  );
};