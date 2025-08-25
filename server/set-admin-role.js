// Script zum Setzen der Admin-Rolle für oliver.koss@adesso.de

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK initialisieren
const serviceAccount = require(path.join(__dirname, '../functions/lib/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setAdminRole() {
  try {
    console.log('🔍 Suche nach oliver.koss@adesso.de in utilizationData...');
    
    // Suche nach dem Dokument mit der E-Mail
    const snapshot = await db.collection('utilizationData')
      .where('email', '==', 'oliver.koss@adesso.de')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Keine Dokumente mit oliver.koss@adesso.de gefunden');
      return;
    }
    
    // Update das erste gefundene Dokument
    const doc = snapshot.docs[0];
    const docRef = db.collection('utilizationData').doc(doc.id);
    
    console.log('📋 Gefundenes Dokument:', doc.id);
    console.log('📋 Aktuelle Daten:', doc.data());
    
    // Setze Admin-Rolle
    await docRef.update({
      systemRole: 'admin',
      hasSystemAccess: true,
      roleAssignedBy: 'system-script',
      roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRoleUpdate: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Admin-Rolle erfolgreich gesetzt für oliver.koss@adesso.de');
    console.log('🎭 Neue Rolle: admin');
    console.log('🔓 System-Zugriff: true');
    
    // Verifikation
    const updatedDoc = await docRef.get();
    console.log('📋 Aktualisierte Daten:', updatedDoc.data());
    
  } catch (error) {
    console.error('❌ Fehler beim Setzen der Admin-Rolle:', error);
  } finally {
    process.exit(0);
  }
}

setAdminRole();
