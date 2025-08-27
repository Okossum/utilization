import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase-Konfiguration
// Diese Werte müssen in einer .env-Datei oder über Umgebungsvariablen gesetzt werden
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase-App initialisieren
const app = initializeApp(firebaseConfig);

// Firestore-Datenbank-Instanz
export const db = getFirestore(app);
export const auth = getAuth(app);

// Emulator-Konfiguration für Entwicklung
if (import.meta.env.DEV && !import.meta.env.VITE_USE_PRODUCTION_FIREBASE) {
  try {
    // Firestore Emulator
    if (!db._delegate._databaseId.projectId.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    
    // Auth Emulator  
    if (!auth.config.apiKey.includes('demo-')) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    
    console.log('🔥 Firebase Emulators connected');
  } catch (error) {
    console.log('⚠️ Emulators already connected or not available');
  }
}

export default app;
