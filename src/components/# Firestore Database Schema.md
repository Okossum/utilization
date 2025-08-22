# Firestore Database Schema

Dieses Dokument beschreibt die Collections, Felder und Strukturen in der Firestore-Datenbank.

---

## Collections

### `mitarbeiter`
- **Doc-ID:** deterministisch aus `(Nachname, Vorname + CC)` generiert.
- **Felder:**
  - `person`: Gesamtdarstellung, z. B. `"Kusig, Matthias"`
  - `vorname`: Vorname
  - `nachname`: Nachname
  - `cc`: Competence Center, z. B. `"CC AT-STR-IT CON"`
  - `externalId`: Optionale ID in Klammern aus Excel (nur in Auslastung vorhanden)
  - `email`: E-Mail (nur in Mitarbeiter-Datei verfügbar)
  - `firma`: Arbeitgeber (z. B. `"adesso SE"`)
  - `lbs`: Laufbahn-/Positionsbezeichnung (z. B. `"Senior Software Engineer"`)
  - `lob`: Line of Business, z. B. `"LOB AUTOMOTIVE&TRANSPORTATION (AT)"`
  - `bereich`: Bereich, z. B. `"BE AT III (WÜRTTEMBERG)"`
  - `team`: Teamname
  - `standort`: Standort, z. B. `"Stuttgart-Vaihingen"`
  - `linkZumProfilUrl`: Hyperlink aus Excel (letzte Spalte, falls vorhanden)
  - `erfahrungSeitJahr`: Erfahrungsbeginn
  - `verfuegbarAb`: Ab wann verfügbar (kann leer sein)
  - `verfuegbarFuerStaffing`: Staffing-Status (kann leer sein)
  - `uploadVersion`: Nummer des Uploads
  - `createdAt`, `updatedAt`: Timestamps
  - `normalized`: interne Normalisierungsfelder:
    - `name`: Normalisiert `"nachname, vorname"`
    - `cc`: Normalisiert `"cc"`
    - `nameCc`: Kombination (Primärschlüssel)

---

### `einsatzplan`
- **Doc-ID:** = `personId` (Doc-ID aus `mitarbeiter`)  
- **Felder:**
  - `person`: `"Rahn, Johannes"`
  - `cc`: Competence Center
  - `team`: Team, z. B. `"T AT-ULM DEV T1"`
  - `lob`: Line of Business
  - `bereich`: Bereich
  - `lbs`: Laufbahn-/Positionsbezeichnung
  - `values`: Map mit Wochenwerten, z. B.:
    ```json
    {
      "25/34": 100,
      "25/35": 100,
      ...
    }
    ```
  - `fileName`: Ursprünglicher Excel-Dateiname
  - `uploadVersion`: Nummer des Uploads
  - `uploadDate`: Zeitpunkt des Uploads
  - `isLatest`: `true`, wenn aktuellster Upload
  - `matchStatus`: `"matched" | "ambiguous" | "unmatched"`

---

### `auslastung`
- **Doc-ID:** = `personId` (Doc-ID aus `mitarbeiter`)  
- **Felder:**
  - `person`: `"Fuß, Ronald"`
  - `personId`: ID aus `mitarbeiter`
  - `cc`: Competence Center
  - `team`: Team, z. B. `"T AT-MUC CON T1"`
  - `lob`: Business Line (z. B. `"BL AUTOMOTIVE"`)
  - `bereich`: Bereich, z. B. `"BU AT II (BAYERN)"`
  - `values`: Map mit Wochenwerten, analog zu `einsatzplan`
  - `fileName`: Ursprünglicher Excel-Dateiname
  - `uploadVersion`, `uploadDate`, `isLatest`: wie bei `einsatzplan`
  - `matchStatus`: `"matched" | "ambiguous" | "unmatched"`
  - `createdBy`, `updatedBy`: User-ID, der hochgeladen hat
  - `createdAt`, `updatedAt`: Timestamps

---

### Weitere Collections (Übersicht)
- `employeeSkills`, `technicalSkills`, `skills` → Knowledge- und Skill-Management
- `projects`, `assignments` → Projekt- & Ressourcenplanung
- `employeeDossiers`, `employeeStammdaten` → Personalinfos
- `uploadHistory` / `knowledgeUploadHistory` → Protokollierung vergangener Uploads
- `roles`, `users` → Rechteverwaltung
- `person_status`, `person_standard_statuses`, `standard_statuses` → Statusverwaltung für Mitarbeiter
