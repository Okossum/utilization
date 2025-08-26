import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getISOWeek } from 'date-fns';

// ===== INTERFACES =====

export interface FilterSettings {
  selectedPersons: string[];
  selectedLoB: string[];
  selectedBereich: string[];
  selectedCC: string[];
  selectedTeam: string[];
  selectedLBSExclude: string[];
  showWorkingStudents: boolean;
  showActionItems: boolean;
  showAllData: boolean;
  personSearchTerm: string;
}

export interface ViewSettings {
  visibleColumns: {
    forecastWeeks: boolean;
    lookbackWeeks: boolean;
    kpis: boolean;
    comments: boolean;
    actions: boolean;
    [key: string]: boolean;
  };
  forecastWeeks: number;
  lookbackWeeks: number;
  forecastStartWeek: number;
}

export interface UISettings {
  theme: 'light' | 'dark';
  tableView: 'compact' | 'detailed';
  sidebarCollapsed: boolean;
  defaultView: 'utilization' | 'employees' | 'sales';
}

export interface UserSettings {
  userId: string;
  filters: FilterSettings;
  views: ViewSettings;
  ui: UISettings;
  lastUpdated: Date;
}

// ===== DEFAULT SETTINGS =====

export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  selectedPersons: [],
  selectedLoB: [],
  selectedBereich: [],
  selectedCC: [],
  selectedTeam: [],
  selectedLBSExclude: [],
  showWorkingStudents: true,
  showActionItems: false,
  showAllData: true,
  personSearchTerm: '',
};

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  visibleColumns: {
    forecastWeeks: true,
    lookbackWeeks: true,
    kpis: true,
    comments: true,
    actions: true,
  },
  forecastWeeks: 8,
  lookbackWeeks: 8,
  forecastStartWeek: getISOWeek(new Date()), // Aktuelle Woche
};

export const DEFAULT_UI_SETTINGS: UISettings = {
  theme: 'light',
  tableView: 'detailed',
  sidebarCollapsed: false,
  defaultView: 'utilization',
};

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'userId'> = {
  filters: DEFAULT_FILTER_SETTINGS,
  views: DEFAULT_VIEW_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  lastUpdated: new Date(),
};

// ===== SERVICE CLASS =====

export class UserSettingsService {
  private static instance: UserSettingsService;
  private cache: Map<string, UserSettings> = new Map();

  static getInstance(): UserSettingsService {
    if (!UserSettingsService.instance) {
      UserSettingsService.instance = new UserSettingsService();
    }
    return UserSettingsService.instance;
  }

  // ===== LOAD SETTINGS =====

  async loadSettings(userId: string): Promise<UserSettings> {
    try {
      // Check cache first
      if (this.cache.has(userId)) {
        return this.cache.get(userId)!;
      }

      // Load from Firestore
      const docRef = doc(db, 'userSettings', userId);
      const docSnap = await getDoc(docRef);

      let settings: UserSettings;
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        settings = {
          userId,
          filters: { ...DEFAULT_FILTER_SETTINGS, ...data.filters },
          views: { ...DEFAULT_VIEW_SETTINGS, ...data.views },
          ui: { ...DEFAULT_UI_SETTINGS, ...data.ui },
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
        };
      } else {
        // Create default settings for new user
        settings = {
          userId,
          ...DEFAULT_USER_SETTINGS,
        };
        await this.saveSettings(settings);
      }

      // Cache the settings
      this.cache.set(userId, settings);
      return settings;
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Return defaults on error
      return {
        userId,
        ...DEFAULT_USER_SETTINGS,
      };
    }
  }

  // ===== SAVE SETTINGS =====

  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const docRef = doc(db, 'userSettings', settings.userId);
      const dataToSave = {
        ...settings,
        lastUpdated: new Date(),
      };

      await setDoc(docRef, dataToSave);
      
      // Update cache
      this.cache.set(settings.userId, dataToSave);
      
      
    } catch (error) {
      console.error('❌ Error saving user settings:', error);
      throw error;
    }
  }

  // ===== UPDATE PARTIAL SETTINGS =====

  async updateFilterSettings(userId: string, filters: Partial<FilterSettings>): Promise<void> {
    try {
      const currentSettings = await this.loadSettings(userId);
      const updatedSettings: UserSettings = {
        ...currentSettings,
        filters: { ...currentSettings.filters, ...filters },
        lastUpdated: new Date(),
      };
      
      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating filter settings:', error);
      throw error;
    }
  }

  async updateViewSettings(userId: string, views: Partial<ViewSettings>): Promise<void> {
    try {
      const currentSettings = await this.loadSettings(userId);
      const updatedSettings: UserSettings = {
        ...currentSettings,
        views: { ...currentSettings.views, ...views },
        lastUpdated: new Date(),
      };
      
      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating view settings:', error);
      throw error;
    }
  }

  async updateUISettings(userId: string, ui: Partial<UISettings>): Promise<void> {
    try {
      const currentSettings = await this.loadSettings(userId);
      const updatedSettings: UserSettings = {
        ...currentSettings,
        ui: { ...currentSettings.ui, ...ui },
        lastUpdated: new Date(),
      };
      
      await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating UI settings:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  // Migrate from localStorage to user settings
  async migrateFromLocalStorage(userId: string): Promise<void> {
    try {
      const localSettings: Partial<FilterSettings & ViewSettings> = {};

      // Migrate existing localStorage settings
      try {
        const showWorkingStudents = localStorage.getItem('utilization_show_working_students');
        if (showWorkingStudents) {
          localSettings.showWorkingStudents = JSON.parse(showWorkingStudents);
        }
      } catch {}

      try {
        const showAllData = localStorage.getItem('utilization_show_all_data');
        if (showAllData) {
          localSettings.showAllData = JSON.parse(showAllData);
        }
      } catch {}

      try {
        const visibleColumns = localStorage.getItem('utilization_visible_columns');
        if (visibleColumns) {
          localSettings.visibleColumns = JSON.parse(visibleColumns);
        }
      } catch {}

      // Save migrated settings if any exist
      if (Object.keys(localSettings).length > 0) {

        
        if (localSettings.showWorkingStudents !== undefined || localSettings.showAllData !== undefined) {
          await this.updateFilterSettings(userId, {
            showWorkingStudents: localSettings.showWorkingStudents,
            showAllData: localSettings.showAllData,
          });
        }

        if (localSettings.visibleColumns) {
          await this.updateViewSettings(userId, {
            visibleColumns: localSettings.visibleColumns,
          });
        }


      }
    } catch (error) {
      console.error('Error migrating localStorage settings:', error);
    }
  }
}

// ===== SINGLETON INSTANCE =====
export const userSettingsService = UserSettingsService.getInstance();


