import { useState, useEffect, useCallback } from 'react';

interface TokenInfo {
  token: string;
  expiresAt: Date;
  isValid: boolean;
  profileId?: string;
  userName?: string;
}

export function useProfilerToken() {
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // JWT Token dekodieren
  const decodeToken = useCallback((tokenString: string): TokenInfo | null => {
    try {
      if (!tokenString.startsWith('Bearer ')) {
        tokenString = `Bearer ${tokenString}`;
      }
      
      const jwtToken = tokenString.replace('Bearer ', '');
      const parts = jwtToken.split('.');
      
      if (parts.length !== 3) {
        throw new Error('Ungültiges JWT Format');
      }

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
  }, []);

  // Token aus localStorage laden
  const loadToken = useCallback(() => {
    setIsLoading(true);
    
    try {
      const savedToken = localStorage.getItem('profilerToken');
      const savedExpiry = localStorage.getItem('profilerTokenExpiry');
      
      if (savedToken && savedExpiry) {
        const expiryDate = new Date(savedExpiry);
        const now = new Date();
        
        if (expiryDate > now) {
          setCurrentToken(savedToken);
          setTokenExpiry(expiryDate);
        } else {
          // Token abgelaufen - entfernen
          clearToken();
        }
      } else {
        setCurrentToken(null);
        setTokenExpiry(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Tokens:', error);
      clearToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Token speichern
  const saveToken = useCallback((token: string) => {
    const tokenInfo = decodeToken(token);
    
    if (!tokenInfo || !tokenInfo.isValid) {
      throw new Error('Ungültiger Token');
    }

    localStorage.setItem('profilerToken', tokenInfo.token);
    localStorage.setItem('profilerTokenExpiry', tokenInfo.expiresAt.toISOString());
    
    setCurrentToken(tokenInfo.token);
    setTokenExpiry(tokenInfo.expiresAt);
    
    return tokenInfo;
  }, [decodeToken]);

  // Token löschen
  const clearToken = useCallback(() => {
    localStorage.removeItem('profilerToken');
    localStorage.removeItem('profilerTokenExpiry');
    setCurrentToken(null);
    setTokenExpiry(null);
  }, []);

  // Token validieren
  const validateToken = useCallback((token?: string): boolean => {
    const tokenToValidate = token || currentToken;
    
    if (!tokenToValidate) return false;
    
    const tokenInfo = decodeToken(tokenToValidate);
    return tokenInfo ? tokenInfo.isValid : false;
  }, [currentToken, decodeToken]);

  // Token-Info abrufen
  const getTokenInfo = useCallback((): TokenInfo | null => {
    if (!currentToken) return null;
    return decodeToken(currentToken);
  }, [currentToken, decodeToken]);

  // Verbleibende Zeit in Minuten
  const getTimeRemaining = useCallback((): number => {
    if (!tokenExpiry) return 0;
    return Math.max(0, Math.floor((tokenExpiry.getTime() - new Date().getTime()) / (1000 * 60)));
  }, [tokenExpiry]);

  // Token beim Mount laden
  useEffect(() => {
    loadToken();
  }, [loadToken]);

  // Automatische Token-Prüfung alle Minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentToken && tokenExpiry) {
        const now = new Date();
        if (tokenExpiry <= now) {
          console.log('🔑 Profiler-Token abgelaufen - wird entfernt');
          clearToken();
        }
      }
    }, 60000); // Alle 60 Sekunden prüfen

    return () => clearInterval(interval);
  }, [currentToken, tokenExpiry, clearToken]);

  const isTokenValid = currentToken && tokenExpiry && tokenExpiry > new Date();
  const timeRemaining = getTimeRemaining();

  return {
    // State
    currentToken,
    tokenExpiry,
    isTokenValid: Boolean(isTokenValid),
    timeRemaining,
    isLoading,
    
    // Actions
    saveToken,
    clearToken,
    loadToken,
    validateToken,
    getTokenInfo,
    
    // Computed
    tokenInfo: getTokenInfo()
  };
}
