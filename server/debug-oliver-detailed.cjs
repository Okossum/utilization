/**
 * Detailliertes Debugging für Oliver Koss
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

async function debugOliverDetailed() {
  try {
    console.log('🔍 DETAILLIERTES DEBUGGING FÜR OLIVER KOSS');
    console.log('=' .repeat(50));
    
    // 1. Suche in utilizationData mit exakter E-Mail
    console.log('\n1️⃣ Suche in utilizationData mit E-Mail: oliver.koss@adesso.de');
    const utilizationQuery = db.collection('utilizationData').where('email', '==', 'oliver.koss@adesso.de');
    const utilizationSnapshot = await utilizationQuery.get();
    
    if (!utilizationSnapshot.empty) {
      utilizationSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📄 Dokument ${index + 1}:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   E-Mail: ${data.email}`);
        console.log(`   Person: ${data.person}`);
        console.log(`   systemRole: ${data.systemRole}`);
        console.log(`   hasSystemAccess: ${data.hasSystemAccess}`);
        console.log(`   roleAssignedAt: ${data.roleAssignedAt}`);
        console.log(`   roleAssignedBy: ${data.roleAssignedBy}`);
      });
    } else {
      console.log('❌ Keine Dokumente mit E-Mail oliver.koss@adesso.de gefunden');
    }
    
    // 2. Suche alle Dokumente mit "Koss" im Namen
    console.log('\n2️⃣ Suche alle Dokumente mit "Koss" im Namen:');
    const allDocsSnapshot = await db.collection('utilizationData').get();
    let kossDocuments = [];
    
    allDocsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.person && data.person.toLowerCase().includes('koss')) {
        kossDocuments.push({ id: doc.id, ...data });
      }
    });
    
    if (kossDocuments.length > 0) {
      kossDocuments.forEach((doc, index) => {
        console.log(`📄 Koss-Dokument ${index + 1}:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   E-Mail: ${doc.email}`);
        console.log(`   Person: ${doc.person}`);
        console.log(`   systemRole: ${doc.systemRole}`);
        console.log(`   hasSystemAccess: ${doc.hasSystemAccess}`);
      });
    } else {
      console.log('❌ Keine Dokumente mit "Koss" gefunden');
    }
    
    // 3. Prüfe users Collection
    console.log('\n3️⃣ Prüfe users Collection:');
    const usersSnapshot = await db.collection('users').where('email', '==', 'oliver.koss@adesso.de').get();
    
    if (!usersSnapshot.empty) {
      usersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`👤 User-Dokument ${index + 1}:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   E-Mail: ${data.email}`);
        console.log(`   systemRole: ${data.systemRole}`);
        console.log(`   hasSystemAccess: ${data.hasSystemAccess}`);
      });
    } else {
      console.log('❌ Keine User-Dokumente gefunden');
    }
    
    // 4. Teste die exakte Query die die App verwendet
    console.log('\n4️⃣ Teste exakte App-Query:');
    console.log('Query: collection("utilizationData").where("email", "==", "oliver.koss@adesso.de")');
    
    const appQuery = db.collection('utilizationData').where('email', '==', 'oliver.koss@adesso.de');
    const appSnapshot = await appQuery.get();
    
    console.log(`Anzahl gefundener Dokumente: ${appSnapshot.size}`);
    
    if (!appSnapshot.empty) {
      const userData = appSnapshot.docs[0].data();
      console.log('🎯 App würde folgende Daten laden:');
      console.log(`   systemRole: ${userData.systemRole}`);
      console.log(`   hasSystemAccess: ${userData.hasSystemAccess}`);
      console.log(`   Rolle würde sein: ${userData.hasSystemAccess && userData.systemRole ? userData.systemRole : 'unknown'}`);
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

debugOliverDetailed();
