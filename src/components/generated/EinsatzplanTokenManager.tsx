import React, { useState, useEffect } from 'react';
import { X, Key, Clock, CheckCircle, AlertTriangle, Copy, Eye, EyeOff, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEinsatzplanToken } from '../../hooks/useEinsatzplanToken';

interface EinsatzplanTokenManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSaved: (token: string) => void;
  currentToken?: string;
}

interface TokenInfo {
  token: string;
  expiresAt: Date;
  isValid: boolean;
  userId?: string;
  userName?: string;
  roles?: string[];
}

export function EinsatzplanTokenManager({
  isOpen,
  onClose,
  onTokenSaved,
  currentToken
}: EinsatzplanTokenManagerProps) {
  const { hasToken, clearToken } = useEinsatzplanToken();
  const [token, setToken] = useState(currentToken || '');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC-Taste zum Schließen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Bearer Token validieren (kann JWT oder anderes Format sein)
  const validateBearerToken = (tokenString: string): TokenInfo | null => {
    try {
      // Token bereinigen
      const cleanToken = tokenString.trim().replace(/^Bearer\s+/i, '');
      
      if (!cleanToken || cleanToken.length < 10) {
        throw new Error('Token zu kurz oder leer');
      }

      // Versuche JWT zu dekodieren (falls es ein JWT ist)
      let tokenInfo: Partial<TokenInfo> = {
        token: cleanToken,
        isValid: true, // Grundsätzlich als gültig betrachten
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h Standard-Gültigkeit
      };

      // Prüfe ob es ein JWT ist (3 Teile mit Punkten getrennt)
      const parts = cleanToken.split('.');
      if (parts.length === 3) {
        try {
          // JWT Payload dekodieren
          const payload = JSON.parse(atob(parts[1]));
          
          if (payload.exp) {
            tokenInfo.expiresAt = new Date(payload.exp * 1000);
            tokenInfo.isValid = tokenInfo.expiresAt > new Date();
          }
          
          tokenInfo.userId = payload.oid || payload.sub || payload.user_id;
          tokenInfo.userName = payload.name || payload.unique_name || payload.upn || payload.username;
          tokenInfo.roles = payload.roles || [];

          // Prüfe Audience für Einsatzplan-API (nur bei JWT)
          if (payload.aud && payload.aud !== 'api://Einsatzplan-API') {
            throw new Error('Token hat falsche Audience - muss für Einsatzplan-API sein');
          }
        } catch (jwtError) {
          // JWT-Dekodierung fehlgeschlagen, aber Token könnte trotzdem gültig sein
          console.warn('JWT-Dekodierung fehlgeschlagen, verwende Token als einfachen Bearer Token:', jwtError);
        }
      }

      return tokenInfo as TokenInfo;
    } catch (error) {
      console.error('Fehler bei der Token-Validierung:', error);
      return null;
    }
  };

  // Token validieren
  const validateToken = async (tokenString: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const info = validateBearerToken(tokenString);
      
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

  // Aktuellen Token laden
  useEffect(() => {
    if (isOpen && currentToken) {
      setToken(currentToken);
    }
  }, [isOpen, currentToken]);

  const handleSave = () => {
    console.log('handleSave called', { tokenInfo, isValid: tokenInfo?.isValid });
    if (tokenInfo && tokenInfo.isValid) {
      console.log('Saving token:', tokenInfo.token.substring(0, 20) + '...');
      onTokenSaved(tokenInfo.token);
      onClose();
    } else {
      console.log('Token not valid or missing');
    }
  };

  const handleCopy = async () => {
    if (tokenInfo?.token) {
      await navigator.clipboard.writeText(tokenInfo.token);
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Abgelaufen';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        // Schließe Dialog nur wenn auf das Overlay geklickt wird
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Verhindere Schließen beim Klick auf den Dialog
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Einsatzplan Bearer Token
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Key className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Bearer Token für Einsatzplan-API</p>
                <p>Geben Sie Ihren aktuellen Bearer Token ein. Das kann ein JWT-Token oder ein anderes Token-Format sein. Der Token wird automatisch validiert.</p>
              </div>
            </div>
          </div>

          {/* Token Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Bearer Token
            </label>
            <div className="relative">
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Fügen Sie hier Ihren Bearer Token ein..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <div className="absolute top-2 right-2 flex space-x-1">
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showToken ? 'Token verbergen' : 'Token anzeigen'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {tokenInfo?.token && (
                  <button
                    onClick={handleCopy}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Token kopieren"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Validation Status */}
          <AnimatePresence>
            {isValidating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center space-x-2 text-blue-600"
              >
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Token wird validiert...</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            {tokenInfo && !error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`border rounded-lg p-4 ${
                  tokenInfo.isValid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {tokenInfo.isValid ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      tokenInfo.isValid ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {tokenInfo.isValid ? 'Bearer Token ist gültig' : 'Bearer Token ist abgelaufen'}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {tokenInfo.userName && (
                        <div>
                          <span className="font-medium">Benutzer:</span> {tokenInfo.userName}
                        </div>
                      )}
                      {tokenInfo.roles && tokenInfo.roles.length > 0 && (
                        <div>
                          <span className="font-medium">Rollen:</span> {tokenInfo.roles.join(', ')}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Läuft ab:</span> {tokenInfo.expiresAt.toLocaleString('de-DE')}
                        {tokenInfo.isValid && (
                          <span className="ml-2 text-blue-600">
                            ({formatTimeRemaining(tokenInfo.expiresAt)} verbleibend)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            {hasToken && (
              <button
                onClick={() => {
                  clearToken();
                  setToken('');
                  setTokenInfo(null);
                  setError(null);
                }}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                🗑️ Token löschen
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!tokenInfo || !tokenInfo.isValid}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              tokenInfo && tokenInfo.isValid
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {tokenInfo && tokenInfo.isValid ? '✓ Token speichern & weiter' : 'Token validieren'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
