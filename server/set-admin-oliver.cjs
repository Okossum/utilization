/**
 * Setzt Oliver Koss als Administrator
 */

const admin = require('firebase-admin');

// Firebase Admin initialisieren (falls noch nicht geschehen)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'ressource-utilization-app'
  });
}

const db = admin.firestore();

async function setOliverAsAdmin() {
  try {
    console.log('🔍 Suche nach Oliver Koss in utilizationData...');
    
    const snapshot = await db.collection('utilizationData').get();
    let oliverDoc = null;
    
    // Suche nach Oliver Koss
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.person === 'Koss, Oliver' || data.email === 'oliver.koss@adesso.de') {
        oliverDoc = { id: doc.id, ...data };
      }
    });
    
    if (oliverDoc) {
      console.log('✅ Oliver gefunden:', oliverDoc.person);
      console.log('📧 E-Mail:', oliverDoc.email);
      
      // Admin-Rolle setzen
      await db.collection('utilizationData').doc(oliverDoc.id).update({
        systemRole: 'admin',
        hasSystemAccess: true,
        roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleAssignedBy: 'manual-admin-setup'
      });
      
      console.log('🎉 Oliver Koss wurde erfolgreich als Administrator eingerichtet!');
      console.log('🔑 Rolle: admin');
      console.log('✅ System-Zugriff: aktiviert');
      
    } else {
      console.log('❌ Oliver Koss nicht in utilizationData gefunden');
      console.log('📋 Verfügbare Personen:');
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.person && data.person.toLowerCase().includes('koss')) {
          console.log(`  - ${data.person} (${data.email || 'keine E-Mail'})`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

setOliverAsAdmin();
