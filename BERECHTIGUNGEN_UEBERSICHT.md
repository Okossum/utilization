# 🔐 Berechtigungen Übersicht - Aktualisiert

## **Rollenbasierte Zugriffskontrolle (RBAC)**

### **📋 Rollen-Matrix**

| **Rolle** | **Views** | **Settings** | **Besonderheiten** |
|-----------|-----------|--------------|-------------------|
| **🔴 Admin** | ✅ Alle (Utilization, Employees, Sales) | ✅ Alle Settings | Vollzugriff, kann Benutzer verwalten |
| **🟡 Führungskraft** | ✅ Alle (Utilization, Employees, Sales) | ✅ Nur Excel Upload | Kann alle Views sehen, aber nur Daten hochladen |
| **🟢 Sales** | ✅ Nur Sales View | ❌ Keine Settings | Nur Sales-spezifische Ansicht |
| **🔵 User** | ✅ Nur Utilization | ❌ Keine Settings | Nur eigene Auslastung (später) |
| **⚫ Unknown** | ❌ Keine Views | ❌ Keine Settings | Kein Zugriff |

---

## **🎯 View-Berechtigungen**

### **Navigation Buttons (AppHeader)**
```typescript
// Utilization View
{canAccessView('utilization') && (
  <button>Auslastung</button>
)}

// Employees View  
{canAccessView('employees') && (
  <button>Mitarbeiter</button>
)}

// Sales View
{canAccessView('sales') && (
  <button>Sales View</button>
)}
```

### **Wer sieht welche Views?**
- **Admin**: ✅ Utilization + ✅ Employees + ✅ Sales
- **Führungskraft**: ✅ Utilization + ✅ Employees + ✅ Sales  
- **Sales**: ❌ Utilization + ❌ Employees + ✅ Sales
- **User**: ✅ Utilization + ❌ Employees + ❌ Sales

---

## **⚙️ Settings-Berechtigungen**

### **Daten & Upload Sektion**
```typescript
// Nur für Führungskräfte und Admins
{canAccessSettings('excel-upload') && (
  <div>Excel Upload</div>
)}
```

### **Management Sektion**
```typescript
// Nur für Admins
{canAccessSettings('user-management') && (
  <div>
    - Rollen-Verwaltung
    - Tech Skills
    - Soft Skills  
    - Benutzerverwaltung
    - Firebase Auth Setup
  </div>
)}
```

### **Wer sieht welche Settings?**

#### **🔴 Admin (Vollzugriff)**
- ✅ **Daten & Upload**: Excel Upload
- ✅ **Management**: Alle Management-Funktionen
- ✅ **Benutzerverwaltung**: User-Rollen verwalten
- ✅ **Firebase Auth**: Account-Erstellung
- ✅ **Allgemeine Einstellungen**: Benutzereinstellungen

#### **🟡 Führungskraft (Eingeschränkt)**
- ✅ **Daten & Upload**: Excel Upload
- ❌ **Management**: Kein Zugriff
- ❌ **Benutzerverwaltung**: Kein Zugriff
- ❌ **Firebase Auth**: Kein Zugriff
- ✅ **Allgemeine Einstellungen**: Benutzereinstellungen

#### **🟢 Sales (Minimal)**
- ❌ **Daten & Upload**: Kein Zugriff
- ❌ **Management**: Kein Zugriff
- ❌ **Benutzerverwaltung**: Kein Zugriff
- ❌ **Firebase Auth**: Kein Zugriff
- ❌ **Settings**: Komplett kein Settings-Zugriff

#### **🔵 User (Minimal)**
- ❌ **Alle Settings**: Kein Settings-Zugriff

---

## **🔧 Technische Implementierung**

### **Permissions.ts - Zentrale Matrix**
```typescript
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    views: ['utilization', 'employees', 'sales'],
    settings: ['all'], // Vollzugriff
    canManageUsers: true,
    canUploadData: true,
    canViewAllEmployees: true
  },
  führungskraft: {
    views: ['utilization', 'employees', 'sales'], // ALLE Views
    settings: ['excel-upload'], // Nur Excel Upload
    canManageUsers: false,
    canUploadData: true,
    canViewAllEmployees: true
  },
  sales: {
    views: ['sales'], // Nur Sales View
    settings: [], // Keine Settings
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  },
  user: {
    views: ['utilization'], // Nur Auslastung
    settings: [], // Keine Settings
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  }
};
```

### **Helper-Funktionen**
```typescript
// View-Zugriff prüfen
canAccessView(role, 'sales') // true für Admin, Führungskraft, Sales

// Settings-Zugriff prüfen  
canAccessSettings(role, 'excel-upload') // true für Admin, Führungskraft

// Management-Berechtigung
canManageUsers(role) // true nur für Admin
```

---

## **🎯 Anwendungsbeispiele**

### **Sales-Mitarbeiter**
- **Sieht**: Nur Sales View Button
- **Kann**: Nur Sales-Daten einsehen
- **Settings**: Komplett ausgeblendet

### **Führungskraft**  
- **Sieht**: Alle View Buttons (Utilization, Employees, Sales)
- **Kann**: Alle Daten einsehen + Excel Upload
- **Settings**: Nur "Daten & Upload" Sektion

### **Administrator**
- **Sieht**: Alle View Buttons
- **Kann**: Alles + Benutzerverwaltung + Firebase Auth
- **Settings**: Alle Sektionen verfügbar

---

## **🚀 Vorteile der neuen Struktur**

✅ **Klare Trennung**: Jede Rolle hat genau definierte Berechtigungen  
✅ **Sicherheit**: Keine versehentlichen Zugriffe auf falsche Bereiche  
✅ **Benutzerfreundlich**: UI zeigt nur relevante Optionen  
✅ **Wartbar**: Zentrale Berechtigungslogik in permissions.ts  
✅ **Erweiterbar**: Neue Rollen/Berechtigungen einfach hinzufügbar  

**Die Berechtigungen sind jetzt exakt nach deinen Anforderungen implementiert! 🎯**
