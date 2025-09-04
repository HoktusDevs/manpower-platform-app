import { useState } from 'react';
import { migrationService } from '../services/migrationService';
import { authService } from '../services/authService';

interface FeatureFlagControlProps {
  feature: 'authentication' | 'applications' | 'documents' | 'realtime' | 'analytics';
  showDetails?: boolean;
  className?: string;
}

export const FeatureFlagControl: React.FC<FeatureFlagControlProps> = ({
  feature,
  showDetails = false,
  className = ''
}) => {
  const [config, setConfig] = useState(migrationService.getConfig());
  const user = authService.getCurrentUser();
  
  // Only admins can modify feature flags
  const canModify = user?.role === 'admin';
  
  const currentSystem = config.features[feature];
  
  const handleSystemChange = (newSystem: 'legacy' | 'aws_native' | 'ab_test') => {
    if (!canModify) return;
    
    migrationService.forceFeatureSystem(feature, newSystem as 'legacy' | 'aws_native');
    setConfig(migrationService.getConfig());
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'aws_native': return '🚀';
      case 'ab_test': return '🧪';
      case 'legacy': return '📊';
      case 'cognito': return '🔐';
      default: return '❓';
    }
  };

  const getSystemColor = (system: string) => {
    switch (system) {
      case 'aws_native': return 'bg-green-100 text-green-800 border-green-200';
      case 'ab_test': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'legacy': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cognito': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getSystemName = (system: string) => {
    switch (system) {
      case 'aws_native': return 'AWS Native';
      case 'ab_test': return 'A/B Testing';
      case 'legacy': return 'Legacy';
      case 'cognito': return 'Cognito';
      default: return system;
    }
  };

  // Get actual system being used for current user
  const actualSystem = migrationService.getSystemForFeature(feature, user?.userId);
  
  // Type-safe comparison for A/B testing display
  const isABTesting = currentSystem === 'ab_test';
  const showActualSystem = isABTesting && actualSystem !== 'ab_test';
  
  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Current Status Badge */}
      <div className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium border ${getSystemColor(currentSystem)}`}>
        <span className="mr-1">{getSystemIcon(currentSystem)}</span>
        {getSystemName(currentSystem)}
        {showActualSystem && (
          <span className="ml-2 text-xs opacity-75">
            → {getSystemIcon(actualSystem)} {getSystemName(actualSystem)}
          </span>
        )}
      </div>

      {/* Control Buttons (Admin Only) */}
      {canModify && showDetails && (
        <div className="ml-2 flex items-center space-x-1">
          <button
            onClick={() => handleSystemChange('legacy')}
            disabled={currentSystem === 'legacy'}
            className={`px-2 py-1 text-xs rounded border ${
              currentSystem === 'legacy'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-300'
            }`}
            title="Switch to Legacy System"
          >
            📊
          </button>
          
          <button
            onClick={() => handleSystemChange('ab_test')}
            disabled={currentSystem === 'ab_test'}
            className={`px-2 py-1 text-xs rounded border ${
              currentSystem === 'ab_test'
                ? 'bg-blue-200 text-blue-500 cursor-not-allowed'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300'
            }`}
            title="Enable A/B Testing"
          >
            🧪
          </button>
          
          <button
            onClick={() => handleSystemChange('aws_native')}
            disabled={currentSystem === 'aws_native'}
            className={`px-2 py-1 text-xs rounded border ${
              currentSystem === 'aws_native'
                ? 'bg-green-200 text-green-500 cursor-not-allowed'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-300'
            }`}
            title="Switch to AWS Native"
          >
            🚀
          </button>
        </div>
      )}

      {/* User Assignment Info */}
      {showDetails && isABTesting && user && (
        <div className="ml-3 text-xs text-gray-500">
          <span className="font-medium">Your assignment:</span>
          <span className={`ml-1 px-1.5 py-0.5 rounded ${getSystemColor(actualSystem)}`}>
            {getSystemIcon(actualSystem)} {getSystemName(actualSystem)}
          </span>
        </div>
      )}

      {/* A/B Test Progress */}
      {showDetails && isABTesting && (
        <div className="ml-3 flex items-center text-xs text-gray-500">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${config.abTesting.splitPercentage}%` }}
            />
          </div>
          <span className="ml-1 font-medium">{config.abTesting.splitPercentage}%</span>
        </div>
      )}
    </div>
  );
};

export default FeatureFlagControl;