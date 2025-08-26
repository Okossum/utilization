/**
 * Setzt Oliver Koss als Administrator in BEIDEN Collections
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin initialisieren (falls noch nicht geschehen)
if (!admin.apps.length) {
  let credential;
  
  // Suche nach Firebase Service Account Dateien
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
    console.log('⚠️ Keine lokale Credential-Datei gefunden, verwende Application Default Credentials');
    credential = admin.credential.applicationDefault();
  }
  
  admin.initializeApp({
    credential: credential,
    projectId: 'ressourceutilization'
  });
}

const db = admin.firestore();

async function fixOliverAdmin() {
  try {
    console.log('🔧 Setze Oliver als Admin in BEIDEN Collections...');
    
    // 1. Aktualisiere users Collection
    console.log('📝 Aktualisiere users Collection...');
    const usersSnapshot = await db.collection('users').where('email', '==', 'oliver.koss@adesso.de').get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      await userDoc.ref.update({
        systemRole: 'admin',
        hasSystemAccess: true,
        roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleAssignedBy: 'manual-admin-fix'
      });
      console.log('✅ users Collection aktualisiert');
    } else {
      // Erstelle User-Dokument falls nicht vorhanden
      await db.collection('users').add({
        email: 'oliver.koss@adesso.de',
        systemRole: 'admin',
        hasSystemAccess: true,
        roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleAssignedBy: 'manual-admin-fix'
      });
      console.log('✅ Neues User-Dokument erstellt');
    }
    
    // 2. Aktualisiere utilizationData Collection (zur Sicherheit)
    console.log('📝 Aktualisiere utilizationData Collection...');
    const utilizationSnapshot = await db.collection('utilizationData').get();
    let oliverDoc = null;
    
    utilizationSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.person === 'Koss, Oliver' || data.email === 'oliver.koss@adesso.de') {
        oliverDoc = { id: doc.id, ...data };
      }
    });
    
    if (oliverDoc) {
      await db.collection('utilizationData').doc(oliverDoc.id).update({
        systemRole: 'admin',
        hasSystemAccess: true,
        roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleAssignedBy: 'manual-admin-fix'
      });
      console.log('✅ utilizationData Collection aktualisiert');
    }
    
    console.log('\n🎉 Oliver Koss ist jetzt in BEIDEN Collections als Administrator eingerichtet!');
    console.log('🔄 Bitte lade die App neu und melde dich erneut an.');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

fixOliverAdmin();
