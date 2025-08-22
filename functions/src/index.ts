import * as logger from "firebase-functions/logger";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = getFirestore();

const COLS = {
  AUSLASTUNG: "auslastung",
  EINSATZPLAN: "einsatzplan",
  MITARBEITER: "mitarbeiter",
} as const;

// ---------- Helpers ----------
const collapse = (s: string) => s.replace(/\s+/g, " ");
const norm = (s?: string | null) => (s ? collapse(s).trim().toUpperCase() : "");

async function findPersonIdInAuslastung(cc: string | null, person: string): Promise<string | null> {
  if (!person) return null;

  // Normalfall: cc + person
  if (cc) {
    const snap = await db
      .collection(COLS.AUSLASTUNG)
      .where("cc", "==", cc)
      .where("person", "==", person)
      .where("isLatest", "==", true)
      .limit(1)
      .get();
    if (!snap.empty) {
      const pid = snap.docs[0].get("personId");
      if (pid) {
        logger.info(`Match über cc+person gefunden: ${cc} / ${person} -> ${pid}`);
        return String(pid);
      }
    }
  }

  // Fallback: nur person
  const snapPerson = await db
    .collection(COLS.AUSLASTUNG)
    .where("person", "==", person)
    .where("isLatest", "==", true)
    .limit(2) // max. 2 laden, um Ambiguität zu erkennen
    .get();

  if (snapPerson.empty) {
    logger.info(`Kein Match für Person (Fallback): ${person}`);
    return null;
  }
  if (snapPerson.size > 1) {
    logger.warn(`Mehrere Matches für Person (Fallback, keine Zuordnung): ${person} (${snapPerson.size} Dokumente)`);
    return null;
  }

  const pid = snapPerson.docs[0].get("personId");
  if (pid) {
    logger.info(`Match über Person (Fallback) gefunden: ${person} -> ${pid}`);
    return String(pid);
  }
  return null;
}

async function upsertPersonId(ref: FirebaseFirestore.DocumentReference, targetPersonId: string) {
  const doc = await ref.get();
  const current = doc.get("personId");

  if (current === targetPersonId) {
    logger.info(`personId bereits korrekt gesetzt für ${ref.path}: ${targetPersonId}`);
    return; // nichts zu tun
  }

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
    return; // kein automatisches Überschreiben
  }

  await ref.set(
    { personId: targetPersonId, personIdSetAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  logger.info(`personId gesetzt für ${ref.path}: ${targetPersonId}`);
}

async function propagateToTargets(cc: string | null, person: string, personId: string) {
  const targets = [COLS.EINSATZPLAN, COLS.MITARBEITER] as const;
  let totalUpdated = 0;
  
  for (const col of targets) {
    let q = db.collection(col).where("person", "==", person).where("isLatest", "==", true);
    if (cc) {
      q = q.where("cc", "==", cc);
    }
    const snap = await q.get();

    if (snap.empty) {
      logger.info(`Keine Zieldokumente in ${col} für ${cc ? `cc=${cc}, ` : ''}person=${person}`);
      continue;
    }

    const batch = db.batch();
    let updatedInBatch = 0;
    
    snap.docs.forEach((d) => {
      const current = d.get("personId");
      if (current !== personId) {
        batch.set(
          d.ref,
          { personId, personIdSetAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
        updatedInBatch++;
      }
    });
    
    if (updatedInBatch > 0) {
      await batch.commit();
      totalUpdated += updatedInBatch;
      logger.info(`Propagiert personId=${personId} in ${col} (${updatedInBatch}/${snap.size} Dokumente aktualisiert)`);
    } else {
      logger.info(`Keine personId-Updates nötig in ${col} (alle bereits korrekt)`);
    }
  }
  
  logger.info(`Propagation abgeschlossen: ${totalUpdated} Dokumente insgesamt aktualisiert`);
}

// ---------- Trigger Factory ----------
function handlerFactory(collection: string) {
  return onDocumentWritten(`/${collection}/{docId}`, async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return; // gelöscht

    const cc = norm(after.get("cc"));
    const person = norm(after.get("person"));
    if (!person) {
      logger.warn(`Kein person-Feld in ${collection} Dokument ${after.id}, überspringe`);
      return;
    }

    logger.info(`Verarbeite ${collection} Dokument: ${after.id} (cc: "${cc || 'LEER'}", person: "${person}")`);

    // 1) Wenn auslastung: propagieren
    if (collection === COLS.AUSLASTUNG) {
      const personId = after.get("personId");
      if (personId) {
        logger.info(`Propagiere personId ${personId} von auslastung zu Zielen`);
        await propagateToTargets(cc || null, person, String(personId));
      } else {
        logger.info(`Kein personId in auslastung Dokument ${after.id}, keine Propagation`);
      }
      return;
    }

    // 2) Wenn einsatzplan/mitarbeiter: personId aus auslastung suchen
    const personId = await findPersonIdInAuslastung(cc || null, person);
    if (personId) {
      logger.info(`Setze personId ${personId} in ${collection} Dokument ${after.id}`);
      await upsertPersonId(after.ref, personId);
    } else {
      logger.info(`Keine personId aus auslastung gefunden für ${collection} Dokument ${after.id}`);
    }
  });
}

export const onAuslastungWrite = handlerFactory(COLS.AUSLASTUNG);
export const onEinsatzplanWrite = handlerFactory(COLS.EINSATZPLAN);
export const onMitarbeiterWrite = handlerFactory(COLS.MITARBEITER);

// ---------- Backfill Function ----------
export async function backfillAllFromAuslastung() {
  logger.info("Starte Backfill aller personIds von auslastung");
  
  const snap = await db
    .collection(COLS.AUSLASTUNG)
    .where("personId", "!=", null)
    .where("isLatest", "==", true)
    .get();
    
  logger.info(`Gefunden: ${snap.size} auslastung Dokumente mit personId`);
  
  let totalPropagated = 0;
  
  for (const d of snap.docs) {
    const cc = norm(d.get("cc"));
    const person = norm(d.get("person"));
    const pid = String(d.get("personId"));
    
    if (person) {
      logger.info(`Backfill für: ${cc ? `cc=${cc}, ` : ''}person=${person} -> personId=${pid}`);
      await propagateToTargets(cc || null, person, pid);
      totalPropagated++;
    }
  }
  
  logger.info(`Backfill abgeschlossen: ${totalPropagated} personIds propagiert`);
}
