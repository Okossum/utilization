import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  userSettingsService, 
  UserSettings, 
  FilterSettings, 
  ViewSettings, 
  UISettings,
  DEFAULT_USER_SETTINGS 
} from '../services/userSettings';

export interface UseUserSettingsReturn {
  // Current settings
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;

  // Filter settings
  filterSettings: FilterSettings;
  updateFilterSettings: (updates: Partial<FilterSettings>) => Promise<void>;

  // View settings
  viewSettings: ViewSettings;
  updateViewSettings: (updates: Partial<ViewSettings>) => Promise<void>;

  // UI settings
  uiSettings: UISettings;
  updateUISettings: (updates: Partial<UISettings>) => Promise<void>;

  // Utility methods
  refreshSettings: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export function useUserSettings(): UseUserSettingsReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== LOAD SETTINGS =====
  const loadSettings = useCallback(async () => {
    if (!user?.uid) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userSettings = await userSettingsService.loadSettings(user.uid);
      
      // Migrate from localStorage on first load
      if (!userSettings.lastUpdated || userSettings.lastUpdated.getTime() === DEFAULT_USER_SETTINGS.lastUpdated.getTime()) {
        await userSettingsService.migrateFromLocalStorage(user.uid);
        // Reload after migration
        const migratedSettings = await userSettingsService.loadSettings(user.uid);
        setSettings(migratedSettings);
      } else {
        setSettings(userSettings);
      }

    } catch (err) {
      console.error('Error loading user settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      
      // Set defaults on error
      setSettings({
        userId: user.uid,
        ...DEFAULT_USER_SETTINGS,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load settings when user changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ===== UPDATE METHODS =====

  const updateFilterSettings = useCallback(async (updates: Partial<FilterSettings>) => {
    if (!user?.uid || !settings) return;

    try {
      await userSettingsService.updateFilterSettings(user.uid, updates);
      
      // Update local state
      setSettings(prev => prev ? {
        ...prev,
        filters: { ...prev.filters, ...updates },
        lastUpdated: new Date(),
      } : null);

    } catch (err) {
      console.error('Error updating filter settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update filter settings');
    }
  }, [user?.uid, settings]);

  const updateViewSettings = useCallback(async (updates: Partial<ViewSettings>) => {
    if (!user?.uid || !settings) return;

    try {
      await userSettingsService.updateViewSettings(user.uid, updates);
      
      // Update local state
      setSettings(prev => prev ? {
        ...prev,
        views: { ...prev.views, ...updates },
        lastUpdated: new Date(),
      } : null);

    } catch (err) {
      console.error('Error updating view settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update view settings');
    }
  }, [user?.uid, settings]);

  const updateUISettings = useCallback(async (updates: Partial<UISettings>) => {
    if (!user?.uid || !settings) return;

    try {
      await userSettingsService.updateUISettings(user.uid, updates);
      
      // Update local state
      setSettings(prev => prev ? {
        ...prev,
        ui: { ...prev.ui, ...updates },
        lastUpdated: new Date(),
      } : null);

    } catch (err) {
      console.error('Error updating UI settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update UI settings');
    }
  }, [user?.uid, settings]);

  // ===== UTILITY METHODS =====

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const resetToDefaults = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const defaultSettings: UserSettings = {
        userId: user.uid,
        ...DEFAULT_USER_SETTINGS,
        lastUpdated: new Date(),
      };

      await userSettingsService.saveSettings(defaultSettings);
      setSettings(defaultSettings);
      
      console.log('✅ Settings reset to defaults');
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
    }
  }, [user?.uid]);

  // ===== RETURN VALUES =====

  return {
    // Current settings
    settings,
    loading,
    error,

    // Individual setting groups
    filterSettings: settings?.filters || DEFAULT_USER_SETTINGS.filters,
    viewSettings: settings?.views || DEFAULT_USER_SETTINGS.views,
    uiSettings: settings?.ui || DEFAULT_USER_SETTINGS.ui,

    // Update methods
    updateFilterSettings,
    updateViewSettings,
    updateUISettings,

    // Utility methods
    refreshSettings,
    resetToDefaults,
  };
}
