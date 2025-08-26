/**
 * Entfernt das Duplikat und behält nur das Admin-Dokument
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin initialisieren (falls noch nicht geschehen)
if (!admin.apps.length) {
  let credential;
  
  const possibleCredentialFiles = [
    'ressourceutilization-firebase-adminsdk-fbsvc-e8129f7d59.json',
    'ressourceutilization-service-account.json',
    'firebase-admin-key.json'
  ];
  
  let credentialFile = null;
  for (const file of possibleCredentialFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      credentialFile = filePath;
      console.log(`🔑 Firebase Credentials gefunden: ${file}`);
      break;
    }
  }
  
  if (credentialFile) {
    credential = admin.credential.cert(credentialFile);
  } else {
    credential = admin.credential.applicationDefault();
  }
  
  admin.initializeApp({
    credential: credential,
    projectId: 'ressourceutilization'
  });
}

const db = admin.firestore();

async function fixDuplicateOliver() {
  try {
    console.log('🔧 Behebe Oliver Duplikat-Problem...');
    
    // Lade alle Oliver-Dokumente
    const utilizationQuery = db.collection('utilizationData').where('email', '==', 'oliver.koss@adesso.de');
    const snapshot = await utilizationQuery.get();
    
    console.log(`📄 Gefundene Dokumente: ${snapshot.size}`);
    
    let adminDoc = null;
    let fuehrungskraftDoc = null;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`📋 Dokument ${doc.id}: systemRole = ${data.systemRole}`);
      
      if (data.systemRole === 'admin') {
        adminDoc = { id: doc.id, ...data };
      } else if (data.systemRole === 'führungskraft') {
        fuehrungskraftDoc = { id: doc.id, ...data };
      }
    });
    
    if (adminDoc && fuehrungskraftDoc) {
      console.log('🗑️ Lösche das Führungskraft-Dokument...');
      await db.collection('utilizationData').doc(fuehrungskraftDoc.id).delete();
      console.log(`✅ Dokument ${fuehrungskraftDoc.id} gelöscht`);
      
      console.log('✅ Admin-Dokument bleibt bestehen:', adminDoc.id);
      
    } else if (fuehrungskraftDoc && !adminDoc) {
      console.log('🔄 Aktualisiere Führungskraft-Dokument zu Admin...');
      await db.collection('utilizationData').doc(fuehrungskraftDoc.id).update({
        systemRole: 'admin',
        hasSystemAccess: true,
        roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleAssignedBy: 'duplicate-fix'
      });
      console.log(`✅ Dokument ${fuehrungskraftDoc.id} zu Admin aktualisiert`);
      
    } else {
      console.log('ℹ️ Keine Duplikate gefunden oder bereits bereinigt');
    }
    
    // Verifikation
    console.log('\n🔍 Verifikation:');
    const verifySnapshot = await utilizationQuery.get();
    console.log(`📊 Anzahl Dokumente nach Bereinigung: ${verifySnapshot.size}`);
    
    if (!verifySnapshot.empty) {
      const data = verifySnapshot.docs[0].data();
      console.log(`🎯 Verbleibendes Dokument: systemRole = ${data.systemRole}`);
    }
    
    console.log('\n🎉 Duplikat-Problem behoben!');
    console.log('🔄 Bitte lade die App neu und melde dich erneut an.');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

fixDuplicateOliver();
