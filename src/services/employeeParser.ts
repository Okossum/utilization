import * as XLSX from 'xlsx';

export interface PersonRow {
  person: string;
  lob: string;
  cc: string;
  team: string;
  lbs?: string | null;
  bereich?: string | null;
  profileLink?: string | null;
  fileName: string;
  isLatest: boolean;
  createdAt: string;
  updatedAt: string;
  uploadDate: string;
  uploadVersion: number;
  compositeKey: string;
}

export interface EmployeeParseResult {
  success: boolean;
  data: PersonRow[];
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    headerRowIndex: number;
  };
}

export class EmployeeExcelParser {
  
  /**
   * Sucht die Header-Zeile (erste Spalte = "Vorname")
   */
  private findHeaderRow(worksheet: XLSX.WorkSheet): number {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Suche in den ersten 20 Zeilen nach Header mit "Vorname"
    for (let row = 0; row <= Math.min(19, range.e.r); row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 }); // Spalte A
      const cell = worksheet[cellAddress];
      
      if (cell) {
        const cellValue = String(cell.v).trim().toLowerCase();
        if (cellValue === 'vorname') {
          return row;
        }
      }
    }
    
    // Fallback: Zeile 8 (Index 7)
    return 7;
  }

  /**
   * Extrahiert Header-Mapping aus der Header-Zeile
   */
  private extractHeaders(worksheet: XLSX.WorkSheet, headerRowIndex: number): Map<number, string> {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const headers = new Map<number, string>();
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        const header = String(cell.v).trim();
        if (header) {
          headers.set(col, header);
        }
      }
    }
    
    return headers;
  }

  /**
   * Konvertiert "Nachname, Vorname" zu normalisiertem Format
   */
  private toPerson(nachname: string, vorname: string): string {
    const cleanNachname = (nachname || '').trim();
    const cleanVorname = (vorname || '').trim();
    
    if (!cleanNachname || !cleanVorname) {
      return '';
    }
    
    return `${cleanNachname}, ${cleanVorname}`.replace(/\s+/g, ' ').trim();
  }

  /**
   * Validiert ein gemapptes PersonRow Objekt
   */
  private validatePersonRow(row: PersonRow, rowIndex: number): string[] {
    const errors: string[] = [];
    
    // Pflichtfelder prüfen
    const requiredFields = ['person', 'lob', 'cc', 'team'];
    for (const field of requiredFields) {
      if (!row[field as keyof PersonRow] || String(row[field as keyof PersonRow]).trim() === '') {
        errors.push(`Zeile ${rowIndex}: Pflichtfeld "${field}" ist leer`);
      }
    }
    
    // Person Format prüfen (sollte "Nachname, Vorname" enthalten)
    if (row.person && !row.person.includes(', ')) {
      errors.push(`Zeile ${rowIndex}: Person "${row.person}" hat nicht das erwartete Format "Nachname, Vorname"`);
    }
    
    return errors;
  }

  /**
   * Mappt eine Excel-Zeile zu einem PersonRow Objekt
   */
  private mapRowToPersonRow(
    rowData: Record<string, any>, 
    rowIndex: number,
    meta: { fileName: string; uploadVersion: number; nowISO: string }
  ): { row: PersonRow | null; errors: string[]; warnings: string[] } {
    
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const person = this.toPerson(rowData['Nachname'], rowData['Vorname']);
      
      if (!person) {
        errors.push(`Zeile ${rowIndex}: Vor- oder Nachname fehlt`);
        return { row: null, errors, warnings };
      }

      const lob = (rowData['Business Line'] || '').toString().trim();
      const cc = (rowData['Competence Center'] || '').toString().trim();
      const team = (rowData['Teamname'] || '').toString().trim();
      const lbs = rowData['Karrierestufe'] ? String(rowData['Karrierestufe']).trim() : null;
      const bereich = rowData['Bereich'] ? String(rowData['Bereich']).trim() : null;
      const profileLink = rowData['Link zum Profil'] ? String(rowData['Link zum Profil']).trim() : null;

      const personRow: PersonRow = {
        person,
        lob,
        cc,
        team,
        lbs: lbs || null,
        bereich: bereich || null,
        profileLink: profileLink || null,
        fileName: meta.fileName,
        isLatest: true,
        createdAt: meta.nowISO,
        updatedAt: meta.nowISO,
        uploadDate: meta.nowISO,
        uploadVersion: meta.uploadVersion,
        compositeKey: `${person}__${team}__${cc}`
      };

      // Validierung
      const validationErrors = this.validatePersonRow(personRow, rowIndex);
      errors.push(...validationErrors);

      // Warnings für optionale Felder
      if (!lbs) {
        warnings.push(`Zeile ${rowIndex}: Karrierestufe (LBS) ist leer für ${person}`);
      }

      return { row: personRow, errors, warnings };
      
    } catch (error) {
      errors.push(`Zeile ${rowIndex}: Fehler beim Mapping - ${error}`);
      return { row: null, errors, warnings };
    }
  }

  /**
   * Hauptfunktion: Parst Excel-Datei und gibt PersonRow Array zurück
   */
  public async parseEmployeeExcel(
    file: File, 
    uploadVersion: number = 1
  ): Promise<EmployeeParseResult> {
    
    const result: EmployeeParseResult = {
      success: false,
      data: [],
      errors: [],
      warnings: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        headerRowIndex: -1
      }
    };

    try {
      // Datei lesen
      const buffer = await file.arrayBuffer();
      // ✅ FIX: Verhindere automatischen Browser-Download durch XLSX.read()
      const workbook = XLSX.read(buffer, { 
        type: 'array',
        bookVBA: false,
        bookSheets: false,
        cellStyles: false,
        cellNF: false,
        cellHTML: false,
        cellDates: false,
        sheetStubs: false,
        bookDeps: false,
        bookFiles: false,
        bookProps: false
      });
      
      // Sheet "Search Results" finden
      let worksheet: XLSX.WorkSheet;
      if (workbook.SheetNames.includes('Search Results')) {
        worksheet = workbook.Sheets['Search Results'];
      } else {
        // Fallback: Erstes Sheet
        const sheetName = workbook.SheetNames[0];
        worksheet = workbook.Sheets[sheetName];
        result.warnings.push(`Sheet "Search Results" nicht gefunden, verwende "${sheetName}"`);
      }

      if (!worksheet) {
        result.errors.push('Kein gültiges Arbeitsblatt gefunden');
        return result;
      }

      // Header-Zeile finden
      const headerRowIndex = this.findHeaderRow(worksheet);
      result.stats.headerRowIndex = headerRowIndex;
      
      // Header extrahieren
      const headers = this.extractHeaders(worksheet, headerRowIndex);

      // Zeige gefundene Header für Debugging
      if (headers.size === 0) {
        return { success: false, error: 'Keine gültigen Header gefunden' };
      }

      // Datenzeilen extrahieren
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const meta = {
        fileName: file.name,
        uploadVersion,
        nowISO: new Date().toISOString()
      };

      for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
        const rowData: Record<string, any> = {};
        let hasData = false;

        // Zeile einlesen
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          const headerName = headers.get(col);

          if (cell && headerName) {
            let value = cell.v;
            
            // Hyperlink-URL extrahieren falls vorhanden
            if (headerName === 'Link zum Profil' && cell.l) {
              value = cell.l.Target || cell.v;
            }

            rowData[headerName] = value;
            if (value !== undefined && value !== null && value !== '') {
              hasData = true;
            }
          }
        }

        if (!hasData) {
          continue; // Leere Zeile überspringen
        }

        result.stats.totalRows++;

        // Zeile zu PersonRow mappen
        const { row: personRow, errors: rowErrors, warnings: rowWarnings } = 
          this.mapRowToPersonRow(rowData, row + 1, meta);

        result.errors.push(...rowErrors);
        result.warnings.push(...rowWarnings);

        if (personRow && rowErrors.length === 0) {
          result.data.push(personRow);
          result.stats.validRows++;
        } else {
          result.stats.invalidRows++;
        }
      }

      // Deduplizierung per compositeKey (letzter Eintrag gewinnt)
      const uniqueData = new Map<string, PersonRow>();
      for (const row of result.data) {
        uniqueData.set(row.compositeKey, row);
      }
      
      const duplicateCount = result.data.length - uniqueData.size;
      if (duplicateCount > 0) {
        result.warnings.push(`${duplicateCount} Duplikate entfernt (basierend auf compositeKey)`);
      }

      result.data = Array.from(uniqueData.values());
      result.success = result.data.length > 0;

      return {
        success: true,
        data: result.data,
        stats: {
          totalRows: result.stats.totalRows,
          validRows: result.stats.validRows,
          invalidRows: result.stats.invalidRows,
          headerRowIndex: result.stats.headerRowIndex
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Excel Parsing Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        data: []
      };
    }
  }
}
