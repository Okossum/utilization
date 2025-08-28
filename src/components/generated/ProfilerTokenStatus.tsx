import React, { useState } from 'react';
import { Key, Clock, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import { useProfilerToken } from '../../hooks/useProfilerToken';
import { ProfilerTokenManager } from './ProfilerTokenManager';

interface ProfilerTokenStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ProfilerTokenStatus({ 
  className = '', 
  showLabel = true 
}: ProfilerTokenStatusProps) {
  const [isTokenManagerOpen, setIsTokenManagerOpen] = useState(false);
  const { currentToken, isTokenValid, timeRemaining, saveToken, loadToken } = useProfilerToken();

  const handleTokenSaved = (token: string) => {
    saveToken(token);
    loadToken();
  };

  const getStatusColor = () => {
    if (!currentToken) return 'text-gray-400';
    if (!isTokenValid) return 'text-red-500';
    if (timeRemaining <= 5) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!currentToken) return <Key className="w-4 h-4" />;
    if (!isTokenValid) return <AlertTriangle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!currentToken) return 'Kein Token';
    if (!isTokenValid) return 'Token abgelaufen';
    if (timeRemaining <= 5) return `${timeRemaining}m`;
    return `${timeRemaining}m`;
  };

  return (
    <>
      <button
        onClick={() => setIsTokenManagerOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
        title={`Profiler Token: ${getStatusText()}`}
      >
        <div className={getStatusColor()}>
          {getStatusIcon()}
        </div>
        
        {showLabel && (
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-medium ${getStatusColor()}`}>
              Profiler
            </span>
            
            {currentToken && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{getStatusText()}</span>
              </div>
            )}
          </div>
        )}
        
        <Settings className="w-3 h-3 text-gray-400" />
      </button>

      <ProfilerTokenManager
        isOpen={isTokenManagerOpen}
        onClose={() => setIsTokenManagerOpen(false)}
        onTokenSaved={handleTokenSaved}
        currentToken={currentToken || undefined}
      />
    </>
  );
}
