# 🚀 Implementierungsplan: Erweiterte Projekt-Typen

## 📋 Übersicht

Erweiterung des bestehenden Projekthistorie-Systems um **3 Projekt-Typen**:
- **Historische Projekte** (bereits implementiert)
- **Geplante Projekte** (neu)
- **Aktive Projekte** (neu, aus geplanten mit 100% Wahrscheinlichkeit)

---

## 🎯 Projekt-Hierarchie & Datenfluss

```
Historisch ──────────────────────► (Dokumentation)
                                   
Geplant ──► [100% Wahrscheinlichkeit] ──► Aktiv
   ├── Reguläres Kundenprojekt (Dropdown)
   └── JIRA Ticket (andere LoB, Freitext)
```

---

## 🗄️ Datenbank-Struktur

### Erweiterte `ProjectHistoryItem` Interface

```typescript
interface ProjectHistoryItem {
  id: string;
  
  // ===== BASIS-FELDER (alle Typen) =====
  customer: string;
  projectName: string;
  roles: ProjectRole[];
  skills: ProjectSkill[];
  
  // ===== TYP-KLASSIFIZIERUNG =====
  projectType: 'historical' | 'planned' | 'active';
  projectSource?: 'regular' | 'jira'; // nur bei planned/active
  
  // ===== GEPLANT/AKTIV-SPEZIFISCHE FELDER =====
  probability?: number; // 0-100%
  dailyRate?: number; // €/Tag
  startDate?: string; // ISO Date
  endDate?: string; // ISO Date
  internalContact?: string; // Mitarbeiter-ID
  customerContact?: string; // Freitext
  jiraTicketId?: string; // JIRA-12345
  
  // ===== HISTORISCH-SPEZIFISCHE FELDER =====
  duration?: string; // "6 Monate" (nur bei historical)
  activities?: string[]; // ["Task 1", "Task 2"] (nur bei historical)
  
  // ===== META-DATEN =====
  createdAt: Date;
  updatedAt: Date;
  employeeId: string; // Zuordnung zum Mitarbeiter
}
```

---

## 🎨 UI-Komponenten Struktur

### 1. **Neues `ProjectCreationModal.tsx`**

**Ersetzt**: `ProjectHistoryEditorModal.tsx` (wird umbenannt/erweitert)

**Schritt-für-Schritt Wizard:**

#### **Schritt 1: Projekt-Typ wählen**
```tsx
<div className="space-y-4">
  <h3>Welchen Projekt-Typ möchten Sie erstellen?</h3>
  <div className="flex space-x-4">
    <label className="flex items-center">
      <input type="radio" name="projectType" value="historical" />
      <span>Historisches Projekt</span>
    </label>
    <label className="flex items-center">
      <input type="radio" name="projectType" value="planned" />
      <span>Geplantes Projekt</span>
    </label>
  </div>
</div>
```

#### **Schritt 2: Projekt-Quelle (nur bei "Geplant")**
```tsx
{projectType === 'planned' && (
  <div className="space-y-4">
    <h3>Projekt-Quelle</h3>
    <div className="flex space-x-4">
      <label className="flex items-center">
        <input type="radio" name="projectSource" value="regular" />
        <span>Reguläres Kundenprojekt</span>
      </label>
      <label className="flex items-center">
        <input type="radio" name="projectSource" value="jira" />
        <span>JIRA Ticket (andere LoB)</span>
      </label>
    </div>
  </div>
)}
```

#### **Schritt 3: Grunddaten (conditional)**

**Bei Historisch:**
```tsx
<input type="text" placeholder="Kunde (Freitext)" />
<input type="text" placeholder="Projektname" />
```

**Bei Geplant → Regulär:**
```tsx
<CustomerManager 
  customers={customers}
  value={selectedCustomer}
  onChange={setSelectedCustomer}
  allowCreate={true}
/>
<input type="text" placeholder="Projektname" />
```

**Bei Geplant → JIRA:**
```tsx
<input type="text" placeholder="Kunde (andere LoB)" />
<input type="text" placeholder="Projektname" />
<input type="text" placeholder="JIRA Ticket ID (z.B. PROJ-1234)" />
```

#### **Schritt 4: Projekt-Details (nur bei "Geplant")**
```tsx
{projectType === 'planned' && (
  <>
    <div>
      <label>Wahrscheinlichkeit</label>
      <select value={probability} onChange={setProbability}>
        <option value={25}>25% - Interessent</option>
        <option value={50}>50% - Qualifiziert</option>
        <option value={75}>75% - Verhandlung</option>
        <option value={100}>100% - Beauftragt</option>
      </select>
    </div>
    
    <input type="number" placeholder="Tagessatz (€)" />
    
    <div className="grid grid-cols-2 gap-4">
      <input type="date" placeholder="Startdatum" />
      <input type="date" placeholder="Enddatum" />
    </div>
    
    <EmployeeDropdown 
      label="Interner Ansprechpartner"
      value={internalContact}
      onChange={setInternalContact}
      filterBy={['bereich', 'cc', 'team']}
    />
    
    <input type="text" placeholder="Kunden-Ansprechpartner" />
  </>
)}
```

#### **Schritt 5: Rollen & Skills (alle Typen)**
```tsx
// Bestehende ProjectRoleSelectionModal & ProjectSkillSelectionModal
<ProjectRoleSelectionModal />
<ProjectSkillSelectionModal />
```

---

## 🔧 Neue Komponenten

### 1. **`EmployeeDropdown.tsx`**

**Zweck**: Mitarbeiter-Auswahl mit Filter-Funktionen

```tsx
interface EmployeeDropdownProps {
  value?: string;
  onChange: (employeeId: string) => void;
  filterBy?: ('bereich' | 'cc' | 'team')[];
  label?: string;
}

export function EmployeeDropdown({ value, onChange, filterBy = [], label }: EmployeeDropdownProps) {
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    bereich: '',
    cc: '',
    team: ''
  });
  
  // Filter-Logic basierend auf mitarbeiter Collection
  const filteredEmployees = employees.filter(emp => {
    if (filters.bereich && emp.bereich !== filters.bereich) return false;
    if (filters.cc && emp.cc !== filters.cc) return false;
    if (filters.team && emp.team !== filters.team) return false;
    return true;
  });
  
  return (
    <div className="space-y-2">
      {label && <label>{label}</label>}
      
      {/* Filter-Dropdowns */}
      {filterBy.includes('bereich') && (
        <select value={filters.bereich} onChange={e => setFilters(prev => ({...prev, bereich: e.target.value}))}>
          <option value="">Alle Bereiche</option>
          {/* Unique bereiche aus employees */}
        </select>
      )}
      
      {/* Mitarbeiter-Dropdown */}
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Mitarbeiter auswählen</option>
        {filteredEmployees.map(emp => (
          <option key={emp.id} value={emp.id}>
            {emp.displayName} ({emp.bereich})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 2. **Erweiterte `EmployeeDetailView.tsx`**

**UI-Layout Anpassungen:**

```tsx
// Mittlere Spalte
<div className="space-y-4">
  {/* Aktive Projekte */}
  <div className="bg-green-50 rounded-lg p-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-lg font-semibold flex items-center">
        <Play className="w-5 h-5 mr-2 text-green-600" />
        Aktive Projekte
      </h3>
      <button onClick={() => handleAddProject('planned')}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
    
    {activeProjects.map(project => (
      <ProjectCard key={project.id} project={project} type="active" />
    ))}
  </div>
  
  {/* Geplante Projekte */}
  <div className="bg-blue-50 rounded-lg p-4">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-lg font-semibold flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-blue-600" />
        Geplante Projekte
      </h3>
      <button onClick={() => handleAddProject('planned')}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
    
    {plannedProjects.map(project => (
      <ProjectCard key={project.id} project={project} type="planned" />
    ))}
  </div>
</div>

// Rechte Spalte (unverändert)
<div className="bg-orange-50 rounded-lg p-4">
  <h3>Projektvergangenheit</h3>
  {/* Bestehende historische Projekte */}
</div>
```

### 3. **`ProjectCard.tsx`**

**Zweck**: Einheitliche Darstellung aller Projekt-Typen

```tsx
interface ProjectCardProps {
  project: ProjectHistoryItem;
  type: 'historical' | 'planned' | 'active';
  onEdit?: (project: ProjectHistoryItem) => void;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, type, onEdit, onDelete }: ProjectCardProps) {
  const getStatusColor = () => {
    switch (type) {
      case 'active': return 'bg-green-100 border-green-200';
      case 'planned': return 'bg-blue-100 border-blue-200';
      case 'historical': return 'bg-orange-100 border-orange-200';
    }
  };
  
  const getProbabilityBadge = () => {
    if (type !== 'planned' || !project.probability) return null;
    
    const colors = {
      25: 'bg-red-100 text-red-800',
      50: 'bg-yellow-100 text-yellow-800',
      75: 'bg-blue-100 text-blue-800',
      100: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[project.probability]}`}>
        {project.probability}%
      </span>
    );
  };
  
  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold">{project.projectName}</h4>
        <div className="flex space-x-1">
          {getProbabilityBadge()}
          <button onClick={() => onEdit?.(project)}>
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete?.(project.id)}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center">
          <Building className="w-4 h-4 mr-1 text-gray-500" />
          {project.customer}
        </div>
        
        {project.dailyRate && (
          <div className="flex items-center">
            <Euro className="w-4 h-4 mr-1 text-gray-500" />
            {project.dailyRate}€/Tag
          </div>
        )}
        
        {project.jiraTicketId && (
          <div className="flex items-center">
            <Ticket className="w-4 h-4 mr-1 text-gray-500" />
            {project.jiraTicketId}
          </div>
        )}
        
        {project.internalContact && (
          <div className="flex items-center">
            <User className="w-4 h-4 mr-1 text-gray-500" />
            {getEmployeeName(project.internalContact)}
          </div>
        )}
      </div>
      
      {/* Rollen & Skills */}
      <div className="mt-2 flex flex-wrap gap-1">
        {project.roles?.map(role => (
          <span key={role.id} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
            {role.name}
          </span>
        ))}
        {project.skills?.map(skill => (
          <span key={skill.id} className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs">
            {skill.name} ({skill.level}★)
          </span>
        ))}
      </div>
    </div>
  );
}
```

---

## ⚙️ Business Logic

### 1. **Automatische Überführung: Geplant → Aktiv**

```tsx
// In ProjectCreationModal.tsx
const handleProbabilityChange = async (newProbability: number) => {
  setProbability(newProbability);
  
  // Automatische Überführung bei 100%
  if (newProbability === 100 && projectType === 'planned') {
    const updatedProject = {
      ...project,
      probability: 100,
      projectType: 'active' as const
    };
    
    await DatabaseService.saveEmployeeDossier(employeeId, {
      ...dossierData,
      projectHistory: dossierData.projectHistory.map(p => 
        p.id === project.id ? updatedProject : p
      )
    });
    
    // Toast-Benachrichtigung
    showToast('success', `Projekt "${project.projectName}" wurde zu aktivem Projekt überführt!`);
    
    // UI-Update
    onSave(updatedProject);
    onClose();
  }
};
```

### 2. **Daten-Filterung nach Projekt-Typ**

```tsx
// In EmployeeDetailView.tsx
const projectsByType = useMemo(() => {
  const projects = dossierData?.projectHistory || [];
  
  return {
    historical: projects.filter(p => p.projectType === 'historical'),
    planned: projects.filter(p => p.projectType === 'planned'),
    active: projects.filter(p => p.projectType === 'active')
  };
}, [dossierData?.projectHistory]);
```

### 3. **CustomerContext Integration**

```tsx
// In ProjectCreationModal.tsx
import { useCustomers } from '../../contexts/CustomerContext';

export function ProjectCreationModal({ ... }) {
  const { customers, addCustomer } = useCustomers();
  
  const handleCustomerSelect = (customerName: string) => {
    setSelectedCustomer(customerName);
  };
  
  const handleNewCustomer = async (customerName: string) => {
    await addCustomer(customerName);
    setSelectedCustomer(customerName);
  };
  
  return (
    <div>
      {projectSource === 'regular' ? (
        <CustomerManager
          customers={customers}
          value={selectedCustomer}
          onChange={handleCustomerSelect}
          onAddCustomer={handleNewCustomer}
          allowCreate={true}
          showManagement={false}
        />
      ) : (
        <input 
          type="text" 
          placeholder="Kunde (andere LoB)"
          value={selectedCustomer}
          onChange={e => setSelectedCustomer(e.target.value)}
        />
      )}
    </div>
  );
}
```

---

## 📁 Datei-Struktur

### Neue Dateien:
```
src/components/generated/
├── ProjectCreationModal.tsx          # Hauptmodal (ersetzt ProjectHistoryEditorModal)
├── ProjectCard.tsx                   # Einheitliche Projekt-Darstellung
├── EmployeeDropdown.tsx              # Mitarbeiter-Auswahl mit Filtern
└── ProbabilitySelector.tsx           # Wahrscheinlichkeits-Auswahl

src/types/
└── projects.ts                       # Erweiterte TypeScript Interfaces
```

### Geänderte Dateien:
```
src/components/generated/
├── EmployeeDetailView.tsx            # UI-Layout für 3 Projekt-Typen
└── UtilizationReportView.tsx         # Navigation zu neuem Modal

src/lib/
└── types.ts                          # Erweiterte ProjectHistoryItem Interface
```

---

## 🚀 Implementierungs-Reihenfolge

### **Phase 1: Datenstruktur & Types**
1. ✅ Erweiterte `ProjectHistoryItem` Interface definieren
2. ✅ TypeScript Types für neue Felder hinzufügen
3. ✅ Datenbank-Schema dokumentieren

### **Phase 2: Basis-Komponenten**
4. ✅ `EmployeeDropdown.tsx` erstellen
5. ✅ `ProjectCard.tsx` erstellen
6. ✅ `ProbabilitySelector.tsx` erstellen

### **Phase 3: Haupt-Modal**
7. ✅ `ProjectCreationModal.tsx` erstellen
8. ✅ Schritt-für-Schritt Wizard implementieren
9. ✅ CustomerManager Integration
10. ✅ Conditional Rendering für Projekt-Typen

### **Phase 4: UI-Integration**
11. ✅ `EmployeeDetailView.tsx` Layout anpassen
12. ✅ 3-Spalten Design für verschiedene Projekt-Typen
13. ✅ Navigation und Button-Integration

### **Phase 5: Business Logic**
14. ✅ Automatische Überführung Geplant → Aktiv
15. ✅ Datenbank-Speicherung erweitern
16. ✅ Toast-Benachrichtigungen

### **Phase 6: Testing & Polish**
17. ✅ Vollständige Workflow-Tests
18. ✅ UI/UX Verbesserungen
19. ✅ Performance-Optimierung
20. ✅ Dokumentation vervollständigen

---

## 🎯 Erfolgskriterien

### **Funktional:**
- ✅ Historische, geplante und aktive Projekte können erstellt werden
- ✅ Automatische Überführung bei 100% Wahrscheinlichkeit
- ✅ JIRA Ticket vs. reguläre Projekt-Unterscheidung
- ✅ CustomerManager Integration für Dropdown-Auswahl
- ✅ Mitarbeiter-Filter für interne Ansprechpartner

### **Technical:**
- ✅ Einheitliche Datenstruktur mit `projectType` Feld
- ✅ Wiederverwendbare Komponenten (`ProjectCard`, `EmployeeDropdown`)
- ✅ Bestehende CustomerContext Integration
- ✅ Konsistente DatabaseService Nutzung

### **UX:**
- ✅ Intuitive Schritt-für-Schritt Projekt-Erstellung
- ✅ Klare visuelle Unterscheidung der Projekt-Typen
- ✅ Kompakte, übersichtliche Darstellung im Employee Detail View
- ✅ Erfolgreiche Toast-Benachrichtigungen

---

## 📝 Offene Fragen

1. **Wahrscheinlichkeits-Stufen**: Feste Werte (25%, 50%, 75%, 100%) oder freie Eingabe?
2. **JIRA Integration**: Nur Text-ID oder echte API-Verbindung?
3. **Mitarbeiter-Filter**: Welche Felder sind in der `mitarbeiter` Collection verfügbar?
4. **Projekt-Archivierung**: Sollen abgeschlossene aktive Projekte automatisch zu historischen werden?

---

*Erstellt am: $(date)*
*Status: Bereit zur Implementierung*
*Nächster Schritt: Phase 1 - Datenstruktur & Types*
