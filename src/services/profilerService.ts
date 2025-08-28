// Profiler Integration Service
// Automatischer Import von Mitarbeiterdaten aus dem Adesso Profiler System

export interface ProfilerProject {
  id: string;
  name: string;
  customer: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  role?: string;
  skills?: string[];
  technologies?: string[];
  responsibilities?: string[];
}

export interface ProfilerSkill {
  id: string;
  name: string;
  category: string;
  level?: number;
  experience?: string;
}

export interface ProfilerProfile {
  id: string;
  name: string;
  email: string;
  position?: string;
  department?: string;
  location?: string;
  startDate?: string;
  profileUrl: string;
  
  // Profiler-spezifische Daten
  skills: ProfilerSkill[];
  projects: ProfilerProject[];
  certifications?: string[];
  languages?: string[];
  education?: string[];
}

export interface ProfilerImportResult {
  success: boolean;
  profile?: ProfilerProfile;
  error?: string;
  importedFields: string[];
}

class ProfilerService {
  private baseUrl = 'https://profiler.adesso-group.com';
  
  /**
   * Extrahiert die Profil-ID aus einer Profiler-URL
   */
  extractProfileId(profileUrl: string): string | null {
    const match = profileUrl.match(/\/profile\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Importiert Profildaten aus dem Profiler über unser Backend
   */
  async importProfileData(profileUrl: string, employeeId: string, firebaseToken: string, authToken?: string): Promise<ProfilerImportResult> {
    try {
      const profileId = this.extractProfileId(profileUrl);
      if (!profileId) {
        return {
          success: false,
          error: 'Ungültige Profiler-URL',
          importedFields: []
        };
      }

      if (!firebaseToken) {
        return {
          success: false,
          error: 'Authentifizierung fehlgeschlagen - bitte melden Sie sich erneut an',
          importedFields: []
        };
      }

      // API-Call an unser Backend für Profiler-Import
      console.log('🔍 Profiler Service: Sende Request an Backend:', {
        url: 'http://localhost:3001/api/profiler/import',
        profileUrl,
        employeeId,
        hasFirebaseToken: !!firebaseToken,
        hasAuthToken: !!authToken,
        firebaseTokenLength: firebaseToken?.length || 0
      });
      
      const response = await fetch('http://localhost:3001/api/profiler/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`
        },
        body: JSON.stringify({
          profileUrl,
          employeeId,
          authToken
        })
      });

      console.log('🔍 Profiler Service: Backend Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Import fehlgeschlagen',
          importedFields: []
        };
      }

      console.log('✅ Profiler Service: Import erfolgreich, lade aktualisierte Daten aus Firebase...');

      // Nach erfolgreichem Import: Lade die aktualisierten Daten aus der utilizationData Collection
      try {
        const { db } = await import('../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        
        const utilizationDocRef = doc(db, 'utilizationData', employeeId);
        const utilizationDoc = await getDoc(utilizationDocRef);
        
        if (!utilizationDoc.exists()) {
          console.warn('⚠️ Profiler Service: Mitarbeiter-Dokument nicht gefunden nach Import');
          return {
            success: false,
            error: 'Mitarbeiter-Daten nicht gefunden nach Import',
            importedFields: []
          };
        }
        
        const employeeData = utilizationDoc.data();
        console.log('🔍 Profiler Service: Geladene Employee-Daten:', {
          hasEmail: !!employeeData.email,
          hasPosition: !!employeeData.position,
          hasBereich: !!employeeData.bereich,
          hasStandort: !!employeeData.standort,
          projectReferencesCount: employeeData.projectReferences?.length || 0
        });
        
        // Konvertiere die Firebase-Daten in das ProfilerProfile-Format
        const realProfile: ProfilerProfile = {
          id: profileId,
          name: employeeData.person || 'Unbekannt',
          email: employeeData.email || '',
          position: employeeData.position || '',
          department: employeeData.bereich || '',
          location: employeeData.standort || '',
          startDate: employeeData.startDate || '',
          profileUrl,
          
          // Konvertiere projectReferences zu projects
          projects: (employeeData.projectReferences || [])
            .filter(proj => proj.projectSource === 'profiler')
            .map(proj => ({
              id: proj.id,
              name: proj.projectName,
              customer: proj.customer || '',
              startDate: proj.startDate || '',
              endDate: proj.endDate || '',
              description: proj.description || '',
              role: proj.roles?.[0]?.name || '',
              skills: proj.skills?.map(skill => skill.name) || [],
              technologies: proj.technologies || [],
              responsibilities: proj.responsibilities || []
            })),
          
          // Skills aus den importierten Daten (falls vorhanden)
          skills: [], // TODO: Skills-Mapping implementieren falls nötig
          
          // Weitere Felder falls verfügbar
          certifications: employeeData.certifications || [],
          languages: employeeData.languages || [],
          education: employeeData.education || []
        };

        console.log('✅ Profiler Service: Echte Profil-Daten erstellt:', {
          name: realProfile.name,
          email: realProfile.email,
          position: realProfile.position,
          projectsCount: realProfile.projects.length
        });

        return {
          success: true,
          profile: realProfile,
          importedFields: result.importedFields || ['email', 'position', 'department', 'location', 'projects', 'skills']
        };
        
      } catch (firebaseError) {
        console.error('❌ Profiler Service: Fehler beim Laden der Firebase-Daten:', firebaseError);
        return {
          success: false,
          error: 'Fehler beim Laden der aktualisierten Daten',
          importedFields: []
        };
      }

    } catch (error) {
      console.error('Fehler beim Profiler-Import:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        importedFields: []
      };
    }
  }

  /**
   * Konvertiert Profiler-Skills zu unserem internen Format
   */
  convertSkillsToInternalFormat(profilerSkills: ProfilerSkill[]): any[] {
    return profilerSkills.map(skill => ({
      id: skill.id,
      skillId: skill.id,
      skillName: skill.name,
      level: skill.level || 3,
      category: skill.category,
      experience: skill.experience,
      source: 'profiler',
      importedAt: new Date().toISOString()
    }));
  }

  /**
   * Konvertiert Profiler-Projekte zu unserem internen ProjectHistoryItem Format
   */
  convertProjectsToInternalFormat(profilerProjects: ProfilerProject[], employeeId: string): any[] {
    return profilerProjects.map(project => ({
      id: `profiler-${project.id}`,
      employeeId,
      projectName: project.name,
      customer: project.customer,
      description: project.description || '',
      startDate: project.startDate,
      endDate: project.endDate,
      projectType: 'historical' as const,
      projectSource: 'profiler' as const,
      
      // Rollen aus Profiler
      roles: project.role ? [{
        id: `role-${project.id}`,
        name: project.role,
        categoryName: 'Profiler Import',
        tasks: project.responsibilities || []
      }] : [],
      
      // Skills aus Profiler
      skills: (project.skills || []).map((skillName, index) => ({
        id: `skill-${project.id}-${index}`,
        name: skillName,
        categoryName: 'Technical',
        level: 3
      })),
      
      // Aktivitäten aus Profiler
      activities: project.responsibilities || [],
      
      // Meta-Daten
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'profiler'
    }));
  }

  // Basic-Auth Methoden entfernt - nur noch Token-Auth unterstützt

  /**
   * Führt einen vollständigen Import durch und gibt die konvertierten Daten zurück
   */
  async performFullImport(profileUrl: string, employeeId: string, firebaseToken: string, authToken?: string) {
    const importResult = await this.importProfileData(profileUrl, employeeId, firebaseToken, authToken);
    
    if (!importResult.success || !importResult.profile) {
      return importResult;
    }

    const profile = importResult.profile;
    
    return {
      ...importResult,
      convertedData: {
        employeeData: {
          name: profile.name,
          email: profile.email,
          position: profile.position,
          department: profile.department,
          location: profile.location,
          startDate: profile.startDate,
          profileUrl: profile.profileUrl
        },
        skills: this.convertSkillsToInternalFormat(profile.skills),
        projects: this.convertProjectsToInternalFormat(profile.projects, employeeId),
        additionalData: {
          certifications: profile.certifications,
          languages: profile.languages,
          education: profile.education
        }
      }
    };
  }
}

export const profilerService = new ProfilerService();
export default profilerService;
