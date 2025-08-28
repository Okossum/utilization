import React, { useState, useEffect } from 'react';
import { X, Key, Clock, CheckCircle, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfilerTokenManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSaved: (token: string) => void;
  currentToken?: string;
}

interface TokenInfo {
  token: string;
  expiresAt: Date;
  isValid: boolean;
  profileId?: string;
  userName?: string;
}

export function ProfilerTokenManager({
  isOpen,
  onClose,
  onTokenSaved,
  currentToken
}: ProfilerTokenManagerProps) {
  const [token, setToken] = useState(currentToken || '');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JWT Token dekodieren und validieren
  const decodeToken = (tokenString: string): TokenInfo | null => {
    try {
      if (!tokenString.startsWith('Bearer ')) {
        tokenString = `Bearer ${tokenString}`;
      }
      
      const jwtToken = tokenString.replace('Bearer ', '');
      const parts = jwtToken.split('.');
      
      if (parts.length !== 3) {
        throw new Error('Ungültiges JWT Format');
      }

      // JWT Payload dekodieren
      const payload = JSON.parse(atob(parts[1]));
      
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const isValid = expiresAt > now;

      return {
        token: tokenString,
        expiresAt,
        isValid,
        profileId: payload.sub,
        userName: payload.name || payload.preferred_username
      };
    } catch (error) {
      console.error('Fehler beim Dekodieren des Tokens:', error);
      return null;
    }
  };

  // Token validieren
  const validateToken = async (tokenString: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const info = decodeToken(tokenString);
      
      if (!info) {
        setError('Ungültiges Token-Format');
        setTokenInfo(null);
        return;
      }

      if (!info.isValid) {
        setError('Token ist abgelaufen');
      }

      setTokenInfo(info);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      setTokenInfo(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Token beim Eingeben validieren
  useEffect(() => {
    if (token.trim()) {
      const timeoutId = setTimeout(() => {
        validateToken(token.trim());
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setTokenInfo(null);
      setError(null);
    }
  }, [token]);

  // Aktuellen Token beim Öffnen validieren
  useEffect(() => {
    if (isOpen && currentToken) {
      validateToken(currentToken);
    }
  }, [isOpen, currentToken]);

  const handleSaveToken = () => {
    if (tokenInfo && tokenInfo.isValid) {
      // Token in localStorage speichern
      localStorage.setItem('profilerToken', tokenInfo.token);
      localStorage.setItem('profilerTokenExpiry', tokenInfo.expiresAt.toISOString());
      
      onTokenSaved(tokenInfo.token);
      onClose();
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
  };

  const formatTimeRemaining = (expiresAt: Date): string => {
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Abgelaufen';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m`;
    }
    return `${diffMinutes}m`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Profiler Token-Verwaltung
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                JWT Token für Profiler-Zugriff verwalten (Gültigkeitsdauer: 30 Minuten)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JWT Token
              </label>
              <div className="relative">
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJRRFRuYlRPQ2c3cjBjYmlVbkZVZ1VQYTIzSFdLOGhYMl9BSHFHMXNFb3BrIn0..."
                  className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={showToken ? 'Token verbergen' : 'Token anzeigen'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Token kopieren"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Validation Status */}
              {isValidating && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Token wird validiert...</span>
                </div>
              )}
              
              {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Fehler</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              )}
            </div>

            {/* Token Info */}
            {tokenInfo && (
              <div className={`p-4 rounded-lg border ${
                tokenInfo.isValid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {tokenInfo.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    tokenInfo.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {tokenInfo.isValid ? 'Token gültig' : 'Token abgelaufen'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {tokenInfo.userName && (
                    <div>
                      <span className="text-gray-600">Benutzer:</span>
                      <span className="ml-2 font-medium">{tokenInfo.userName}</span>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-gray-600">Gültig bis:</span>
                    <span className="ml-2 font-medium">
                      {tokenInfo.expiresAt.toLocaleString('de-DE')}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-gray-600">Verbleibend:</span>
                    <span className={`ml-2 font-medium flex items-center gap-1 ${
                      tokenInfo.isValid ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {formatTimeRemaining(tokenInfo.expiresAt)}
                    </span>
                  </div>
                  
                  {tokenInfo.profileId && (
                    <div>
                      <span className="text-gray-600">Profil-ID:</span>
                      <span className="ml-2 font-medium">{tokenInfo.profileId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Anleitung */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">So erhalten Sie einen Token:</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Öffnen Sie den <a href="https://profiler.adesso-group.com" target="_blank" rel="noopener noreferrer" className="underline">Adesso Profiler</a></li>
                <li>Melden Sie sich mit Ihren Zugangsdaten an</li>
                <li>Öffnen Sie die Browser-Entwicklertools (F12)</li>
                <li>Gehen Sie zum "Network" Tab und laden Sie eine Seite neu</li>
                <li>Suchen Sie nach einem Request und kopieren Sie den "Authorization" Header</li>
                <li>Fügen Sie den kompletten "Bearer ..." Token hier ein</li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Token werden lokal gespeichert und automatisch bei Ablauf entfernt
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveToken}
                disabled={!tokenInfo || !tokenInfo.isValid}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Token speichern
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
