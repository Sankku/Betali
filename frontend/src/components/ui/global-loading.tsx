import React from 'react';
import { useGlobalSync } from '../../context/GlobalSyncContext';
import { Loader2, Zap, Clock } from 'lucide-react';

export const GlobalLoading: React.FC = () => {
  const { isLoading, loadingMessage, syncEvents, lastSync } = useGlobalSync();

  if (!isLoading) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <Zap className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Synchronizing</h3>
            <p className="text-sm text-gray-600">{loadingMessage}</p>
            
            {/* Show recent sync event */}
            {syncEvents.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-blue-600 font-medium">
                  🔄 {syncEvents[0].message}
                </p>
              </div>
            )}
            
            {/* Last sync info */}
            {lastSync && (
              <div className="mt-1 flex items-center text-xs text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                Last sync: {formatTime(lastSync)}
              </div>
            )}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full animate-pulse" 
              style={{ width: '100%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};