/**
 * Analysiert wie die Oliver-Dokumente entstanden sind
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

async function analyzeDocumentCreation() {
  try {
    console.log('🔍 ANALYSE DER DOKUMENT-ERSTELLUNG');
    console.log('=' .repeat(50));
    
    // Schaue dir das verbleibende Admin-Dokument an
    console.log('\n📄 Verbleibendes Admin-Dokument:');
    const adminDoc = await db.collection('utilizationData').doc('oliver_koss_adesso_de').get();
    
    if (adminDoc.exists) {
      const data = adminDoc.data();
      console.log(`📋 Dokument-ID: ${adminDoc.id}`);
      console.log(`📧 E-Mail: ${data.email}`);
      console.log(`👤 Person: ${data.person}`);
      console.log(`🔑 systemRole: ${data.systemRole}`);
      console.log(`🚪 hasSystemAccess: ${data.hasSystemAccess}`);
      console.log(`⏰ roleAssignedAt: ${data.roleAssignedAt}`);
      console.log(`👨‍💼 roleAssignedBy: ${data.roleAssignedBy}`);
      
      // Analysiere alle Felder
      console.log('\n🔍 Alle Felder im Dokument:');
      Object.keys(data).forEach(key => {
        console.log(`   ${key}: ${typeof data[key]} = ${data[key]}`);
      });
    }
    
    // Schaue nach Mustern in anderen Dokumenten
    console.log('\n🔍 Muster-Analyse anderer Dokumente:');
    const allDocs = await db.collection('utilizationData').limit(5).get();
    
    allDocs.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📄 Beispiel-Dokument ${index + 1}:`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   ID-Typ: ${doc.id.length > 30 ? 'Auto-generiert (Hash)' : 'Custom ID'}`);
      console.log(`   E-Mail: ${data.email || 'keine'}`);
      console.log(`   Person: ${data.person || 'keine'}`);
    });
    
    console.log('\n💡 ERKLÄRUNG:');
    console.log('🔸 Hash-IDs (lang): Automatisch von Firestore generiert');
    console.log('🔸 Custom-IDs (kurz): Manuell gesetzt, oft basierend auf E-Mail');
    console.log('🔸 Unterstriche: Ersetzen Punkte, da Firestore-IDs keine Punkte erlauben');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

analyzeDocumentCreation();
