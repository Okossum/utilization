# EmployeeDetailView - Vollständige Komponenten-Analyse

## 🎯 Übersicht der Datenquellen

### **HAUPTKOMPONENTE: EmployeeDetailView**

**Datenquellen:**
- ✅ **utilizationData Hub** (über `useUtilizationData()`)
- ❌ **Legacy APIs** für Skills/Rollen (teilweise noch aktiv)
- ❌ **employeeDossiers Collection** (für Formulardaten)

---

## 📊 **DETAILLIERTE KOMPONENTEN-ANALYSE**

### **1. ROLLEN-MANAGEMENT**

#### **RoleSelectionModal** ✅ **FIXED**
- **Status:** ✅ **Nutzt jetzt utilizationData Hub**
- **Laden:** `getPersonSkillsRolesFromHub(employeeName)`
- **Speichern:** `addRoleToUtilizationData(employeeName, role)`
- **Fallback:** Legacy API `/api/employee-roles/${employeeId}`

#### **EmployeeRoleAssignment** ❌ **NOCH LEGACY**
- **Status:** ❌ **Nutzt noch Legacy APIs**
- **Laden:** `GET /api/employee-roles/${employeeId}`
- **Update:** `PUT /api/employee-roles/${employeeId}/${assignmentId}`
- **Delete:** `DELETE /api/employee-roles/${employeeId}/${assignmentId}`
- **Problem:** Speichert nicht in utilizationData Hub

---

### **2. TECHNICAL SKILLS MANAGEMENT**

#### **TechnicalSkillSelectionModal** ❌ **NOCH LEGACY**
- **Status:** ❌ **Nutzt noch Legacy APIs**
- **Skills laden:** `GET /api/technical-skills`
- **Assigned laden:** `GET /api/employee-technical-skills/${employeeId}`
- **Speichern:** `POST /api/employee-technical-skills/${employeeId}`
- **Problem:** Speichert nicht in utilizationData Hub

#### **EmployeeSkillAssignment** ❌ **NOCH LEGACY**
- **Status:** ❌ **Nutzt noch Legacy APIs**
- **Skills laden:** `GET /api/technical-skills`
- **Assigned laden:** `GET /api/employee-technical-skills/${employeeId}`
- **Problem:** Speichert nicht in utilizationData Hub

---

### **3. SOFT SKILLS MANAGEMENT**

#### **SoftSkillSelectionModal** ❌ **NOCH LEGACY**
- **Status:** ❌ **Nutzt noch Legacy APIs**
- **Skills laden:** `GET /api/soft-skills`
- **Assigned laden:** `GET /api/employees/${employeeId}/soft-skills`
- **Speichern:** `POST /api/employees/${employeeId}/soft-skills`
- **Problem:** Speichert nicht in utilizationData Hub

---

### **4. PROJEKT-MANAGEMENT**

#### **ProjectCreationModal** ✅ **NUTZT HUB**
- **Status:** ✅ **Speichert in utilizationData Hub**
- **Speichern:** `projectReferences` Array in utilizationData

#### **ProjectHistoryList/Section** ✅ **NUTZT HUB**
- **Status:** ✅ **Lädt aus utilizationData Hub**
- **Datenquelle:** `utilizationData.projectReferences`

---

### **5. PERSONEN-DATEN**

#### **Basis-Informationen** ✅ **NUTZT HUB**
- **Status:** ✅ **Lädt aus utilizationData Hub**
- **Datenquelle:** `personMeta` (aus utilizationData)
- **Felder:** Name, LBS, Bereich, CC, Team, Email

#### **Formulardaten** ❌ **NOCH LEGACY**
- **Status:** ❌ **Nutzt noch employeeDossiers Collection**
- **Speichern:** `DatabaseService.saveEmployeeDossier()`
- **Problem:** Separate Collection statt utilizationData Hub

---

## 🚨 **IDENTIFIZIERTE PROBLEME**

### **Problem 1: Inkonsistente Datenquellen**
```typescript
// EmployeeDetailView lädt Skills aus utilizationData Hub:
setAssignedSkills(personData.technicalSkills || []);
setAssignedSoftSkills(personData.softSkills || []);
setAssignedRoles(personData.assignedRoles || []);

// ABER: Skills-Modals speichern über Legacy APIs:
// TechnicalSkillSelectionModal → POST /api/employee-technical-skills/${employeeId}
// SoftSkillSelectionModal → POST /api/employees/${employeeId}/soft-skills
// EmployeeRoleAssignment → PUT /api/employee-roles/${employeeId}
```

### **Problem 2: Daten werden nicht synchronisiert**
- **Speichern:** Legacy APIs → Separate Collections
- **Anzeigen:** utilizationData Hub
- **Ergebnis:** Neue Skills/Rollen sind nicht sichtbar

### **Problem 3: Duplikate möglich**
- Skills können mehrfach zugewiesen werden
- Keine Konsistenz-Prüfung zwischen Hub und Legacy APIs

---

## 🔧 **LÖSUNGSPLAN**

### **Schritt 1: Technical Skills auf Hub umstellen**
```typescript
// TechnicalSkillSelectionModal anpassen:
import { addTechnicalSkillToUtilizationData, getPersonSkillsRolesFromHub } from '../../lib/utilization-hub-services';

// Laden:
const { technicalSkills } = await getPersonSkillsRolesFromHub(employeeName);

// Speichern:
await addTechnicalSkillToUtilizationData(employeeName, skillData);
```

### **Schritt 2: Soft Skills auf Hub umstellen**
```typescript
// SoftSkillSelectionModal anpassen:
import { addSoftSkillToUtilizationData, getPersonSkillsRolesFromHub } from '../../lib/utilization-hub-services';

// Laden:
const { softSkills } = await getPersonSkillsRolesFromHub(employeeName);

// Speichern:
await addSoftSkillToUtilizationData(employeeName, skillData);
```

### **Schritt 3: EmployeeRoleAssignment auf Hub umstellen**
```typescript
// EmployeeRoleAssignment anpassen:
import { updateRoleInUtilizationData, removeRoleFromUtilizationData } from '../../lib/utilization-hub-services';

// Update:
await updateRoleInUtilizationData(employeeName, roleId, { level: newLevel });

// Delete:
await removeRoleFromUtilizationData(employeeName, roleId);
```

### **Schritt 4: EmployeeSkillAssignment entfernen**
- **Grund:** Redundant zu TechnicalSkillSelectionModal
- **Aktion:** Component entfernen oder auf Hub umstellen

---

## 📋 **PRIORITÄTEN**

### **Hoch (Sofort beheben):**
1. ✅ **RoleSelectionModal** - BEREITS BEHOBEN
2. ❌ **TechnicalSkillSelectionModal** - KRITISCH
3. ❌ **SoftSkillSelectionModal** - KRITISCH

### **Mittel (Nach Skills):**
4. ❌ **EmployeeRoleAssignment** - Update/Delete Funktionen
5. ❌ **EmployeeSkillAssignment** - Redundanz auflösen

### **Niedrig (Optional):**
6. ❌ **Formulardaten** - In utilizationData Hub integrieren

---

## 🎯 **ERWARTETES ERGEBNIS**

Nach der Umstellung:
- ✅ **Konsistente Datenquelle:** Alle Skills/Rollen aus utilizationData Hub
- ✅ **Sofortige Sichtbarkeit:** Neue Skills/Rollen erscheinen sofort
- ✅ **Keine Duplikate:** Konsistenz-Prüfung vor Zuweisung
- ✅ **Einheitliche API:** Alle CRUD-Operationen über utilization-hub-services
- ✅ **Performance:** Weniger API-Aufrufe, bessere Caching-Möglichkeiten

---

## 🔍 **DEBUGGING-TIPPS**

### **Problem identifizieren:**
```typescript
// In Browser Console prüfen:
console.log('🎯 Skills/Rollen aus utilizationData Hub geladen:', {
  technicalSkills: personData.technicalSkills?.length || 0,
  softSkills: personData.softSkills?.length || 0,
  assignedRoles: personData.assignedRoles?.length || 0
});
```

### **Datenquelle prüfen:**
```typescript
// Welche API wird verwendet?
// ✅ Hub: "🔄 Lade zugewiesene Rollen aus utilizationData Hub"
// ❌ Legacy: "GET /api/employee-roles/..."
```

### **Synchronisation testen:**
1. Skill/Rolle zuweisen
2. Modal schließen
3. Prüfen ob in EmployeeDetailView sichtbar
4. Falls nicht: Falsche Datenquelle verwendet
