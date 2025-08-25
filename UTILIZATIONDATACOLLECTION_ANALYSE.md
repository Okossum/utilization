# 📊 Analyse: utilizationData Collection Struktur

## Document ID: `01e0b84adfd05a8242e049ee265fded0f239d21e`

### Feldstruktur:

| Feld | Wert | Typ | Beschreibung |
|------|------|-----|--------------|
| `auslastung` | `{25/01: 100, 25/02: 100, ...}` | Object | Auslastungsdaten pro Woche |
| `bereich` | `"BE AT III (WÜRTTEMBERG)"` | String | Geschäftsbereich |
| `cc` | `"CC AT-STR-BUS CON"` | String | Cost Center |
| `createdAt` | `August 25, 2025 at 9:22:44 AM UTC+2` | Timestamp | Erstellungsdatum |
| `dataCompleteness` | `{hasAuslastung: true, hasE...}` | Object | Vollständigkeitsstatus |
| `einsatzplan` | `{25/01: [{ort: "--", proj...}]}` | Object | Einsatzplandaten pro Woche |
| `email` | `"manuella.markaj@adesso.de"` | String | E-Mail-Adresse |
| `erfahrungSeitJahr` | `"2011"` | String | Berufserfahrung seit Jahr |
| `firma` | `"adesso SE"` | String | Firma |
| **`id`** | **`"01e0b84adfd05a8242e049ee265fded0f239d21e"`** | **String** | **Eindeutige ID** |
| `lastUploadFiles` | `{auslastung: "Auslastung (...)}` | Object | Letzte Upload-Dateien |
| `lbs` | `"Consultant"` | String | Line of Business/Karrierelevel |
| `linkZumProfilUrl` | `"https://profiler.adesso-group.com/profile/200213657"` | String | Profiler-Link |
| `lob` | `"LOB AUTOMOTIVE&TRANSPORTATION (AT)"` | String | Line of Business |
| `matchStatus` | `"matched"` | String | Matching-Status |
| `nachname` | `"Markaj"` | String | Nachname |
| **`person`** | **`"Markaj, Manuella"`** | **String** | **Vollständiger Name** |
| `standort` | `"Stuttgart-Vaihingen"` | String | Standort |
| `team` | `""` | String | Team (leer) |
| `updatedAt` | `August 25, 2025 at 9:22:44 AM UTC+2` | Timestamp | Aktualisierungsdatum |
| `verfuegbarAb` | `"2025-12-31"` | String | Verfügbar ab Datum |
| `verfuegbarFuerStaffing` | `"X"` | String | Staffing-Verfügbarkeit |
| `vg` | `"Dagdeviren, Ufuk"` | String | Vorgesetzter |
| `vorname` | `"Manuella"` | String | Vorname |

---

## ✅ Korrekte Identifikation:

- **`id`:** `"01e0b84adfd05a8242e049ee265fded0f239d21e"` ← **Das ist die eindeutige ID!**
- **`person`:** `"Markaj, Manuella"` ← **Das ist der Anzeigename!**

## 🔧 Wichtige Erkenntnisse:

1. **Die ID ist ein UUID-ähnlicher Hash**, nicht der Name
2. **Das `person` Feld enthält den vollständigen Namen** im Format "Nachname, Vorname"
3. **Für Projekt-Referenzen muss nach `id` gesucht werden**, nicht nach `person`
4. **Die `findPersonId()` Funktion ist korrekt implementiert:**
   - Input: `person = "Markaj, Manuella"`
   - Suche in databaseData: Finde Record wo `record.person === "Markaj, Manuella"`
   - Output: `id = "01e0b84adfd05a8242e049ee265fded0f239d21e"`

## 📋 Datenstruktur-Konsistenz:

- **utilizationData Collection:** Verwendet `id` als eindeutigen Identifier
- **auslastung Collection:** Sollte auch `id` verwenden (nach Konsolidierung)
- **einsatzplan Collection:** Sollte auch `id` verwenden (nach Konsolidierung)

**Die ID ist die ID - nicht der Name!**
