# Ziel
Sobald **eine** Datei/Zeile in _auslastung_, _einsatzplan_ **oder** _mitarbeiterExcel_ hochgeladen/aktualisiert wird, soll – sofern in **auslastung** ein passender Datensatz vorhanden ist – die dortige **personId** in die anderen beiden Collections übertragen (Upsert) werden.

**Match-Key:** `(cc, person)` – exakt/normalisiert.  
**Quelle der Wahrheit:** `auslastung.personId`.

---

# Collections & Felder (Ist-Stand aus den Screenshots)

## 1) `auslastung`
Beispiel-Dokument:
- **cc**: `"CC AT-ULM DEV"`
- **person**: `"Budimir, Andrea"`
- **personId**: `"104761"` *(Quelle der Wahrheit)*
- **bereich**: `"BU AT III (WUERTTEMBERG)"`
- **lob**: `"BL AUTOMOTIVE"`
- **team**: `"T AT-ULM DEV T1"`
- **fileName**: `"Auslastung (Wessel).xlsx"`
- **values**: Map `{"25/01": 100, "25/02": 95.3, ...}`
- **createdAt, updatedAt, uploadDate**: Timestamp
- **uploadVersion**: Number
- **isLatest**: Boolean
- **updatedBy**: String

**Pflichtfelder für Matching:** `cc`, `person`, `personId`

---

## 2) `einsatzplan`
Beispiel-Dokument:
- **cc**: (kann `null` sein)  
- **person**: `"Evsen, Baran"`
- **personId**: *(fehlt/`null` – soll gesetzt werden)*
- **bereich**: `"BE AT III (WÜRTTEMBERG)"`
- **lob**: `"LOB AUTOMOTIVE&TRANSPORTATION (AT)"`
- **team**: (kann `null` sein)
- **lbs**: Job Title
- **fileName**: `"Einsatzplan KW 34 (2).xlsx"`
- **values**: Map `{"25/01": 0, "25/34": 0, ...}`
- **createdAt, updatedAt, uploadDate**: Timestamp
- **uploadVersion**: Number
- **isLatest**: Boolean

**Pflichtfelder für Matching:** `cc` (falls vorhanden), `person`

---

## 3) `mitarbeiterExcel`
Beispiel-Dokument:
- **cc**: `"CC AT-MUC DEV 1"`
- **person**: `"Nakkala, Sivanagaraju"`
- **email**: `"sivanagaraju.nakkala@adesso.de"`
- **vorname** / **nachname**
- **firma**, **lob**, **team**, **standort**
- **lbs**: Job Title
- **erfahrungSeitJahr**: String/Number
- **verfuegbarAb**, **verfuegbarFuerStaffing**: String
- **linkZumProfil**: String
- **personId**: *(fehlt – soll gesetzt werden)*
- **createdAt, updatedAt**: Timestamp
- **uploadVersion**: Number

**Pflichtfelder für Matching:** `cc`, `person`

---

# Vereinheitlichung & Normalisierung
Um robuste Matches zu erhalten:
- **cc**: trim, collapse spaces, Uppercase (z. B. `"CC AT-ULM DEV"`).
- **person**: trim, case-insensitive Vergleich; akzeptiere Varianten mit Mehrfach‑Spaces.  
  Format erwartet: `"Nachname, Vorname"`.
- Leere/`null`‑Felder **nicht** matchen; dann kein Update.

Utility:
```text
normalizeCc(s): toUpper(trim(collapseWhitespace(s)))
normalizePerson(s): toUpper(trim(collapseWhitespace(s)))
key = `${normalizeCc(cc)}::${normalizePerson(person)}`
```

---

# Prozesslogik (Echtzeit)
1. **Trigger** auf `onDocumentWritten` für alle drei Collections.  
2. Aus dem geänderten Dokument `(cc, person)` normalisieren → `key`.
3. **Lookup in `auslastung`**: Finde *ein* Dokument mit gleichem `key` und mit **personId** ≠ leer.
4. Wenn gefunden → `targetPersonId = personId`.
5. **Upsert** `personId` im geänderten Dokument (wenn abweichend oder fehlt).  
6. **Bei Änderungen an `auslastung`** zusätzlich **alle** passenden Dokumente in `einsatzplan` und `mitarbeiterExcel` (optional nur `isLatest == true`) updaten.
7. Idempotent schreiben; keine Schleifen: Nur Updaten, wenn Wert sich ändert.

**Konflikte:** Wenn in Ziel-Dokument bereits eine *andere* `personId` steht → in Feld `personIdConflict` protokollieren und **nicht** überschreiben (oder via Flag `FORCE_OVERWRITE=false`).

---

# Indexe (empfohlen)
- Einzelindex: `auslastung.person` (ASC), `auslastung.cc` (ASC)
- Einzelindex: `einsatzplan.person` (ASC), `einsatzplan.cc` (ASC)
- Einzelindex: `mitarbeiterExcel.person` (ASC), `mitarbeiterExcel.cc` (ASC)

Für häufige Abfragen reicht der einfache Where‑AND‑Query (`where('person','==',p).where('cc','==',c)`). Falls Firestore Composite verlangt, erstellt es die Fehlermeldung mit Direktlink.

---

# Cloud Functions (TypeScript) – Vorschlag
> Nutzt Functions v2, Admin SDK, idempotente Updates und Normalizer.

```ts
// functions/src/index.ts
import * as logger from "firebase-functions/logger";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = getFirestore();

type AnyDoc = FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot;

const COLS = {
  AUSLASTUNG: "auslastung",
  EINSATZPLAN: "einsatzplan",
  MITARBEITER: "mitarbeiterExcel",
} as const;

// ---------- Helpers ----------
const collapse = (s: string) => s.replace(/\s+/g, " ");
const norm = (s?: string | null) => (s ? collapse(s).trim().toUpperCase() : "");
const keyOf = (cc?: string | null, person?: string | null) => `${norm(cc)}::${norm(person)}`;

async function findPersonIdInAuslastung(key: string): Promise<string | null> {
  const [cc, person] = key.split("::");
  if (!cc || !person) return null;
  const snap = await db
    .collection(COLS.AUSLASTUNG)
    .where("cc", "==", cc)
    .where("person", "==", person)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const pid = doc.get("personId");
  return pid ? String(pid) : null;
}

async function upsertPersonId(ref: FirebaseFirestore.DocumentReference, targetPersonId: string) {
  const doc = await ref.get();
  const current = doc.get("personId");
  if (current === targetPersonId) return; // no-op
  if (current && current !== targetPersonId) {
    await ref.set(
      {
        personIdConflict: {
          previous: current,
          incoming: targetPersonId,
          at: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
    logger.warn(`personId conflict @ ${ref.path}: ${current} -> ${targetPersonId}`);
    return; // do not overwrite automatically
  }
  await ref.set({ personId: targetPersonId, personIdSetAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function propagateToTargets(key: string, personId: string) {
  const [cc, person] = key.split("::");
  const targets = [COLS.EINSATZPLAN, COLS.MITARBEITER] as const;
  for (const col of targets) {
    const q = await db.collection(col).where("cc", "==", cc).where("person", "==", person).get();
    const batch = db.batch();
    q.docs.forEach((d) => {
      const current = d.get("personId");
      if (current !== personId) {
        batch.set(d.ref, { personId, personIdSetAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    });
    if (!q.empty) await batch.commit();
  }
}

// ---------- Triggers ----------

function handlerFactory(collection: string) {
  return onDocumentWritten(`/${collection}/{docId}`, async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return; // deleted

    const cc = norm(after.get("cc"));
    const person = norm(after.get("person"));
    if (!cc || !person) return; // cannot match

    const key = `${cc}::${person}`;

    // 1) If this is AUSLASTUNG and has personId -> propagate
    if (collection === COLS.AUSLASTUNG) {
      const personId = after.get("personId");
      if (personId) await propagateToTargets(key, String(personId));
      return;
    }

    // 2) For EINSATZPLAN/MITARBEITER: try to fetch personId from AUSLASTUNG
    const personId = await findPersonIdInAuslastung(key);
    if (personId) await upsertPersonId(after.ref, personId);
  });
}

export const onAuslastungWrite = handlerFactory(COLS.AUSLASTUNG);
export const onEinsatzplanWrite = handlerFactory(COLS.EINSATZPLAN);
export const onMitarbeiterWrite = handlerFactory(COLS.MITARBEITER);
```

---

# Backfill-Skript (einmalig/bei Bedarf)
> Läuft lokal via Node/TS oder als HTTPS Callable. Lädt alle `auslastung` mit `personId` und propagiert.

```ts
export async function backfillAllFromAuslastung() {
  const snap = await db.collection(COLS.AUSLASTUNG).where("personId", "!=", null).get();
  for (const d of snap.docs) {
    const cc = norm(d.get("cc"));
    const person = norm(d.get("person"));
    const pid = String(d.get("personId"));
    await propagateToTargets(`${cc}::${person}`, pid);
  }
}
```

---

# Firestore Security Rules (Skizze)
> App-Clients dürfen `personId` **nicht** schreiben; nur Cloud Functions.

```rules
match /databases/{database}/documents {
  function isFunction() { return request.auth.token.function == true; }

  match /{col}/{doc} {
    allow read: if true;
    allow update, create: if isFunction();
  }
}
```
*(Setze bei Functions ein Custom Claim oder nutze Admin SDK ausschließlich serverseitig.)*

---

# Tests (Checklist)
- [ ] Neues `einsatzplan`-Dok ohne `personId`, aber mit `(cc, person)` → `personId` wird gesetzt.
- [ ] Neues `mitarbeiterExcel`-Dok ohne `personId` → `personId` wird gesetzt.
- [ ] Änderung in `auslastung.personId` → propagiert in beide Collections.
- [ ] Null/fehlende `cc`/`person` → kein Update (silent no-op).
- [ ] Konfliktfall (abweichende vorhandene `personId`) → `personIdConflict` gesetzt, **kein** Overwrite.

---

# Hinweise
- Falls `einsatzplan.cc` manchmal `null` ist, muss die Upload-Pipeline `cc` befüllen, sonst kein Match möglich. Alternativ kann ein sekundärer Key (z. B. `team` + `person`) ergänzt werden.
- Für Performance/Budget empfiehlt sich die Verarbeitung in Batches und ggf. die Beschränkung auf `isLatest == true`.
- Einheitliche Großschreibung/Whitespace-Normalisierung ist essenziell, damit `(cc, person)` stabil matcht.

