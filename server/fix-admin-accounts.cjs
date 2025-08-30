/**
 * Fix: Entferne Admin-Rechte von falschen Accounts
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

async function fixAdminAccounts() {
  console.log('🔧 ADMIN-ACCOUNTS KORRIGIEREN');
  console.log('=' .repeat(50));
  
  try {
    // 1. Finde alle Admin-Accounts in users Collection
    const usersSnapshot = await db.collection('users').get();
    
    const adminUsers = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'admin') {
        adminUsers.push({
          id: doc.id,
          email: data.email,
          role: data.role,
          displayName: data.displayName
        });
      }
    });
    
    console.log(`\n📊 Gefundene Admin-Accounts in users: ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`  📧 ${user.email || 'Keine E-Mail'} (ID: ${user.id})`);
    });
    
    // 2. Korrigiere falsche Admin-Accounts
    const correctAdminEmail = 'oliver.koss@adesso.de';
    
    for (const user of adminUsers) {
      if (user.email !== correctAdminEmail) {
        console.log(`\n🚨 KORRIGIERE: ${user.email || user.id}`);
        console.log(`   Ändere Rolle von "admin" zu "user"`);
        
        await db.collection('users').doc(user.id).update({
          role: 'user'
        });
        
        console.log(`   ✅ Rolle geändert`);
      } else {
        console.log(`\n✅ KORREKT: ${user.email} bleibt Admin`);
      }
    }
    
    // 3. Überprüfe utilizationData Collection
    console.log(`\n📊 ÜBERPRÜFE UTILIZATION DATA:`);
    const utilizationQuery = await db.collection('utilizationData')
      .where('systemRole', '==', 'admin')
      .get();
      
    console.log(`Admin-Accounts in utilizationData: ${utilizationQuery.docs.length}`);
    utilizationQuery.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  📧 ${data.email} (ID: ${doc.id})`);
      
      if (data.email !== correctAdminEmail) {
        console.log(`  🚨 WARNUNG: Falscher Admin in utilizationData!`);
      }
    });
    
    console.log('\n✅ Admin-Accounts korrigiert!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

fixAdminAccounts();



