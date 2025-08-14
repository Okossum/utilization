# Firebase Setup für Resource Utilization App

## 🚀 Übersicht

Diese App wurde von localStorage auf Firebase Firestore migriert, um alle Daten in der Cloud zu speichern.

## 📋 Voraussetzungen

1. **Firebase-Projekt erstellen:**
   - Gehe zu [Firebase Console](https://console.firebase.google.com/)
   - Erstelle ein neues Projekt oder wähle ein bestehendes
   - Aktiviere Firestore Database

2. **Firestore Database einrichten:**
   - Erstelle eine neue Firestore Database
   - Wähle "Start in test mode" für Entwicklung
   - Wähle einen Standort (z.B. europe-west3)

## 🔑 Firebase-Konfiguration

1. **Projekt-Einstellungen abrufen:**
   - Klicke auf das Zahnrad-Symbol → Projekt-Einstellungen
   - Scrolle zu "Deine Apps" und klicke auf das Web-Symbol (</>)
   - Registriere die App mit einem Namen (z.B. "resource-utilization-web")

2. **Konfigurationsdaten kopieren:**
   - Kopiere die Konfigurationsdaten aus dem Firebase-Setup

3. **Umgebungsvariablen setzen:**
   - Kopiere `env.example` zu `.env.local`
   - Fülle alle Firebase-Werte aus:

```bash
# .env.local
VITE_FIREBASE_API_KEY=deine_api_key_hier
VITE_FIREBASE_AUTH_DOMAIN=dein_projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dein_projekt_id
VITE_FIREBASE_STORAGE_BUCKET=dein_projekt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 🗄️ Firestore Collections

Die App erstellt automatisch folgende Collections:

- **`uploaded_files`** - Hochgeladene Excel-Dateien
- **`utilization_data`** - Verarbeitete Auslastungsdaten
- **`planned_engagements`** - Geplante Engagements
- **`person_status`** - Status von Personen
- **`person_travel_readiness`** - Reisebereitschaft
- **`customers`** - Kundenliste

## 🔒 Sicherheitsregeln

Für die Entwicklung sind die Standard-Testregeln ausreichend. Für Produktion:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Erlaube Lese- und Schreibzugriff für alle
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🚀 App starten

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Umgebungsvariablen setzen:**
   - Erstelle `.env.local` mit deinen Firebase-Daten

3. **App starten:**
   ```bash
   npm run dev
   ```

## 📊 Daten-Migration

Die App lädt automatisch alle Daten aus Firebase beim Start. Falls du bestehende localStorage-Daten hast:

1. **Exportiere localStorage-Daten:**
   - Öffne die Browser-Entwicklertools
   - Gehe zu Application → Local Storage
   - Kopiere die relevanten Schlüssel

2. **Importiere in Firebase:**
   - Verwende die Firebase Console
   - Oder erweitere die App um einen Import-Button

## 🐛 Fehlerbehebung

### Häufige Probleme:

1. **"Firebase is not defined":**
   - Prüfe, ob alle Umgebungsvariablen gesetzt sind
   - Stelle sicher, dass `.env.local` existiert

2. **"Permission denied":**
   - Prüfe die Firestore-Sicherheitsregeln
   - Stelle sicher, dass die Datenbank im Testmodus ist

3. **"Network error":**
   - Prüfe deine Internetverbindung
   - Stelle sicher, dass Firestore für deine Region aktiviert ist

## 📱 Offline-Funktionalität

Firebase Firestore unterstützt Offline-Persistenz standardmäßig. Daten werden lokal zwischengespeichert und synchronisiert, sobald die Verbindung wiederhergestellt ist.

## 🔄 Updates

Bei Updates der App werden alle Daten automatisch in der neuen Struktur gespeichert. Die App ist abwärtskompatibel mit bestehenden Daten.
