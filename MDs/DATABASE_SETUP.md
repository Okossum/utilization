# Lokale SQLite-Datenbank Setup

## ✅ Installation abgeschlossen

Deine lokale SQLite-Datenbank ist erfolgreich eingerichtet!

## 📁 Erstellte Dateien

- `prisma/schema.prisma` - Datenbankschema
- `src/services/database.ts` - Datenbank-Service
- `dev.db` - SQLite-Datenbankdatei (wird automatisch erstellt)
- `env.example` - Umgebungsvariablen (DATABASE_URL hinzugefügt)

## 🚀 Verwendung

### 1. Datenbank-Service importieren
```typescript
import DatabaseService from './services/database';
```

### 2. Auslastung-Daten speichern
```typescript
await DatabaseService.saveAuslastung(fileName, data);
```

### 3. Einsatzplan-Daten speichern
```typescript
await DatabaseService.saveEinsatzplan(fileName, data);
```

### 4. Daten abrufen
```typescript
const auslastung = await DatabaseService.getAuslastung();
const einsatzplan = await DatabaseService.getEinsatzplan();
const history = await DatabaseService.getUploadHistory();
const utilizationData = await DatabaseService.getUtilizationData();
```

### 5. Daten konsolidieren und normalisieren
```typescript
await DatabaseService.consolidateAndSaveUtilizationData(
  auslastungData,
  einsatzplanData,
  currentYear,
  forecastStartWeek,
  lookbackWeeks,
  forecastWeeks
);
```

**🔄 Automatische Konsolidierung:**
Die Konsolidierung läuft automatisch nach dem Upload beider Dateien im `UploadPanel`. Du musst nichts manuell aufrufen!

## 🔧 Datenbank verwalten

### Prisma Studio öffnen (GUI für Datenbank)
```bash
npx prisma studio
```

### Datenbank zurücksetzen
```bash
npx prisma db push --force-reset
```

### Schema aktualisieren
```bash
npx prisma db push
```

## 📊 Datenmodell

- **Auslastung**: Personendaten + Wochenwerte
- **Einsatzplan**: Personendaten + Wochenwerte  
- **UploadHistory**: Protokoll aller Uploads
- **UtilizationData**: Normalisierte, konsolidierte Daten für die UI

## 🔄 Migration zu anderen Datenbanken

Später kannst du einfach den Provider in `schema.prisma` ändern:
```prisma
datasource db {
  provider = "postgresql" // oder "mysql"
  url      = env("DATABASE_URL")
}
```

## ⚠️ Wichtige Hinweise

- Die Datenbankdatei `dev.db` wird im Projektverzeichnis gespeichert
- Füge `dev.db` zu deiner `.gitignore` hinzu (wird automatisch gemacht)
- Alle Daten bleiben lokal auf deinem Rechner
- Keine Verbindung zu Firebase erforderlich
