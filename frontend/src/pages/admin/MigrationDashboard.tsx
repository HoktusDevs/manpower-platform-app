import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAWSNative } from '../../hooks/useAWSNative';
import { useAnalytics } from '../../hooks/useAnalytics';
import { migrationService } from '../../services/migrationService';

interface PerformanceMetric {
  system: 'legacy' | 'aws_native';
  feature: string;
  operation: string;
  latency: number;
  success: boolean;
  error?: string;
  timestamp: number;
  userId?: string;
}

export const MigrationDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { getMigrationConfig, getPerformanceComparison, updateMigrationConfig } = useAWSNative();
  const { trackMigrationEvent, trackButtonClick } = useAnalytics();
  const [config, setConfig] = useState(getMigrationConfig());
  const [comparison, setComparison] = useState(getPerformanceComparison(60));
  const [timeWindow, setTimeWindow] = useState(60);
  const [selectedFeature, setSelectedFeature] = useState<string>('all');

  useEffect(() => {
    const interval = setInterval(() => {
      setComparison(getPerformanceComparison(timeWindow));
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [timeWindow]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleConfigUpdate = (feature: string, system: 'legacy' | 'aws_native' | 'ab_test') => {
    const newConfig = {
      ...config,
      features: {
        ...config.features,
        [feature]: system
      }
    };
    setConfig(newConfig);
    updateMigrationConfig(newConfig);
    migrationService.updateConfig(newConfig);
    
    // Track migration configuration change
    trackMigrationEvent(feature, system === 'ab_test' ? 'aws_native' : system);
    trackButtonClick(`migration_${feature}_${system}`, { previousSystem: config.features[feature as keyof typeof config.features] });
  };

  const handleRollbackToggle = () => {
    const newConfig = {
      ...config,
      rollback: {
        ...config.rollback,
        enabled: !config.rollback.enabled
      }
    };
    setConfig(newConfig);
    updateMigrationConfig(newConfig);
  };

  const handleABTestingToggle = () => {
    const newConfig = {
      ...config,
      abTesting: {
        ...config.abTesting,
        enabled: !config.abTesting.enabled
      }
    };
    setConfig(newConfig);
    updateMigrationConfig(newConfig);
  };

  const getStatusIcon = (feature: string) => {
    const status = config.features[feature as keyof typeof config.features];
    switch (status) {
      case 'aws_native': return '🚀';
      case 'ab_test': return '🧪';
      case 'legacy': return '📊';
      default: return '❓';
    }
  };

  const getStatusColor = (feature: string) => {
    const status = config.features[feature as keyof typeof config.features];
    switch (status) {
      case 'aws_native': return 'bg-green-100 text-green-800';
      case 'ab_test': return 'bg-blue-100 text-blue-800';
      case 'legacy': return 'bg-gray-100 text-gray-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const formatLatency = (latency: number) => {
    return latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <h3 className="text-red-800 font-medium">🚨 Acceso Denegado</h3>
          <p className="text-red-600 mt-2">Solo los administradores pueden acceder al dashboard de migración.</p>
          <button
            onClick={() => navigate('/postulante')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Ir al Dashboard de Postulante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                🔀 Migration Dashboard
              </h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">A/B Testing:</span>
                <button
                  onClick={handleABTestingToggle}
                  className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
                    config.abTesting.enabled
                      ? 'text-green-800 bg-green-100 hover:bg-green-200'
                      : 'text-gray-800 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {config.abTesting.enabled ? '✅ Enabled' : '❌ Disabled'}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Auto-Rollback:</span>
                <button
                  onClick={handleRollbackToggle}
                  className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded ${
                    config.rollback.enabled
                      ? 'text-red-800 bg-red-100 hover:bg-red-200'
                      : 'text-gray-800 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {config.rollback.enabled ? '🛡️ Active' : '🚫 Inactive'}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {user?.fullName || 'Administrador'}
              </span>
              <button
                onClick={() => navigate('/admin')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition duration-200"
              >
                ← Admin Dashboard
              </button>
              <button 
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Feature Status Overview */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Feature Migration Status</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(config.features).map(([feature, status]) => (
                <div key={feature} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {getStatusIcon(feature)} {feature}
                    </h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(feature)}`}>
                      {status === 'aws_native' ? 'AWS Native' : 
                       status === 'ab_test' ? 'A/B Testing' : 
                       status === 'legacy' ? 'Legacy' : 
                       status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleConfigUpdate(feature, 'legacy')}
                      className={`w-full text-left px-3 py-2 text-sm rounded ${
                        status === 'legacy' ? 'bg-gray-200 text-gray-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      📊 Legacy System
                    </button>
                    <button
                      onClick={() => handleConfigUpdate(feature, 'ab_test')}
                      className={`w-full text-left px-3 py-2 text-sm rounded ${
                        status === 'ab_test' ? 'bg-blue-200 text-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      🧪 A/B Testing
                    </button>
                    <button
                      onClick={() => handleConfigUpdate(feature, 'aws_native')}
                      className={`w-full text-left px-3 py-2 text-sm rounded ${
                        status === 'aws_native' ? 'bg-green-200 text-green-800' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      🚀 AWS Native
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Comparison */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Performance Comparison</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(parseInt(e.target.value))}
                  className="border-gray-300 rounded-md text-sm"
                >
                  <option value={15}>Last 15 minutes</option>
                  <option value={60}>Last hour</option>
                  <option value={240}>Last 4 hours</option>
                  <option value={1440}>Last 24 hours</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Legacy Stats */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📊 Legacy System</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Latency:</span>
                    <span className="text-sm font-medium">{formatLatency(comparison.legacy.averageLatency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Error Rate:</span>
                    <span className="text-sm font-medium">{(comparison.legacy.errorRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <span className="text-sm font-medium">{(comparison.legacy.successRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Requests:</span>
                    <span className="text-sm font-medium">{comparison.legacy.totalRequests}</span>
                  </div>
                </div>
              </div>

              {/* AWS Native Stats */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">🚀 AWS Native</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Latency:</span>
                    <span className="text-sm font-medium">{formatLatency(comparison.aws_native.averageLatency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Error Rate:</span>
                    <span className="text-sm font-medium">{(comparison.aws_native.errorRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <span className="text-sm font-medium">{(comparison.aws_native.successRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Requests:</span>
                    <span className="text-sm font-medium">{comparison.aws_native.totalRequests}</span>
                  </div>
                </div>
              </div>

              {/* Improvement Stats */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">📈 Improvement</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Latency:</span>
                    <span className={`text-sm font-medium ${
                      comparison.improvement.latencyImprovement > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(comparison.improvement.latencyImprovement)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Error Rate:</span>
                    <span className={`text-sm font-medium ${
                      comparison.improvement.errorRateImprovement > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(comparison.improvement.errorRateImprovement)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reliability:</span>
                    <span className={`text-sm font-medium ${
                      comparison.improvement.reliabilityImprovement > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(comparison.improvement.reliabilityImprovement)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* A/B Testing Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">A/B Testing Configuration</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split Percentage (% on AWS Native)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.abTesting.splitPercentage}
                  onChange={(e) => {
                    const newConfig = {
                      ...config,
                      abTesting: {
                        ...config.abTesting,
                        splitPercentage: parseInt(e.target.value)
                      }
                    };
                    setConfig(newConfig);
                    updateMigrationConfig(newConfig);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% (All Legacy)</span>
                  <span className="font-medium">{config.abTesting.splitPercentage}%</span>
                  <span>100% (All AWS Native)</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-4">Rollback Thresholds</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-600">Error Rate Threshold</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={config.rollback.errorThreshold}
                      onChange={(e) => {
                        const newConfig = {
                          ...config,
                          rollback: {
                            ...config.rollback,
                            errorThreshold: parseFloat(e.target.value)
                          }
                        };
                        setConfig(newConfig);
                        updateMigrationConfig(newConfig);
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-xs text-gray-500">{(config.rollback.errorThreshold * 100).toFixed(1)}%</span>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600">Latency Threshold (ms)</label>
                    <input
                      type="number"
                      min="0"
                      value={config.rollback.latencyThreshold}
                      onChange={(e) => {
                        const newConfig = {
                          ...config,
                          rollback: {
                            ...config.rollback,
                            latencyThreshold: parseInt(e.target.value)
                          }
                        };
                        setConfig(newConfig);
                        updateMigrationConfig(newConfig);
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};