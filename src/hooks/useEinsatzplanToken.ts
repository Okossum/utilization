import { useState, useEffect } from 'react';

const STORAGE_KEY = 'einsatzplan_bearer_token';
const SESSION_KEY = 'einsatzplan_session_id';

export interface EinsatzplanTokenInfo {
  token: string;
  expiresAt: Date;
  isValid: boolean;
  userId?: string;
  userName?: string;
  roles?: string[];
}

export function useEinsatzplanToken() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<EinsatzplanTokenInfo | null>(null);

  // Token aus localStorage laden (mit Session-Check)
  useEffect(() => {
    // Prüfe ob bereits eine Session existiert
    const currentSessionId = sessionStorage.getItem(SESSION_KEY);
    const storedSessionId = localStorage.getItem(SESSION_KEY);
    
    if (!currentSessionId) {
      // Neue Session - generiere neue Session-ID
      const newSessionId = Date.now().toString();
      sessionStorage.setItem(SESSION_KEY, newSessionId);
      
      if (storedSessionId !== newSessionId) {
        // Andere Session war aktiv - lösche alten Token
        console.log('🔄 Neue Session erkannt - lösche alten Token');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(SESSION_KEY, newSessionId);
        setToken(null);
        setTokenInfo(null);
        return;
      }
    }
    
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken) {
      try {
        const tokenData = JSON.parse(savedToken);
        const expiresAt = new Date(tokenData.expiresAt);
        const now = new Date();
        
        if (expiresAt > now) {
          console.log('🔑 Token aus vorheriger Session geladen');
          setToken(tokenData.token);
          setTokenInfo({
            ...tokenData,
            expiresAt,
            isValid: true
          });
        } else {
          // Token abgelaufen, entfernen
          console.log('⏰ Token abgelaufen - entferne Token');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Fehler beim Laden des gespeicherten Tokens:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Bearer Token validieren (kann JWT oder anderes Format sein)
  const validateBearerToken = (tokenString: string): EinsatzplanTokenInfo | null => {
    try {
      const cleanToken = tokenString.trim().replace(/^Bearer\s+/i, '');
      
      if (!cleanToken || cleanToken.length < 10) {
        throw new Error('Token zu kurz oder leer');
      }

      // Grundlegende Token-Info
      let tokenInfo: Partial<EinsatzplanTokenInfo> = {
        token: cleanToken,
        isValid: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h Standard-Gültigkeit
      };

      // Prüfe ob es ein JWT ist (3 Teile mit Punkten getrennt)
      const parts = cleanToken.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          
          if (payload.exp) {
            tokenInfo.expiresAt = new Date(payload.exp * 1000);
            tokenInfo.isValid = tokenInfo.expiresAt > new Date();
          }
          
          tokenInfo.userId = payload.oid || payload.sub || payload.user_id;
          tokenInfo.userName = payload.name || payload.unique_name || payload.upn || payload.username;
          tokenInfo.roles = payload.roles || [];
        } catch (jwtError) {
          // JWT-Dekodierung fehlgeschlagen, verwende als einfachen Bearer Token
          console.warn('JWT-Dekodierung fehlgeschlagen, verwende als einfachen Bearer Token');
        }
      }

      return tokenInfo as EinsatzplanTokenInfo;
    } catch (error) {
      console.error('Fehler bei der Token-Validierung:', error);
      return null;
    }
  };

  // Token speichern
  const saveToken = (newToken: string) => {
    const info = validateBearerToken(newToken);
    if (info && info.isValid) {
      const tokenData = {
        token: info.token,
        expiresAt: info.expiresAt.toISOString(),
        userId: info.userId,
        userName: info.userName,
        roles: info.roles
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenData));
      setToken(info.token);
      setTokenInfo(info);
      return true;
    }
    return false;
  };

  // Token entfernen
  const clearToken = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setTokenInfo(null);
  };

  // Token validieren
  const isTokenValid = (): boolean => {
    if (!tokenInfo) return false;
    const now = new Date();
    return tokenInfo.expiresAt > now;
  };

  // Verbleibende Zeit berechnen
  const getTimeRemaining = (): string | null => {
    if (!tokenInfo || !tokenInfo.isValid) return null;
    
    const now = new Date();
    const diff = tokenInfo.expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Abgelaufen';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return {
    token,
    tokenInfo,
    saveToken,
    clearToken,
    isTokenValid,
    getTimeRemaining,
    hasToken: !!token
  };
}
