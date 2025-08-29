// file: src/lib/consolidation.ts
import {
  collection, doc, getDoc, getDocs, query, setDoc, writeBatch, where
} from "firebase/firestore";
import { db } from "./firebase";
import { logger } from "./logger";

/* =====================================
   TYPES & INTERFACES
===================================== */

interface EinsatzplanEntry {
  projekt: string;
  ort: string;
  auslastungProzent: number;
  kunde: string | null;
  projektphase: string | null;
  beschreibung: string | null;
}

interface ConsolidatedUtilizationData {
  // === PERSON-IDENTIFIKATION ===
  id: string;                    // = personId
  person: string;                // "Müller, Hans"
  nachname: string;              // "Müller"
  vorname: string;               // "Hans"
  
  // === ORGANISATIONSDATEN ===
  email: string;                 // aus: mitarbeiter
  firma: string;                 // aus: mitarbeiter
  lob: string;                   // aus: mitarbeiter (priorität) || einsatzplan
  bereich: string;              // aus: einsatzplan (priorität) || mitarbeiter
  cc: string;                   // aus: mitarbeiter (priorität) || einsatzplan
  team: string;                 // aus: einsatzplan (priorität) || mitarbeiter
  standort: string;             // aus: mitarbeiter.standort
  location: string;             // aus: einsatzplan.location
  
  // === PERSONAL-INFORMATIONEN ===
  lbs: string;                  // aus: mitarbeiter (priorität) || einsatzplan
  vg: string;                   // aus: einsatzplan
  erfahrungSeitJahr: string;    // aus: mitarbeiter
  verfuegbarAb: string;         // aus: mitarbeiter (priorität) || einsatzplan (ISO-Date)
  verfuegbarFuerStaffing: boolean; // aus: mitarbeiter (priorität) || einsatzplan
  linkZumProfilUrl: string;     // aus: mitarbeiter
  
  // === AUSLASTUNGSDATEN (Historisch) ===
  auslastung: Record<string, number>; // {"25/01": 80, "25/02": 90}
  
  // === EINSATZPLANDATEN (Forecast) ===
  einsatzplan: Record<string, EinsatzplanEntry[]>; // {"25/34": [{projekt: "PMO", ort: "München", auslastungProzent: 100}]}
  
  // === METADATEN ===
  createdAt: Date;
  updatedAt: Date;
  lastUploadFiles: {
    mitarbeiter: string | null;
    auslastung: string | null;
    einsatzplan: string | null;
  };
  matchStatus: "matched" | "ambiguous" | "unmatched";
  dataCompleteness: {
    hasMitarbeiter: boolean;
    hasAuslastung: boolean;
    hasEinsatzplan: boolean;
  };
}

/* =====================================
   HELPER FUNCTIONS
===================================== */

function parsePersonName(fullName: string): { nachname: string; vorname: string } {
  const trimmed = fullName.trim();
  
  // Format: "Nachname, Vorname" oder "Nachname,Vorname"
  const commaMatch = trimmed.match(/^([^,]+),\s*(.+)$/);
  if (commaMatch) {
    return {
      nachname: commaMatch[1].trim(),
      vorname: commaMatch[2].trim()
    };
  }
  
  // Format: "Vorname Nachname" (Fallback)
  const spaceMatch = trimmed.match(/^(.+)\s+([^\s]+)$/);
  if (spaceMatch) {
    return {
      nachname: spaceMatch[2].trim(),
      vorname: spaceMatch[1].trim()
    };
  }
  
  // Fallback: Alles als Nachname
  return {
    nachname: trimmed,
    vorname: ""
  };
}

function transformEinsatzplanValues(einsatzplanValues: Record<string, any[]>): Record<string, EinsatzplanEntry[]> {
  const result: Record<string, EinsatzplanEntry[]> = {};
  
  for (const [week, entries] of Object.entries(einsatzplanValues || {})) {
    if (Array.isArray(entries)) {
      result[week] = entries.map(entry => ({
        projekt: entry.projekt || "Unbekannt",
        ort: entry.ort || "Nicht angegeben",
        auslastungProzent: entry.auslastungProzent || 0,
        kunde: entry.kunde || null,
        projektphase: entry.projektphase || null,
        beschreibung: entry.beschreibung || null
      }));
    }
  }
  
  return result;
}

function mergePersonData(
  profilerData: any,
  auslastungData: any,
  einsatzplanData: any
): ConsolidatedUtilizationData {
  // ✅ Person-Name mit Priorität: Profiler > Einsatzplan > Auslastung
  const personName = profilerData?.name || einsatzplanData?.person || auslastungData?.person || "";
  const { nachname, vorname } = parsePersonName(personName);
  
  const now = new Date();
  
  return {
    // ✅ Person-Identifikation aus Profiler-Daten
    id: profilerData?.employeeId || profilerData?.globalExternalId || einsatzplanData?.personId || auslastungData?.personId || "",
    person: personName,
    nachname,
    vorname,
    
    // ✅ Organisationsdaten mit Profiler-Priorität
    email: profilerData?.email || "",
    firma: profilerData?.company || "adesso SE",
    lob: profilerData?.lineOfBusiness || einsatzplanData?.lob || "",
    bereich: profilerData?.department || einsatzplanData?.bereich || "",
    cc: profilerData?.competenceCenter || einsatzplanData?.cc || auslastungData?.cc || "",
    team: profilerData?.teamName || einsatzplanData?.team || "",
    standort: profilerData?.location || "",
    location: einsatzplanData?.location || "", // ✅ Geschäftsstelle aus Einsatzplan
    
    // ✅ Personal-Informationen aus Profiler-Daten
    lbs: profilerData?.careerLevel || einsatzplanData?.lbs || "",
    vg: einsatzplanData?.vg || "",
    erfahrungSeitJahr: profilerData?.experienceSinceYear || "",
    verfuegbarAb: profilerData?.dateOfExit || einsatzplanData?.verfuegbarAb || "",
    verfuegbarFuerStaffing: profilerData?.active ?? einsatzplanData?.verfuegbarFuerStaffing ?? false,
    linkZumProfilUrl: profilerData?.profileUrl || "",
    
    // Zeitdaten
    auslastung: auslastungData?.values || {},
    einsatzplan: transformEinsatzplanValues(einsatzplanData?.values || {}),
    
    // Metadaten
    createdAt: mitarbeiterData?.createdAt instanceof Date ? mitarbeiterData.createdAt : now,
    updatedAt: now,
    lastUploadFiles: {
      mitarbeiter: mitarbeiterData?.fileName || null,
      auslastung: auslastungData?.fileName || null,
      einsatzplan: einsatzplanData?.fileName || null
    },
    matchStatus: "matched", // TODO: Implementiere Match-Status-Logic
    dataCompleteness: {
      hasMitarbeiter: !!mitarbeiterData,
      hasAuslastung: !!auslastungData,
      hasEinsatzplan: !!einsatzplanData
    }
  };
}

/* =====================================
   MAIN CONSOLIDATION FUNCTIONS
===================================== */

/**
 * Konsolidiert Daten für eine spezifische Person
 */
export async function consolidatePersonData(personId: string): Promise<void> {
  // logger statement entfernt
  
  try {
    // ✅ Lade Daten aus profilerData (statt mitarbeiter) + auslastung + einsatzplan
    const [profilerDoc, auslastungDoc, einsatzplanDoc] = await Promise.all([
      getDoc(doc(db, "profilerData", personId)), // Direkt per Document ID
      getDocs(query(collection(db, "auslastung"), where("personId", "==", personId))),
      getDocs(query(collection(db, "einsatzplan"), where("personId", "==", personId)))
    ]);
    
    const profilerData = profilerDoc.exists() ? profilerDoc.data() : null;
    const auslastungData = auslastungDoc.docs[0]?.data();
    const einsatzplanData = einsatzplanDoc.docs[0]?.data();
    

    
    // Skip wenn keine Daten vorhanden
    if (!profilerData && !auslastungData && !einsatzplanData) {
      // logger statement entfernt
      return;
    }
    
    // 🔐 WICHTIG: Bestehende User-Rollen vor Überschreibung schützen
    const docRef = doc(collection(db, "utilizationData"), personId);
    const existingDoc = await docRef.get();
    const existingUserRoles = existingDoc.exists() ? {
      systemRole: existingDoc.data()?.systemRole,
      hasSystemAccess: existingDoc.data()?.hasSystemAccess,
      roleAssignedBy: existingDoc.data()?.roleAssignedBy,
      roleAssignedAt: existingDoc.data()?.roleAssignedAt,
      lastRoleUpdate: existingDoc.data()?.lastRoleUpdate,
      roleHistory: existingDoc.data()?.roleHistory
    } : {};
    
    // Merge Daten
    const consolidatedData = mergePersonData(profilerData, auslastungData, einsatzplanData);
    
    // 🔐 User-Rollen wieder hinzufügen (überschreibt nicht!)
    const finalData = {
      ...consolidatedData,
      ...Object.fromEntries(
        Object.entries(existingUserRoles).filter(([_, value]) => value !== undefined)
      )
    };
    
    // Speichere in utilizationData Collection
    await setDoc(docRef, finalData, { merge: true });
    
    // logger statement entfernt
    
  } catch (error) {
    // logger statement entfernt
    throw error;
  }
}

/**
 * Konsolidiert alle verfügbaren Personen-Daten
 */
export async function consolidateAllData(): Promise<void> {
  // logger statement entfernt
  
  try {
    // ✅ Sammle alle eindeutigen PersonIds aus profilerData + auslastung + einsatzplan
    const [profilerSnap, auslastungSnap, einsatzplanSnap] = await Promise.all([
      getDocs(collection(db, "profilerData")),
      getDocs(collection(db, "auslastung")),
      getDocs(collection(db, "einsatzplan"))
    ]);
    
    const personIds = new Set<string>();
    
    // ✅ PersonIds aus profilerData (Document ID = personId)
    profilerSnap.docs.forEach(doc => personIds.add(doc.id));
    
    // PersonIds aus Auslastung (Field: personId)
    auslastungSnap.docs.forEach(doc => {
      const personId = doc.data().personId;
      if (personId) personIds.add(personId);
    });
    
    // PersonIds aus Einsatzplan (Field: personId)
    einsatzplanSnap.docs.forEach(doc => {
      const personId = doc.data().personId;
      if (personId) personIds.add(personId);
    });
    
    // logger statement entfernt
    
    // Konsolidiere alle Personen in Batches
    const personIdArray = Array.from(personIds);
    const batchSize = 50;
    
    for (let i = 0; i < personIdArray.length; i += batchSize) {
      const batch = personIdArray.slice(i, i + batchSize);
      
      // logger statement entfernt
      
      // Parallele Verarbeitung innerhalb des Batches
      await Promise.all(batch.map(personId => consolidatePersonData(personId)));
    }
    
    // logger statement entfernt
    
  } catch (error) {
    // logger statement entfernt
    throw error;
  }
}

/**
 * Trigger-Funktion für Upload-Events
 */
export async function triggerConsolidationAfterUpload(uploadType: 'mitarbeiter' | 'auslastung' | 'einsatzplan'): Promise<void> {
  // logger statement entfernt
  
  try {
    // Strategie: Konsolidiere alle Personen die vom Upload betroffen sind
    // TODO: Optimierung - nur betroffene Personen konsolidieren
    await consolidateAllData();
    
    // logger statement entfernt
    
  } catch (error) {
    // logger statement entfernt
    throw error;
  }
}

/**
 * Hilfsfunktion: Prüfe Datenqualität der konsolidierten Collection
 */
export async function validateConsolidatedData(): Promise<{
  totalRecords: number;
  completenessStats: Record<string, number>;
  sampleData: any[];
}> {
  // logger statement entfernt
  
  try {
    const utilizationSnap = await getDocs(collection(db, "utilizationData"));
    const docs = utilizationSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const completenessStats = {
      hasMitarbeiter: 0,
      hasAuslastung: 0,
      hasEinsatzplan: 0,
      hasAllThree: 0
    };
    
    docs.forEach((doc: any) => {
      if (doc.dataCompleteness?.hasMitarbeiter) completenessStats.hasMitarbeiter++;
      if (doc.dataCompleteness?.hasAuslastung) completenessStats.hasAuslastung++;
      if (doc.dataCompleteness?.hasEinsatzplan) completenessStats.hasEinsatzplan++;
      if (doc.dataCompleteness?.hasMitarbeiter && doc.dataCompleteness?.hasAuslastung && doc.dataCompleteness?.hasEinsatzplan) {
        completenessStats.hasAllThree++;
      }
    });
    
    const result = {
      totalRecords: docs.length,
      completenessStats,
      sampleData: docs.slice(0, 3)
    };
    
    // logger statement entfernt
    
    return result;
    
  } catch (error) {
    // logger statement entfernt
    throw error;
  }
}
