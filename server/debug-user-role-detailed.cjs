/**
 * Debug: Detaillierte Rolle-Analyse für alle Benutzer
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Service Account Key suchen
const possibleKeyFiles = [
  'ressourceutilization-firebase-adminsdk-fbsvc-e8129f7d59.json',
  'ressourceutilization-service-account.json', 
  'firebase-admin-key.json'
];

let serviceAccountPath = null;
for (const keyFile of possibleKeyFiles) {
  const fullPath = path.join(__dirname, '..', keyFile);
  if (fs.existsSync(fullPath)) {
    serviceAccountPath = fullPath;
    console.log(`✅ Service Account gefunden: ${keyFile}`);
    break;
  }
}

if (!admin.apps.length) {
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'ressourceutilization'
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'ressourceutilization'
    });
  }
}

const db = admin.firestore();

async function debugAllUserRoles() {
  console.log('🔍 DETAILLIERTE BENUTZER-ROLLEN ANALYSE');
  console.log('=' .repeat(60));
  
  try {
    // 1. Alle Benutzer aus utilizationData
    console.log('\n📊 UTILIZATION DATA COLLECTION:');
    const utilizationSnapshot = await db.collection('utilizationData').get();
    
    const utilizationUsers = [];
    utilizationSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        utilizationUsers.push({
          id: doc.id,
          email: data.email,
          systemRole: data.systemRole,
          hasSystemAccess: data.hasSystemAccess,
          person: data.person
        });
      }
    });
    
    console.log(`Gefunden: ${utilizationUsers.length} Benutzer`);
    utilizationUsers.forEach(user => {
      console.log(`  📧 ${user.email}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Role: ${user.systemRole}`);
      console.log(`     Access: ${user.hasSystemAccess}`);
      console.log(`     Person: ${user.person}`);
      console.log('');
    });
    
    // 2. Alle Benutzer aus users Collection
    console.log('\n👥 USERS COLLECTION:');
    const usersSnapshot = await db.collection('users').get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        email: data.email,
        role: data.role,
        displayName: data.displayName
      });
    });
    
    console.log(`Gefunden: ${users.length} Benutzer`);
    users.forEach(user => {
      console.log(`  📧 ${user.email || 'Keine E-Mail'}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Name: ${user.displayName}`);
      console.log('');
    });
    
    // 3. Spezifische Analyse für Oliver
    console.log('\n🎯 OLIVER SPEZIFISCHE ANALYSE:');
    const oliverEmail = 'oliver.koss@adesso.de';
    
    // Suche in utilizationData
    const oliverUtilQuery = await db.collection('utilizationData')
      .where('email', '==', oliverEmail)
      .get();
      
    console.log(`Oliver in utilizationData: ${oliverUtilQuery.docs.length} Dokumente`);
    oliverUtilQuery.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  Dokument ${index + 1}:`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     Role: ${data.systemRole}`);
      console.log(`     Access: ${data.hasSystemAccess}`);
      console.log(`     Person: ${data.person}`);
    });
    
    // 4. Simuliere App-Logik
    console.log('\n🔄 SIMULIERE APP-LOGIK:');
    if (!oliverUtilQuery.empty) {
      const firstDoc = oliverUtilQuery.docs[0];
      const userData = firstDoc.data();
      console.log(`App würde laden: Dokument ID ${firstDoc.id}`);
      console.log(`App würde setzen: role = "${userData.systemRole}"`);
      console.log(`App würde prüfen: hasSystemAccess = ${userData.hasSystemAccess}`);
      
      if (userData.hasSystemAccess && userData.systemRole) {
        console.log(`✅ App-Ergebnis: Rolle "${userData.systemRole}" zugewiesen`);
      } else {
        console.log(`❌ App-Ergebnis: Rolle "unknown" zugewiesen`);
      }
    } else {
      console.log(`❌ App-Ergebnis: Keine Daten gefunden, Rolle "unknown"`);
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

debugAllUserRoles();



