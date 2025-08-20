import { ImportRow } from '../types/knowledge';

export async function parseKnowledgeFile(file: File): Promise<ImportRow[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'csv') {
    return parseCSVFile(file);
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    return parseXLSXFile(file);
  } else {
    throw new Error('Nicht unterstütztes Dateiformat. Bitte verwenden Sie CSV oder XLSX.');
  }
}

async function parseCSVFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const rows = parseCSVContent(csvContent);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Fehler beim Lesen der CSV-Datei'));
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCSVContent(csvContent: string): ImportRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV-Datei ist leer');
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine);
  
  // Validate required columns
  const requiredColumns = ['kategorie', 'auswahl'];
  const missingColumns = requiredColumns.filter(col => 
    !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
  );
  
  if (missingColumns.length > 0) {
    throw new Error(`Fehlende Spalten: ${missingColumns.join(', ')}. Erwartet: Kategorie, Auswahl`);
  }

  // Find column indices
  const kategorieIndex = headers.findIndex(h => h.toLowerCase().includes('kategorie'));
  const auswahlIndex = headers.findIndex(h => h.toLowerCase().includes('auswahl'));
  const statusIndex = headers.findIndex(h => h.toLowerCase().includes('status'));

  // Parse data rows
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVRow(line);
    
    if (values.length > 0) {
      const row: ImportRow = {
        kategorie: values[kategorieIndex] || '',
        auswahl: values[auswahlIndex] || '',
        status: statusIndex >= 0 ? values[statusIndex] : undefined
      };
      
      // Only add rows with both kategorie and auswahl
      if (row.kategorie.trim() && row.auswahl.trim()) {
        rows.push(row);
      }
    }
  }

  return rows;
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

async function parseXLSXFile(file: File): Promise<ImportRow[]> {
  try {
    // Dynamic import of xlsx library
    const XLSX = await import('xlsx');
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length === 0) {
            throw new Error('XLSX-Datei ist leer');
          }

          // Parse header
          const headers = jsonData[0] as string[];
          if (!headers || headers.length === 0) {
            throw new Error('Keine Spaltenüberschriften gefunden');
          }

          // Validate required columns
          const requiredColumns = ['kategorie', 'auswahl'];
          const missingColumns = requiredColumns.filter(col => 
            !headers.some(header => 
              header && header.toString().toLowerCase().includes(col.toLowerCase())
            )
          );
          
          if (missingColumns.length > 0) {
            throw new Error(`Fehlende Spalten: ${missingColumns.join(', ')}. Erwartet: Kategorie, Auswahl`);
          }

          // Find column indices
          const kategorieIndex = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes('kategorie')
          );
          const auswahlIndex = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes('auswahl')
          );
          const statusIndex = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes('status')
          );

          // Parse data rows
          const rows: ImportRow[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i];
            if (!rowData || rowData.length === 0) continue;
            
            const row: ImportRow = {
              kategorie: (rowData[kategorieIndex] || '').toString(),
              auswahl: (rowData[auswahlIndex] || '').toString(),
              status: statusIndex >= 0 ? (rowData[statusIndex] || '').toString() : undefined
            };
            
            // Only add rows with both kategorie and auswahl
            if (row.kategorie.trim() && row.auswahl.trim()) {
              rows.push(row);
            }
          }

          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Fehler beim Lesen der XLSX-Datei'));
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    throw new Error('XLSX-Parser konnte nicht geladen werden. Bitte verwenden Sie CSV oder installieren Sie die xlsx-Bibliothek.');
  }
}

export function validateImportRows(rows: ImportRow[]): { valid: ImportRow[]; errors: string[] } {
  const valid: ImportRow[] = [];
  const errors: string[] = [];
  
  rows.forEach((row, index) => {
    if (!row.kategorie?.trim()) {
      errors.push(`Zeile ${index + 1}: Kategorie fehlt`);
      return;
    }
    
    if (!row.auswahl?.trim()) {
      errors.push(`Zeile ${index + 1}: Auswahl fehlt`);
      return;
    }
    
    if (row.kategorie.trim().length < 2 || row.kategorie.trim().length > 80) {
      errors.push(`Zeile ${index + 1}: Kategorie-Name muss zwischen 2 und 80 Zeichen lang sein`);
      return;
    }
    
    if (row.auswahl.trim().length < 2 || row.auswahl.trim().length > 80) {
      errors.push(`Zeile ${index + 1}: Skill-Name muss zwischen 2 und 80 Zeichen lang sein`);
      return;
    }
    
    valid.push(row);
  });
  
  return { valid, errors };
}
