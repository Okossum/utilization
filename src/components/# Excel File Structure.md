# Excel File Structure

Dieses Dokument beschreibt die Struktur der für den Upload genutzten Excel-Dateien.

---

## Allgemeines
- Format: `.xlsx`
- Header befinden sich immer in **Zeile 1**
- Content beginnt ab **Zeile 2**
- Nicht alle Dateien enthalten dieselben Felder.  
- Primärer Schlüssel (für Matching): **(Nachname, Vorname + CC)**

---

## Datei: `Mitarbeiter.xlsx`
- **Header-Zeile (Beispiele):**
  - `person` → Name, Format `"Nachname, Vorname"` (optional mit `(ID)` in Klammern, wird extrahiert)
  - `cc` → Competence Center
  - `email` → E-Mail-Adresse
  - `firma` → Arbeitgeber
  - `lbs` → Laufbahn (z. B. `"Senior Software Engineer"`)
  - `lob` → Line of Business
  - `bereich` → Bereich
  - `team` → Teamname
  - `standort` → Standort
  - `erfahrungSeitJahr` → Startjahr Erfahrung
  - `verfuegbarAb` → Ab wann verfügbar
  - `verfuegbarFuerStaffing` → Staffing-Status
  - `link` (letzte Spalte, mit Hyperlink-Objekt) → URL wird extrahiert und als `linkZumProfilUrl` gespeichert

---

## Datei: `Einsatzplan.xlsx`
- **Header-Zeile (Beispiele):**
  - `person` → Name `"Nachname, Vorname"`
  - `cc` → Competence Center
  - `team`
  - `lob`
  - `bereich`
  - `lbs`
  - **KW-Spalten**: dynamisch, Format `"JJ/WW"`, z. B. `25/34`, `25/35`  
    - Werte: numerisch (z. B. `100` = volle Auslastung)
- **Besonderheiten:**
  - Jede Zeile = eine Person mit ihren Wochenwerten
  - `fileName`, `uploadDate`, `uploadVersion` werden beim Upload gesetzt

---

## Datei: `Auslastung.xlsx`
- **Header-Zeile (Beispiele):**
  - `person` → `"Nachname, Vorname (ID)"` → ID wird extrahiert
  - `cc` → Competence Center
  - `team`
  - `lob`
  - `bereich`
  - **KW-Spalten**: analog zu `einsatzplan`
- **Besonderheiten:**
  - Enthält eine zusätzliche ID in Klammern (`externalId`), die aber nicht immer auftritt
  - Primärer Schlüssel dennoch **(Name + CC)**
