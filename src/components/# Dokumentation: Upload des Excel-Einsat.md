# Dokumentation: Upload des Excel-Einsatzplans in Firestore

Stand: 2025-08-22

Dieses Dokument beschreibt im Detail, wie die Datei **„Einsatzplan (Team1).xlsx“** aufgebaut ist, wie sie geparst werden soll und wie die Daten in **Firestore** abgelegt werden.  
Die Speicherung erfolgt in einer **Subcollection `weeks` je Mitarbeiter-Dokument**.  
Damit wird sichergestellt, dass pro **Mitarbeiter + Kalenderwoche (KW)** ein eindeutiges Dokument existiert.

---

## 1. Excel-Dateistruktur

### 1.1 Allgemein
- **Dateiname:** `Einsatzplan (Team1).xlsx`  
- **Sheet:** `Einsatzplan`  
- **Header-Zeile:** **3**  
- **Daten beginnen ab Zeile:** **4**  
- **Gesamtspalten:** ca. **90** (A – CL)  

---

### 1.2 Stammdaten-Spalten (A–O)

| Spalte | Index | Header              | Beschreibung                           |
|--------|-------|---------------------|---------------------------------------|
| A      | 1     | `Name`              | Format „Nachname, Vorname“             |
| B      | 2     | `LoB`               | Line of Business                       |
| C      | 3     | `Bereich`           | Bereich                                |
| D      | 4     | `CC`                | Competence Center                      |
| E      | 5     | `Team`              | Teambezeichnung                        |
| F      | 6     | `Geschäftsstelle`   | Standort / Office                      |
| G      | 7     | `akt. Einsatzort`   | Einsatzort                             |
| H      | 8     | `VG`                | Vorgesetzter                           |
| I      | 9     | `LBS`               | Laufbahnstufe                          |
| J      | 10    | `Kompetenz`         | Kompetenzfeld                          |
| K      | 11    | `Angeboten bei`     | Angebot / Kunde                        |
| L      | 12    | `Verfügbar ab`      | Ab wann verfügbar                      |
| M      | 13    | `Staffbar`          | Boolean, ob staffbar                   |
| N      | 14    | `OV`                | Zusatzinfo (OV)                        |
| O      | 15    | `OP`                | Zusatzinfo (OP)                        |

---

### 1.3 3er-Gruppen pro Kalenderwoche (ab Spalte P)

- Ab Spalte **P (16)** folgen Blöcke à **3 Spalten** je Kalenderwoche:
  - `Projekt`
  - `NKV (%)`
  - `Ort`

Beispiel:
- **P/Q/R:** Projekt_1, NKV%_1, Ort_1 für KW `25/34`
- **S/T/U:** Projekt_2, NKV%_2, Ort_2 für KW `25/35`
- …
- letzter Block bis ca. **CL**

**Die KW-Angabe steht in Zeile 3 über der Projekt-Spalte** (z. B. `KW 25/34` → zu `25/34` normalisieren).

---

## 2. Parsing-Regeln

### 2.1 Iteration über Spalten
- Starte bei Spalte **P**
- Gehe in Schritten von 3 (Projekt, NKV, Ort)
- `colProjekt = start`, `colNkv = start+1`, `colOrt = start+2`
- `kw = ws[3][colProjekt]` (Wert aus Headerzeile 3)
  - Regex-Parsing: `"KW 25/34"` → `25/34`

### 2.2 Pro Datenzeile (ab Zeile 4)
- Lies Stammdaten (Name, CC, Team, LoB, Bereich …)
- Führe **Person-Matching** durch (siehe Abschnitt 3.3)
- Für jede 3er-Gruppe:
  - `projekt = row[colProjekt]`
  - `nkv = row[colNkv]` (→ Zahl, `,` zu `.`)
  - `ort = row[colOrt]`
- Wenn mindestens einer der Werte gesetzt ist → erzeugen.

---

## 3. Firestore-Datenmodell

### 3.1 Mitarbeiter-Dokument
- Collection: `mitarbeiter`
- **Doc-ID:** deterministisch aus `(Nachname, Vorname + CC)` → `SHA1("mitarbeiter|" + normalize(name) + "|" + normalize(cc))`
- Felder: `person`, `vorname`, `nachname`, `cc`, `email`, `team`, `lob`, `bereich`, etc.

### 3.2 Subcollection `weeks`
- Pfad: `mitarbeiter/{personId}/weeks/{kw}`
- **Doc-ID:** `kw` (z. B. `25-34`) → `JJ-WW`
- Felder:
  ```json
  {
    "kw": "25/34",
    "entries": [
      { "projekt": "Projekt A", "ort": "Stuttgart", "nkvProzent": 60 },
      { "projekt": "Projekt B", "ort": "Remote", "nkvProzent": 40 }
    ],
    "team": "T AT-ULM DEV T1",
    "lob": "AUTOMOTIVE",
    "bereich": "BE AT II",
    "sourceFile": "Einsatzplan (Team1).xlsx",
    "updatedAt": "2025-08-22T11:15:00Z"
  }
entries[] enthält alle Projekte/Orte/NKV% der KW

Pro Mitarbeiter & KW genau ein Dokument

4. Matching-Regeln (Mitarbeiter → personId)
Exakt (Name + CC)

nameKey = normalize("Nachname, Vorname")

ccKey = normalize(CC)

Lookup: byNameCc.get(nameKey|ccKey) → personId

Fallback nur Name (wenn eindeutig)

set = byName.get(nameKey)

wenn set.size === 1 → personId = only

Andernfalls

Zeile in unresolved[] aufnehmen mit:

rowIndex

person

cc

reason: "ambiguous"|"unmatched"

5. Ablauf des Upload-Prozesses
Excel einlesen

Workbook öffnen

Sheet Einsatzplan wählen

Header-Zeile = 3, Daten ab Zeile 4

Person-Index aufbauen

mitarbeiter-Collection einlesen

Maps byNameCc, byName bauen

Zeilen durchlaufen

Stammdaten auslesen

Person matchen

Falls match → weiter; sonst → unresolved

3er-Gruppen durchlaufen

KW aus Header ziehen

Werte projekt, nkvProzent, ort extrahieren

Falls Werte vorhanden → Array-Entry erzeugen

Subcollection updaten

setDoc(doc(db, "mitarbeiter", personId, "weeks", kw), payload, { merge: true })

Merge sorgt für idempotente Updates

Batch-Commits

In 400er-Chunks committen

stats berechnen: { rows, matched, ambiguous, unmatched, writtenDocs }

6. Randfälle & Best Practices
KW-Normalisierung: "KW 25/34" → 25/34

nKV-Werte: Number(String(v).replace(",", "."))

Leere Felder: Felder weglassen, nicht null speichern

Idempotenz: gleiche personId + kw = gleiches Doc → Re-Uploads überschreiben

Unresolved: CSV-Export mit rowIndex, person, cc, reason

Performanz: writeBatch in ≤400 Writes

7. Akzeptanzkriterien
Pro Mitarbeiter & KW genau ein Dokument in mitarbeiter/{personId}/weeks/{kw}

Dokument enthält entries[]-Array aller Projekte/Orte/NKV% für diese KW

Re-Uploads überschreiben bestehende Dokumente, erzeugen keine Duplikate

Nicht zuordenbare Zeilen werden ausgewiesen (UI + CSV)

nKV-Prozentwerte sind Zahlen, KW ist im Format JJ/WW

8. Beispiel
json
Copy
Edit
mitarbeiter/abc123/weeks/25-34

{
  "kw": "25/34",
  "entries": [
    { "projekt": "Projekt A", "ort": "Stuttgart", "nkvProzent": 60 },
    { "projekt": "Projekt B", "ort": "Remote", "nkvProzent": 40 }
  ],
  "team": "T AT-ULM DEV T1",
  "lob": "AUTOMOTIVE",
  "bereich": "BE AT II",
  "sourceFile": "Einsatzplan (Team1).xlsx",
  "updatedAt": "2025-08-22T11:15:00Z"
}