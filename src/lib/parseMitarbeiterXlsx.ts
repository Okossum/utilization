import { getStorage } from 'firebase-admin/storage';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import * as XLSX from 'xlsx';
import { logger } from 'firebase-functions';
import {
  nameCcId,
  buildEmployeeDoc,
  nameKey,
  deactivateOtherCCs,
  EmployeeCore
} from './identity';

// Firebase Admin initialisieren
try {
  initializeApp();
} catch (error) {
  // App already initialized
}

const storage = getStorage();
const db = getFirestore();

/**
 * Parst eine Mitarbeiter-XLSX-Datei und verarbeitet sie
 */
export async function parseMitarbeiterXlsx(bucketName: string, filePath: string): Promise<void> {
  logger.info(`Starting to parse: ${filePath}`);
  
  try {
    // Datei aus Storage herunterladen
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    
    logger.info(`Downloaded file, size: ${buffer.length} bytes`);
    
    // XLSX parsen
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      throw new Error('No worksheet found in XLSX file');
    }
    
    logger.info(`Processing worksheet: ${sheetName}`);
    
    // Header-Zeile finden
    const headerRowIndex = findHeaderRow(worksheet);
    logger.info(`Header found at row: ${headerRowIndex}`);
    
    // Daten ab der Header-Zeile extrahieren
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const data: any[] = [];
    
    for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
      const rowData: any = {};
      let hasData = false;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          const headerCellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
          const headerCell = worksheet[headerCellAddress];
          const header = headerCell ? String(headerCell.v).trim() : '';
          
          if (header) {
            let value = cell.v;
            
            // Hyperlink-URL extrahieren falls vorhanden
            if (header === 'Link zum Profil' && cell.l) {
              value = cell.l.Target || cell.v;
            }
            
            rowData[header] = value;
            if (value !== undefined && value !== null && value !== '') {
              hasData = true;
            }
          }
        }
      }
      
      if (hasData) {
        data.push(rowData);
      }
    }
    
    logger.info(`Extracted ${data.length} data rows`);
    
    // Debug: Log erste Zeile um Spalten zu sehen
    if (data.length > 0) {
      logger.info('First row data:', JSON.stringify(data[0]));
      logger.info('Available columns:', Object.keys(data[0]));
    }
    
    // Jede Zeile verarbeiten
    const sourceFileId = generateSourceFileId(filePath);
    
    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      const rowIndex = headerRowIndex + 1 + i;
      
      try {
        await processMitarbeiterRow(rowData, rowIndex, sourceFileId);
      } catch (error) {
        logger.error(`Error processing row ${rowIndex}:`, error);
        // Staging-Row trotzdem erstellen für Debugging
        await createStagingRow(sourceFileId, rowIndex, rowData);
      }
    }
    
      // Source-File Status aktualisieren
  await updateSourceFileStatus(sourceFileId, 'processed', filePath);
    
    logger.info(`Successfully processed ${data.length} rows from ${filePath}`);
    
  } catch (error) {
    logger.error(`Error parsing ${filePath}:`, error);
    
    // Source-File Status auf Error setzen
    const sourceFileId = generateSourceFileId(filePath);
    await updateSourceFileStatus(sourceFileId, 'error', filePath);
    
    throw error;
  }
}

/**
 * Findet die Header-Zeile in der Excel-Datei
 */
function findHeaderRow(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Suche in den ersten 15 Zeilen nach Header mit "Vorname" und "E-Mail"
  for (let row = 0; row <= Math.min(14, range.e.r); row++) {
    let hasVorname = false;
    let hasEmail = false;
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell) {
        const cellValue = String(cell.v).toLowerCase();
        if (cellValue.includes('vorname')) hasVorname = true;
        if (cellValue.includes('e-mail') || cellValue.includes('email')) hasEmail = true;
      }
    }
    
    if (hasVorname && hasEmail) {
      return row;
    }
  }
  
  // Fallback: Zeile 8 (Index 7)
  return 7;
}

/**
 * Verarbeitet eine einzelne Mitarbeiter-Zeile
 */
async function processMitarbeiterRow(rowData: any, rowIndex: number, sourceFileId: string): Promise<void> {
  // Staging-Row erstellen
  await createStagingRow(sourceFileId, rowIndex, rowData);
  
  // Daten extrahieren
  const firstName = String(rowData.Vorname || '').trim();
  const lastName = String(rowData.Nachname || '').trim();
  const email = rowData['E-Mail'] ? String(rowData['E-Mail']).trim().toLowerCase() : null;
  const company = String(rowData.Firma || '').trim();
  const businessLine = String(rowData['Business Line'] || '').trim();
  const businessUnit = String(rowData['Business Unit'] || '').trim();
  const competenceCenter = String(rowData['Competence Center'] || '').trim();
  const teamName = String(rowData.Teamname || '').trim();
  const location = String(rowData.Standort || '').trim();
  const grade = String(rowData.Karrierestufe || '').trim();
  const profileUrl = String(rowData['Link zum Profil'] || '').trim();
  
  if (!firstName || !lastName) {
    logger.warn(`Row ${rowIndex}: Missing firstName or lastName, skipping employee creation`);
    return;
  }
  
  // Einheitliche ID mit nameCcId
  const id = nameCcId(firstName, lastName, competenceCenter);
  
  // Employee-Dokument mit buildEmployeeDoc erstellen
  const employeeCore: EmployeeCore = {
    firstName,
    lastName,
    competenceCenter,
    businessLine: businessLine || undefined,
    businessUnit: businessUnit || undefined,
    teamName: teamName || undefined,
    grade: grade || undefined,
    company: company || undefined,
    location: location || undefined,
    email,
    profileUrl: profileUrl || undefined
  };
  
  const employeeDoc = buildEmployeeDoc(employeeCore);
  
  // updatedAt mit serverTimestamp setzen
  (employeeDoc as any).updatedAt = new Date();
  
  // Employee idempotent upserten - createdAt nur bei neuen Dokumenten setzen
  const employeeRef = db.doc(`employees/${id}`);
  const existingDoc = await employeeRef.get();
  
  if (existingDoc.exists) {
    // Update existing employee (ohne createdAt zu überschreiben)
    await employeeRef.set(employeeDoc, { merge: true });
    logger.info(`Updated existing employee: ${id}`);
  } else {
    // Create new employee (mit createdAt)
    await employeeRef.set({
      ...employeeDoc,
      createdAt: FieldValue.serverTimestamp()
    });
    logger.info(`Created new employee: ${id}`);
  }
  
  // Optional: Andere CCs für dieselbe Person deaktivieren
  try {
    await deactivateOtherCCs(db, nameKey(firstName, lastName), id);
  } catch (error) {
    logger.warn(`Could not deactivate other CCs for ${firstName} ${lastName}:`, error);
  }
  
  logger.info(`Processed employee: ${id} (${firstName} ${lastName})`);
}



/**
 * Erstellt eine Staging-Row
 */
async function createStagingRow(sourceFileId: string, rowIndex: number, data: any): Promise<void> {
  const rowKey = `${sourceFileId}:${rowIndex}`;
  
  const stagingRow = {
    sourceFileId,
    rowIndex,
    data,
    createdAt: FieldValue.serverTimestamp(),
  };
  
  await db.collection('stagingRows').doc(rowKey).set(stagingRow);
}

/**
 * Generiert eine Source-File-ID aus dem Dateipfad
 */
function generateSourceFileId(filePath: string): string {
  return filePath.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Aktualisiert den Status einer Source-Datei
 */
async function updateSourceFileStatus(sourceFileId: string, status: 'processed' | 'error', filePath: string): Promise<void> {
  try {
    // Suche nach der sourceFile-Dokument basierend auf dem Dateipfad
    const sourceFilesQuery = await db.collection('sourceFiles')
      .where('filePath', '==', filePath)
      .limit(1)
      .get();
    
    if (!sourceFilesQuery.empty) {
      const docRef = sourceFilesQuery.docs[0].ref;
      await docRef.update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Fallback: Verwende die sourceFileId
      await db.collection('sourceFiles').doc(sourceFileId).set({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    logger.warn(`Could not update source file status for ${sourceFileId}:`, error);
  }
}
