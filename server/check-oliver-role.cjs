/**
 * Prüft Oliver Koss' aktuelle Rolle in der Datenbank
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

async function checkOliverRole() {
  try {
    console.log('🔍 Prüfe Oliver Koss\' Rolle in der Datenbank...');
    
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
      console.log('✅ Oliver gefunden:');
      console.log('📧 E-Mail:', oliverDoc.email);
      console.log('👤 Person:', oliverDoc.person);
      console.log('🔑 System-Rolle:', oliverDoc.systemRole);
      console.log('🚪 System-Zugriff:', oliverDoc.hasSystemAccess);
      console.log('⏰ Rolle zugewiesen am:', oliverDoc.roleAssignedAt);
      console.log('👨‍💼 Zugewiesen von:', oliverDoc.roleAssignedBy);
      
      // Prüfe auch in users Collection
      console.log('\n🔍 Prüfe auch users Collection...');
      const usersSnapshot = await db.collection('users').where('email', '==', 'oliver.koss@adesso.de').get();
      
      if (!usersSnapshot.empty) {
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          console.log('👤 User-Dokument gefunden:');
          console.log('📧 E-Mail:', userData.email);
          console.log('🔑 System-Rolle:', userData.systemRole);
          console.log('🚪 System-Zugriff:', userData.hasSystemAccess);
        });
      } else {
        console.log('❌ Kein User-Dokument in users Collection gefunden');
      }
      
    } else {
      console.log('❌ Oliver Koss nicht in utilizationData gefunden');
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

checkOliverRole();
