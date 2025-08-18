/**
 * Cloud Function to resolve workload duplicates based on user choices
 */

import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

interface WeeklyPercent {
  isoYear: number;
  isoWeek: number;
  percent: number;
}

interface WorkloadEntry {
  normalizedName: string;
  competenceCenter: string;
  rawName: string;
  businessLine?: string | null;
  bereich?: string | null;
  team?: string | null;
  location?: string | null;
  grade?: string | null;
  project?: string | null;
  customer?: string | null;
  weeklyPercent: WeeklyPercent[];
  sumPercent: number;
  match: any;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

interface DuplicateGroup {
  normalizedName: string;
  competenceCenter: string;
  entries: WorkloadEntry[];
  resolutionStatus: 'pending' | 'resolved';
  userChoice?: 'discard_first' | 'discard_second' | 'consolidate' | 'keep_separate';
}

interface ResolutionRequest {
  planId: string;
  resolutions: { [docId: string]: 'discard_first' | 'discard_second' | 'consolidate' | 'keep_separate' };
}

/**
 * Consolidates weekly percent data from multiple entries
 */
function consolidateWeeklyPercent(entries: WorkloadEntry[]): WeeklyPercent[] {
  const weekMap = new Map<string, WeeklyPercent>();
  
  for (const entry of entries) {
    for (const week of entry.weeklyPercent) {
      const key = `${week.isoYear}-W${week.isoWeek.toString().padStart(2, '0')}`;
      
      // If week doesn't exist or current percent is higher, use current value
      if (!weekMap.has(key) || week.percent > (weekMap.get(key)?.percent || 0)) {
        weekMap.set(key, week);
      }
    }
  }
  
  return Array.from(weekMap.values()).sort((a, b) => 
    a.isoYear === b.isoYear ? a.isoWeek - b.isoWeek : a.isoYear - b.isoYear
  );
}

/**
 * Creates a consolidated entry from multiple entries
 */
function consolidateEntries(entries: WorkloadEntry[]): WorkloadEntry {
  if (entries.length === 0) {
    throw new Error('Cannot consolidate empty entries array');
  }
  
  const baseEntry = entries[0];
  const consolidatedWeekly = consolidateWeeklyPercent(entries);
  
  // Calculate new sum
  const sumPercent = consolidatedWeekly.reduce((sum, week) => sum + week.percent, 0);
  
  // Use latest team/bereich info (from last entry)
  const latestEntry = entries[entries.length - 1];
  
  return {
    ...baseEntry,
    team: latestEntry.team || baseEntry.team,
    bereich: latestEntry.bereich || baseEntry.bereich,
    businessLine: latestEntry.businessLine || baseEntry.businessLine,
    weeklyPercent: consolidatedWeekly,
    sumPercent,
    updatedAt: FieldValue.serverTimestamp()
  };
}

/**
 * Creates separate entries with unique IDs for keep_separate choice
 */
function createSeparateEntries(entries: WorkloadEntry[]): { [docId: string]: WorkloadEntry } {
  const result: { [docId: string]: WorkloadEntry } = {};
  
  entries.forEach((entry, index) => {
    const docId = `${entry.normalizedName}|${entry.competenceCenter}|${index + 1}`;
    result[docId] = {
      ...entry,
      updatedAt: FieldValue.serverTimestamp()
    };
  });
  
  return result;
}

export const resolveDuplicates = onCall({
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (request) => {
  const { planId, resolutions }: ResolutionRequest = request.data;
  
  if (!planId || !resolutions) {
    throw new Error('Missing planId or resolutions');
  }
  
  logger.info(`Resolving duplicates for plan ${planId}`, { resolutions });
  
  try {
    const planRef = db.collection('workloads').doc(planId);
    const duplicatesCollection = planRef.collection('duplicates');
    const entriesCollection = planRef.collection('entries');
    
    // Get all duplicate groups
    const duplicatesSnapshot = await duplicatesCollection.get();
    const duplicateGroups: { [docId: string]: DuplicateGroup } = {};
    
    duplicatesSnapshot.docs.forEach(doc => {
      duplicateGroups[doc.id] = doc.data() as DuplicateGroup;
    });
    
    const batch = db.batch();
    let processedEntries = 0;
    
    // Process each resolution
    for (const [docId, choice] of Object.entries(resolutions)) {
      const duplicateGroup = duplicateGroups[docId];
      
      if (!duplicateGroup) {
        logger.warn(`Duplicate group ${docId} not found`);
        continue;
      }
      
      const { entries } = duplicateGroup;
      
      switch (choice) {
        case 'discard_first':
          // Keep only the second entry
          if (entries.length >= 2) {
            const entryRef = entriesCollection.doc(docId);
            batch.set(entryRef, {
              ...entries[1],
              updatedAt: FieldValue.serverTimestamp()
            });
            processedEntries++;
          }
          break;
          
        case 'discard_second':
          // Keep only the first entry
          if (entries.length >= 1) {
            const entryRef = entriesCollection.doc(docId);
            batch.set(entryRef, {
              ...entries[0],
              updatedAt: FieldValue.serverTimestamp()
            });
            processedEntries++;
          }
          break;
          
        case 'consolidate':
          // Merge all entries into one
          const consolidatedEntry = consolidateEntries(entries);
          const entryRef = entriesCollection.doc(docId);
          batch.set(entryRef, consolidatedEntry);
          processedEntries++;
          break;
          
        case 'keep_separate':
          // Create separate entries with unique IDs
          const separateEntries = createSeparateEntries(entries);
          Object.entries(separateEntries).forEach(([separateDocId, entry]) => {
            const separateRef = entriesCollection.doc(separateDocId);
            batch.set(separateRef, entry);
            processedEntries++;
          });
          break;
      }
      
      // Mark duplicate as resolved
      const duplicateRef = duplicatesCollection.doc(docId);
      batch.update(duplicateRef, {
        resolutionStatus: 'resolved',
        userChoice: choice,
        resolvedAt: FieldValue.serverTimestamp()
      });
    }
    
    // Update plan document
    batch.update(planRef, {
      duplicatesResolved: true,
      resolvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    
    // Commit all changes
    await batch.commit();
    
    logger.info(`Successfully resolved ${Object.keys(resolutions).length} duplicate groups, created ${processedEntries} entries`);
    
    return {
      success: true,
      resolvedGroups: Object.keys(resolutions).length,
      processedEntries,
      message: `Successfully resolved ${Object.keys(resolutions).length} duplicate groups`
    };
    
  } catch (error) {
    logger.error('Error resolving duplicates:', error);
    throw new Error(`Failed to resolve duplicates: ${error}`);
  }
});
