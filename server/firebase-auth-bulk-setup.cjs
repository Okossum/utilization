/**
 * Firebase Authentication Bulk Setup
 * 
 * Erstellt Firebase Auth Accounts für alle Benutzer mit System-Zugriff
 * und sendet Passwort-Reset E-Mails
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
const auth = admin.auth();

// Standard-Passwort (kann über --password überschrieben werden)
let DEFAULT_PASSWORD = 'TempPass2024!';

// Passwort aus Kommandozeilen-Argumenten
const passwordIndex = process.argv.findIndex(arg => arg === '--password');
if (passwordIndex !== -1 && process.argv[passwordIndex + 1]) {
  DEFAULT_PASSWORD = process.argv[passwordIndex + 1];
  console.log('🔑 Benutzerdefiniertes Passwort wird verwendet');
} else {
  console.log('🔑 Standard-Passwort wird verwendet:', DEFAULT_PASSWORD);
}

async function loadUsersWithSystemAccess() {
  console.log('🔍 Lade Benutzer mit System-Zugriff...');
  
  try {
    const snapshot = await db.collection('utilizationData').get();
    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtere Benutzer mit System-Zugriff und gültiger E-Mail
    const systemUsers = allUsers.filter(user => 
      user.email && 
      user.email.includes('@') && 
      user.hasSystemAccess === true && 
      user.systemRole && 
      user.systemRole !== 'unknown'
    );
    
    console.log(`📊 Gefunden: ${systemUsers.length} Benutzer mit System-Zugriff`);
    console.log(`📋 Rollen-Verteilung:`);
    
    const roleStats = {};
    systemUsers.forEach(user => {
      roleStats[user.systemRole] = (roleStats[user.systemRole] || 0) + 1;
    });
    
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count} Benutzer`);
    });
    
    return systemUsers;
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Benutzer:', error);
    throw error;
  }
}

async function checkExistingAuthUsers(systemUsers) {
  console.log('\n🔍 Prüfe bestehende Firebase Auth Accounts...');
  
  const existingUsers = [];
  const newUsers = [];
  
  for (const user of systemUsers) {
    try {
      const existingUser = await auth.getUserByEmail(user.email);
      existingUsers.push({
        ...user,
        authUid: existingUser.uid,
        authExists: true
      });
      console.log(`✅ Bereits vorhanden: ${user.person} (${user.email})`);
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        newUsers.push({
          ...user,
          authExists: false
        });
        console.log(`➕ Neu zu erstellen: ${user.person} (${user.email})`);
      } else {
        console.error(`❌ Fehler bei ${user.email}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Ergebnis:`);
  console.log(`  - Bestehende Accounts: ${existingUsers.length}`);
  console.log(`  - Neue Accounts benötigt: ${newUsers.length}`);
  
  return { existingUsers, newUsers };
}

async function createFirebaseAuthAccounts(newUsers, dryRun = true) {
  if (dryRun) {
    console.log(`\n🔍 DRY RUN - Würde ${newUsers.length} Auth-Accounts erstellen:`);
    
    newUsers.forEach(user => {
      console.log(`  📧 ${user.person} (${user.email}) - Rolle: ${user.systemRole}`);
    });
    
    return { created: 0, errors: 0, details: [] };
  }
  
  console.log(`\n✅ ECHTE AUSFÜHRUNG - Erstelle ${newUsers.length} Auth-Accounts...`);
  
  let created = 0;
  let errors = 0;
  const details = [];
  
  for (const user of newUsers) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        displayName: user.person,
        emailVerified: false,
        disabled: false
      });
      
      console.log(`✅ Account erstellt: ${user.person} (${user.email}) - UID: ${userRecord.uid}`);
      details.push(`✅ ${user.person} - ${user.systemRole} - UID: ${userRecord.uid}`);
      created++;
      
      // Aktualisiere utilizationData mit Firebase UID
      await db.collection('utilizationData').doc(user.id).update({
        firebaseUid: userRecord.uid,
        authAccountCreated: admin.firestore.FieldValue.serverTimestamp(),
        authAccountCreatedBy: 'bulk-setup-script'
      });
      
    } catch (error) {
      console.error(`❌ Fehler bei ${user.person}:`, error.message);
      details.push(`❌ ${user.person} - Fehler: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Ergebnis: ${created} erstellt, ${errors} Fehler`);
  return { created, errors, details };
}

async function generatePasswordResetLinks(users) {
  console.log(`\n📧 Generiere Passwort-Reset Links für ${users.length} Benutzer...`);
  
  let sent = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      const resetLink = await auth.generatePasswordResetLink(user.email, {
        url: 'https://your-app-domain.com/login', // Anpassen an deine Domain
        handleCodeInApp: false
      });
      
      console.log(`📧 Reset-Link generiert für: ${user.person}`);
      console.log(`   Link: ${resetLink}`);
      
      // Hier könntest du den Link per E-Mail versenden
      // await sendPasswordResetEmail(user.email, user.person, resetLink);
      
      sent++;
      
    } catch (error) {
      console.error(`❌ Fehler bei Reset-Link für ${user.person}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Reset-Links: ${sent} generiert, ${errors} Fehler`);
  return { sent, errors };
}

async function exportUserCredentials(users) {
  console.log('\n📄 Exportiere Benutzer-Credentials...');
  
  const csvHeader = 'Name,E-Mail,Rolle,Standard-Passwort,System-Zugriff,Firebase-UID';
  const csvRows = users.map(user => 
    `"${user.person}","${user.email}","${user.systemRole}","${DEFAULT_PASSWORD}","${user.hasSystemAccess}","${user.firebaseUid || 'Neu zu erstellen'}"`
  );
  
  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  // Schreibe CSV-Datei
  const fs = require('fs');
  const filename = `firebase_auth_users_${new Date().toISOString().split('T')[0]}.csv`;
  
  fs.writeFileSync(filename, csvContent, 'utf8');
  console.log(`✅ Benutzer-Liste exportiert: ${filename}`);
  
  return filename;
}

async function main() {
  try {
    console.log('🚀 Firebase Auth Bulk Setup gestartet...\n');
    
    // Gruppen-Filter aus Kommandozeilen-Argumenten
    const allowedRoles = [];
    if (process.argv.includes('--admin')) allowedRoles.push('admin');
    if (process.argv.includes('--führungskraft')) allowedRoles.push('führungskraft');
    if (process.argv.includes('--sales')) allowedRoles.push('sales');
    if (process.argv.includes('--user')) allowedRoles.push('user');
    
    // Standard: Admin und Führungskraft wenn keine Rolle spezifiziert
    if (allowedRoles.length === 0) {
      allowedRoles.push('admin', 'führungskraft');
      console.log('📋 Keine Rollen spezifiziert - Standard: Admin + Führungskraft');
    }
    
    console.log('🎯 Ausgewählte Rollen:', allowedRoles.join(', '));
    
    // Schritt 1: Lade Benutzer mit System-Zugriff
    const allSystemUsers = await loadUsersWithSystemAccess();
    
    // Filtere nach ausgewählten Rollen
    const systemUsers = allSystemUsers.filter(user => 
      allowedRoles.includes(user.systemRole)
    );
    
    console.log(`\n🔍 Gefilterte Auswahl: ${systemUsers.length} von ${allSystemUsers.length} Benutzern`);
    
    if (systemUsers.length === 0) {
      console.log('❌ Keine Benutzer mit System-Zugriff gefunden.');
      return;
    }
    
    // Schritt 2: Prüfe bestehende Auth-Accounts
    const { existingUsers, newUsers } = await checkExistingAuthUsers(systemUsers);
    
    // Schritt 3: Exportiere Benutzer-Liste
    await exportUserCredentials([...existingUsers, ...newUsers]);
    
    // Schritt 4: Dry Run (Vorschau)
    if (newUsers.length > 0) {
      await createFirebaseAuthAccounts(newUsers, true);
      
      console.log('\n❓ Möchten Sie die Auth-Accounts erstellen?');
      console.log('   Beispiele:');
      console.log('   node firebase-auth-bulk-setup.cjs --create --admin --führungskraft');
      console.log('   node firebase-auth-bulk-setup.cjs --create --sales --user --password "MeinSicheresPasswort123!"');
      console.log('   node firebase-auth-bulk-setup.cjs --create --admin --führungskraft --sales --user --password "CustomPass2024!"');
      
      // Schritt 5: Echte Ausführung (nur mit --create Flag)
      if (process.argv.includes('--create')) {
        console.log('\n⚠️  ECHTE AUSFÜHRUNG gestartet...');
        const result = await createFirebaseAuthAccounts(newUsers, false);
        
        if (result.created > 0) {
          console.log('\n🎉 Auth-Accounts erfolgreich erstellt!');
          
          // Schritt 6: Passwort-Reset Links generieren
          if (process.argv.includes('--send-reset')) {
            await generatePasswordResetLinks(newUsers);
          } else {
            console.log('\n💡 Tipp: Fügen Sie --send-reset hinzu um Passwort-Reset E-Mails zu versenden');
          }
        }
      }
    } else {
      console.log('\n✅ Alle Benutzer haben bereits Firebase Auth Accounts.');
    }
    
  } catch (error) {
    console.error('💥 Fehler beim Ausführen:', error);
    process.exit(1);
  }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  main();
}

module.exports = {
  loadUsersWithSystemAccess,
  checkExistingAuthUsers,
  createFirebaseAuthAccounts,
  generatePasswordResetLinks,
  exportUserCredentials
};
