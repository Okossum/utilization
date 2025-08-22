# Cloud Functions Setup für Person ID-Propagation

## Übersicht
Diese Cloud Functions lösen das Problem der manuellen Person ID-Zuordnung. Sie laufen **automatisch** bei jedem Dokument-Update und propagieren die `personId` von der `auslastung` Collection zu `einsatzplan` und `mitarbeiterExcel`.

## Funktionsweise

### 1. Automatische Propagation
- **Bei Upload in `auslastung`**: Wenn ein Dokument mit `personId` hochgeladen wird, wird diese automatisch in alle passenden Dokumente in `einsatzplan` und `mitarbeiterExcel` übertragen
- **Bei Upload in `einsatzplan`/`mitarbeiterExcel`**: Wenn ein Dokument ohne `personId` hochgeladen wird, wird automatisch nach einer passenden `personId` in `auslastung` gesucht

### 2. Matching-Logik
- **Key**: `cc::person` (normalisiert: Uppercase, Whitespace-collapsed)
- **Beispiel**: `"CC AT-ULM DEV"::"BUDIMIR, ANDREA"`
- **Robust**: Funktioniert auch bei leichten Unterschieden in der Formatierung

### 3. Konfliktbehandlung
- Wenn bereits eine andere `personId` existiert, wird ein `personIdConflict` Feld gesetzt
- **Keine automatische Überschreibung** - manuelle Intervention erforderlich

## Installation

### 1. Firebase CLI installieren
```bash
npm install -g firebase-tools
firebase login
```

### 2. Projekt initialisieren
```bash
firebase init functions
cd functions
npm install
```

### 3. Build und Deploy
```bash
npm run build
firebase deploy --only functions
```

## Funktionen

### `onAuslastungWrite`
- **Trigger**: Bei jedem Update in `auslastung`
- **Aktion**: Propagiert `personId` zu allen passenden Dokumenten

### `onEinsatzplanWrite`
- **Trigger**: Bei jedem Update in `einsatzplan`
- **Aktion**: Sucht nach `personId` in `auslastung` und setzt sie

### `onMitarbeiterWrite`
- **Trigger**: Bei jedem Update in `mitarbeiterExcel`
- **Aktion**: Sucht nach `personId` in `auslastung` und setzt sie

### `backfillAllFromAuslastung`
- **Manuelle Funktion**: Füllt alle bestehenden Dokumente mit `personId` auf
- **Verwendung**: Einmalig nach dem ersten Deploy

## Vorteile gegenüber dem alten System

### ✅ **Automatisch**
- Keine manuellen Aufrufe mehr nötig
- Läuft bei jedem Upload sofort

### ✅ **Robust**
- Normalisierte Matching-Logik
- Konfliktbehandlung
- Fehlerbehandlung

### ✅ **Performant**
- Nur Updates bei Änderungen
- Batch-Operationen
- Firestore-Indexe

### ✅ **Sicher**
- Nur Cloud Functions können `personId` setzen
- Validierung der Daten
- Audit-Logs

## Testen

### 1. Lokaler Emulator
```bash
firebase emulators:start
```

### 2. Test-Daten hochladen
- Lade eine `auslastung` Excel mit `personId` hoch
- Lade eine `einsatzplan` Excel ohne `personId` hoch
- **Erwartung**: `personId` wird automatisch gesetzt

### 3. Logs prüfen
```bash
firebase functions:log
```

## Monitoring

### Logs
Alle Aktionen werden geloggt:
- `Processing document: CC AT-ULM DEV::BUDIMIR, ANDREA`
- `Propagating personId 104761 from auslastung to targets`
- `Setting personId 104761 in einsatzplan`

### Metriken
- Anzahl der propagierten `personId`
- Konflikte
- Fehler

## Troubleshooting

### Häufige Probleme

#### 1. "Missing or insufficient permissions"
- Firestore Rules prüfen
- Cloud Functions haben Admin-Rechte

#### 2. "Index not found"
- Firestore-Indexe deployen:
```bash
firebase deploy --only firestore:indexes
```

#### 3. "Function timeout"
- Timeout in `firebase.json` erhöhen
- Batch-Größe reduzieren

### Debug-Modus
```bash
firebase functions:config:set debug.enabled=true
```

## Migration vom alten System

### 1. Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### 2. Backfill ausführen
```bash
firebase functions:shell
> backfillAllFromAuslastung()
```

### 3. Altes Backend deaktivieren
- Entferne die `assignPersonIds()` Aufrufe aus dem Backend
- Behalte die Funktion für manuelle Aufrufe

### 4. Testen
- Lade neue Excel-Dateien hoch
- Prüfe, ob `personId` automatisch gesetzt wird

## Kosten

### Cloud Functions
- **Preis**: $0.40 pro Million Aufrufe
- **Schätzung**: Bei 1000 Uploads/Monat ≈ $0.0004/Monat

### Firestore
- **Preis**: $0.18 pro 100.000 Dokument-Lesungen
- **Schätzung**: Bei 1000 Uploads/Monat ≈ $0.0018/Monat

**Gesamt**: Weniger als $0.01/Monat bei normaler Nutzung

## Support

Bei Problemen:
1. Logs prüfen: `firebase functions:log`
2. Emulator testen: `firebase emulators:start`
3. Firestore Rules validieren
4. Indexe prüfen
