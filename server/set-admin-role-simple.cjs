// Script zum Setzen der Admin-Rolle für oliver.koss@adesso.de
// Verwendet die bestehende Firebase-Konfiguration

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = require('firebase/firestore');

// Firebase-Konfiguration (aus der bestehenden App)
const firebaseConfig = {
  apiKey: "AIzaSyBxqoqLdBJqNJNEqFZWQXFGOGGOGGOGOGG", // Placeholder - wird aus Umgebung geladen
  authDomain: "utilization-dashboard.firebaseapp.com",
  projectId: "utilization-dashboard",
  storageBucket: "utilization-dashboard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setAdminRole() {
  try {
    console.log('🔍 Suche nach oliver.koss@adesso.de in utilizationData...');
    
    // Suche nach dem Dokument mit der E-Mail
    const q = query(
      collection(db, 'utilizationData'),
      where('email', '==', 'oliver.koss@adesso.de')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Keine Dokumente mit oliver.koss@adesso.de gefunden');
      return;
    }
    
    // Update das erste gefundene Dokument
    const docSnap = snapshot.docs[0];
    const docRef = doc(db, 'utilizationData', docSnap.id);
    
    console.log('📋 Gefundenes Dokument:', docSnap.id);
    console.log('📋 Aktuelle Daten:', docSnap.data());
    
    // Setze Admin-Rolle
    await updateDoc(docRef, {
      systemRole: 'admin',
      hasSystemAccess: true,
      roleAssignedBy: 'system-script',
      roleAssignedAt: serverTimestamp(),
      lastRoleUpdate: serverTimestamp()
    });
    
    console.log('✅ Admin-Rolle erfolgreich gesetzt für oliver.koss@adesso.de');
    console.log('🎭 Neue Rolle: admin');
    console.log('🔓 System-Zugriff: true');
    
  } catch (error) {
    console.error('❌ Fehler beim Setzen der Admin-Rolle:', error);
  } finally {
    process.exit(0);
  }
}

setAdminRole();
