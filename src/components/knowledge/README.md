# Knowledge Library Uploader + View

Eine vollständige React/TypeScript-Komponente für die Verwaltung von Kategorien und Skills mit Import/Export und CRUD-Funktionalität.

## 🚀 Features

### **Upload & Import**
- ✅ **CSV/XLSX/XLS Support** - Drag & Drop oder Dateiauswahl
- ✅ **Idempotenter Import** - Keine Duplikate, bestehende Einträge werden aktualisiert
- ✅ **Vorschau** - Erste 10 Zeilen werden vor dem Import angezeigt
- ✅ **Validierung** - Überprüfung der Spalten und Datenqualität
- ✅ **Batch-Verarbeitung** - Verarbeitung in Chunks von 300 Operationen
- ✅ **Archivierung** - Optionale Archivierung fehlender Skills nach Upload

### **CRUD-Funktionalität**
- ✅ **Kategorien** - Erstellen, Bearbeiten, Löschen (Soft Delete), Wiederherstellen
- ✅ **Skills** - Erstellen, Bearbeiten, Löschen (Soft Delete), Wiederherstellen
- ✅ **Inline-Editing** - Direkte Bearbeitung in der Tabelle
- ✅ **Validierung** - Namenslänge (2-80 Zeichen), Duplikat-Prüfung

### **View & Filter**
- ✅ **Gruppierte Anzeige** - Skills nach Kategorien gruppiert
- ✅ **Suche** - Debounced Suche in Namen und Kategorien
- ✅ **Filter** - Nach Kategorie, Status, archiviert
- ✅ **Export** - CSV-Export der gefilterten Daten

## 📁 Dateistruktur

```
src/
├── components/knowledge/
│   ├── KnowledgeUploadAndView.tsx    # Hauptkomponente
│   └── README.md                      # Diese Datei
├── services/
│   └── knowledge.ts                   # Firestore Service-Funktionen
├── lib/
│   └── parseKnowledgeFile.ts         # CSV/XLSX Parser
└── types/
    └── knowledge.ts                   # TypeScript Typen
```

## 🛠️ Setup

### **1. Abhängigkeiten installieren**

```bash
npm install xlsx framer-motion lucide-react
# oder
yarn add xlsx framer-motion lucide-react
```

### **2. Firebase-Konfiguration**

Stellen Sie sicher, dass `src/lib/firebase.ts` korrekt konfiguriert ist:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Ihre Firebase-Konfiguration
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### **3. Firestore-Regeln**

Fügen Sie diese Regeln zu Ihren Firestore-Sicherheitsregeln hinzu:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Knowledge Library Collections
    match /knowledge_categories/{categoryId} {
      allow read, write: if request.auth != null;
    }
    
    match /knowledge_skills/{skillId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **4. Komponente einbinden**

```tsx
import { KnowledgeUploadAndView } from './components/knowledge/KnowledgeUploadAndView';

function App() {
  return (
    <div>
      <KnowledgeUploadAndView />
    </div>
  );
}
```

## 📊 Firestore-Schema

### **Knowledge Categories**
```typescript
/knowledge_categories/{categoryId}
{
  id: string;
  name: string;              // "Frameworks"
  nameLower: string;         // "frameworks" (für Suche)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted?: boolean;       // Soft Delete
}
```

### **Knowledge Skills**
```typescript
/knowledge_skills/{skillId}
{
  id: string;
  name: string;              // "Spring Boot"
  nameLower: string;         // "spring boot" (für Suche)
  categoryId: string;        // Referenz zur Kategorie
  categoryName: string;      // Denormalisiert für Performance
  status?: "Standard" | "Neu eingefügt";
  source?: "upload" | "manual";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDeleted?: boolean;       // Soft Delete
}
```

## 📤 Import-Format

### **Erwartete Spalten**
- **Kategorie** (erforderlich) - Name der Kategorie
- **Auswahl** (erforderlich) - Name des Skills
- **Status** (optional) - "Standard" oder "Neu eingefügt"

### **Beispiel CSV**
```csv
Kategorie,Auswahl,Status
Frameworks,Spring Boot,Standard
Frameworks,React,Neu eingefügt
Datenbanken,PostgreSQL,Standard
Cloud,AWS Lambda,Standard
```

### **Beispiel XLSX**
Gleiche Struktur wie CSV, aber in Excel-Format.

## 🔄 Import-Logik

### **Idempotenter Upsert**
1. **Kategorien**: Werden anhand von `nameLower` gesucht
   - Existiert → Update
   - Archiviert → Wiederherstellen + Update
   - Neu → Erstellen

2. **Skills**: Werden anhand von `categoryId + nameLower` gesucht
   - Existiert → Update
   - Archiviert → Wiederherstellen + Update
   - Neu → Erstellen

### **Archivierung (optional)**
- Wenn "Archive missing after upload" aktiviert ist
- Skills, die nicht im Import enthalten sind, werden archiviert
- Keine Hard-Deletes, nur Soft-Deletes

## 🎯 Verwendung

### **1. Upload-Tab**
- Datei auswählen (CSV/XLSX/XLS)
- Vorschau der ersten 10 Zeilen
- Import-Optionen konfigurieren
- Import starten

### **2. Verwalten-Tab**
- **Links**: Kategorien verwalten
  - Neue Kategorie erstellen
  - Bestehende bearbeiten/umbenennen
  - Löschen (Soft Delete)
  - Archivierte wiederherstellen

- **Rechts**: Skills verwalten
  - Neuen Skill erstellen
  - Bestehende bearbeiten
  - Löschen (Soft Delete)
  - Archivierte wiederherstellen

### **3. Anzeigen-Tab**
- Suche und Filter
- Gruppierte Anzeige nach Kategorien
- CSV-Export der gefilterten Daten

## 🧪 Tests

### **Service-Funktionen testen**
```typescript
import { 
  upsertCategoryByName, 
  listCategories,
  upsertSkill,
  listSkills 
} from '../services/knowledge';

// Kategorie erstellen
const category = await upsertCategoryByName('Test Kategorie');

// Skills auflisten
const skills = await listSkills({ categoryId: category.id });

// Kategorie umbenennen
await renameCategory(category.id, 'Neuer Name');
```

### **Parser testen**
```typescript
import { parseKnowledgeFile, validateImportRows } from '../lib/parseKnowledgeFile';

// Datei parsen
const rows = await parseKnowledgeFile(file);

// Validieren
const { valid, errors } = validateImportRows(rows);
```

## 🚨 Bekannte Einschränkungen

1. **XLSX-Support**: Benötigt die `xlsx`-Bibliothek
2. **Batch-Größe**: Import wird in Chunks von 300 Operationen verarbeitet
3. **Client-side Suche**: Suche erfolgt client-seitig (für v1 ausreichend)
4. **Dateigröße**: Empfohlen unter 10MB für optimale Performance

## 🔮 Zukünftige Verbesserungen

- [ ] **Server-side Suche** mit Firestore-Queries
- [ ] **Bulk-Operationen** für Kategorien und Skills
- [ ] **Import-Historie** mit Rollback-Funktionalität
- [ ] **Erweiterte Validierung** mit benutzerdefinierten Regeln
- [ ] **Drag & Drop** für Kategorien und Skills
- [ ] **Berechtigungssystem** für verschiedene Benutzerrollen

## 📝 Changelog

### **v1.0.0** (Aktuell)
- ✅ Vollständige CRUD-Funktionalität
- ✅ Idempotenter Import
- ✅ CSV/XLSX Support
- ✅ Soft Delete & Restore
- ✅ Gruppierte Anzeige
- ✅ Suche und Filter
- ✅ CSV-Export

## 🤝 Beitragen

1. Fork des Repositories
2. Feature-Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Änderungen committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request erstellen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.
