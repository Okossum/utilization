# 📋 Komponenten-Analyse mit UI-Titeln

> **Erstellt am:** $(date)  
> **Zweck:** Vollständige Übersicht aller TSX-Komponenten mit ihren sichtbaren UI-Titeln zur besseren Navigation und Bereinigung

---

## 🎯 **ÜBERSICHT**

**Gesamt:** 108 TSX-Komponenten  
**Aktiv genutzt:** ~35 Komponenten  
**Potentiell ungenutzt:** ~73 Komponenten  

---

## 📱 **HAUPTNAVIGATION** (AppHeader.tsx)

Diese Titel sehen Sie in der oberen Navigation der App:

| UI-Titel | Komponente | Status |
|----------|------------|---------|
| **"Auslastung & Vorblick"** | `UtilizationReportView` | ✅ Aktiv |
| **"Mitarbeiter"** | `EmployeeOverviewDashboard` | ✅ Aktiv |
| **"Knowledge Library"** | `AuslastungCommentView` | ✅ Aktiv |
| **"Auslastung mit Kommentaren"** | `AuslastungCommentView` | ✅ Aktiv |
| **"Sales Übersicht"** | `SalesView` | ✅ Aktiv |
| **"Projekt Rollen Demo"** | `ProjectRoleTaskSelectorDemo` | ✅ Aktiv |
| **"Projekt Skills Demo"** | `ProjectSkillSelectorDemo` | ✅ Aktiv |
| **"Mitarbeiterdetails"** | `EmployeeDetailView` | ✅ Aktiv |
| **"Projekte"** | Projects-Bereich | ✅ Aktiv |

---

## 🏠 **HAUPTANSICHTEN MIT UI-ELEMENTEN**

### 📊 **Auslastung & Vorblick** (`UtilizationReportView`)

| UI-Element | Komponente | Beschreibung |
|------------|------------|--------------|
| **"Personen Filter"** | `PersonFilterBar` | Filter für Mitarbeiterauswahl |
| **"Ø Auslastung Rückblick (8 W)"** | `KpiCardsGrid` | KPI-Karte für historische Daten |
| **"Ø Auslastung Vorblick (4 W)"** | `KpiCardsGrid` | KPI-Karte für Prognose |
| **"⭐ >100 % (Anzahl Personen/Wochen)"** | `KpiCardsGrid` | Überauslastungs-Indikator |
| **"Anzahl fehlender Werte (ignoriert)"** | `KpiCardsGrid` | Datenqualitäts-Indikator |
| - | `MultiSelectFilter` | Verschiedene Dropdown-Filter |
| - | `UtilizationTrendChart` | Trend-Diagramme |
| - | `UtilizationComment` | Kommentar-Funktionen |
| - | `SalesOpportunities` | Verkaufschancen-Anzeige |
| - | `AssignmentEditorModal` | Zuweisungs-Editor |
| - | `ScopeFilterDropdown` | Bereichsfilter |
| - | `StatusLabelSelector` | Status-Auswahl |

### 👥 **Mitarbeiter** (`EmployeeOverviewDashboard`)

| UI-Element | Komponente | Beschreibung |
|------------|------------|--------------|
| **"Mitarbeiter Übersicht"** | - | Haupttitel der Seite |
| **"Zentrale Mitarbeiterverwaltung aus Stammdaten"** | - | Beschreibungstext |
| **"Mitarbeiter gesamt"** | - | Statistik-Karte |
| **"Aktive Mitarbeiter"** | - | Statistik-Karte |
| - | `EmployeeCard` | Einzelne Mitarbeiter-Karten |
| - | `EmployeeListView` | Listen-Ansicht |
| - | `EmployeeTable` | Tabellen-Ansicht |

### 👤 **Mitarbeiterdetails** (`EmployeeDetailView`)

| UI-Element | Komponente | Beschreibung |
|------------|------------|--------------|
| **"Mitarbeiterdetails"** | - | Haupttitel |
| **"Auslastung"** | - | Auslastungsbereich |
| **"Aktuelle Projekte"** | - | Projektbereich |
| **"Fähigkeiten"** | - | Skills-Bereich |
| **"Stärken/Schwächen"** | - | Performance-Bereich |

### 💼 **Sales Übersicht** (`SalesView`)

| UI-Element | Komponente | Beschreibung |
|------------|------------|--------------|
| - | `EmployeeOverview` | Mitarbeiter-Übersicht im Sales-Kontext |
| - | `SalesOpportunities` | Verkaufschancen |
| - | `SalesFilterBar` | Sales-spezifische Filter |

---

## ⚙️ **MANAGEMENT & ADMIN-BEREICH**

Diese Komponenten sind über das Settings-Menü (⚙️) erreichbar:

### 📤 **Daten Upload**

| UI-Titel | Komponente | Zugriff über |
|----------|------------|--------------|
| **"Excel Upload"** | `ExcelUploadModal` | Settings → Excel Upload |
| **"Admin Daten Upload"** | `AdminDataUploadModal` | Settings → Admin Upload |
| - | `ModernUploadPanel` | Wird von ExcelUploadModal verwendet |

### 🛠️ **Management**

| UI-Titel | Komponente | Zugriff über |
|----------|------------|--------------|
| **"Rollen Management"** | `RoleManagement` | Settings → Management → Rollen |
| **"Technische Fähigkeiten"** | `TechnicalSkillManagement` | Settings → Management → Skills |
| **"Kundenprojekte Management"** | `CustomerProjectsManager` | Settings → Management → Kunden |
| **"Auslastungserklärungen"** | `AuslastungserklaerungManagement` | Settings → Management → Erklärungen |
| - | `AdminUserManagementModal` | Admin-Benutzer-Verwaltung |

### 📥 **Import-Funktionen**

| UI-Titel | Komponente | Zugriff über |
|----------|------------|--------------|
| **"Technische Fähigkeiten Import"** | `TechnicalSkillBulkUploadModal` | Settings → Import → Skills |
| **"Rollen & Tasks Import"** | `RoleTaskBulkUploadModal` | Settings → Import → Rollen |

### 🔘 **Management-Buttons**

Diese Komponenten sind wahrscheinlich nur Buttons in der UI:

- `RoleTaskBulkUploadButton`
- `TechnicalSkillBulkUploadButton`
- `RoleManagementButton`
- `SkillManagementButton`
- `TechnicalSkillManagementButton`
- `CustomerProjectsManagerButton`

---

## 🚀 **PROJEKT-BEREICH**

Erreichbar über Hauptnavigation → "Projekte":

### 📋 **Projekt-Navigation**

| UI-Titel | Komponente | Beschreibung |
|----------|------------|--------------|
| **"Overview"** | `OverviewPage` | Projekt-Übersichtsseite |
| **"Projects"** | `ProjectManagementDashboard` | Projekt-Dashboard |
| **"Wizard"** | `ProjectCreationWizard` | Projekt-Erstellungs-Assistent |

### 🔧 **Projekt-Unterkomponenten**

Diese werden wahrscheinlich von den Hauptkomponenten verwendet:

- `projects/PlannedProjectsCard`
- `projects/ProjectHistoryCard`
- `projects/ProjectRolesCard`
- `projects/Header`
- `projects/FilterBar`
- `projects/EmployeeDataColumn`
- `projects/UtilizationColumn`

---

## ❌ **POTENTIELL UNGENUTZTE KOMPONENTEN**

Diese Komponenten haben **keine sichtbaren UI-Titel** und werden wahrscheinlich nicht verwendet:

### 🔍 **Definitiv zu prüfen:**

| Komponente | Grund | Empfehlung |
|------------|-------|------------|
| `EmployeeManagement` | Keine Imports gefunden | ⚠️ Prüfen/Löschen |
| `EmployeeDossierModal` | Keine UI-Titel | ⚠️ Prüfen/Löschen |
| `SimpleProjectList` | Keine Verwendung | ⚠️ Prüfen/Löschen |
| `ConsolidationAdminPanel` | Keine UI-Integration | ⚠️ Prüfen/Löschen |
| `KnowledgeUploadPanel` | Keine Verwendung | ⚠️ Prüfen/Löschen |
| `ProjectDetail` | Nur von anderen Komponenten importiert | 🤔 Prüfen |
| `JiraTicketsList` | Keine UI-Integration | ⚠️ Prüfen/Löschen |
| `ProjectOffersList` | Keine UI-Integration | ⚠️ Prüfen/Löschen |

### 📝 **Weitere ungenutzte Komponenten:**

**Skill/Role-Selektoren:**
- `ProjectSkillSelector` (nicht die Demo-Version)
- `ProjectRoleTaskSelector` (nicht die Demo-Version)
- `CreateTaskModal`
- `CreateRoleModal`
- `CreateEditSkillModal`
- `SkillSelector`
- `SkillDropdownWithAdd`
- `TechnicalSkillSelectionModal`
- `RoleSelectionModal`

**Employee-Editoren:**
- `EmployeeSkillAssignment`
- `EmployeeRoleAssignment`
- `EmployeeSkillsEditor`
- `EmployeeUploadModal`

**Projekt-Modals:**
- `projects/ProjectCreationModal`
- `projects/PlannedProjectsModal`
- `ProjectHistoryEditorModal`
- `AssignmentEditorModal`
- `PlanningModal`
- `PlanningCommentModal`

**Sonstige:**
- `TravelReadinessSelector`
- `SkillRating`
- `StarRating`
- `SkillManagement`
- `ProjectHistorySection`
- `ProjectHistoryList`
- `AssignmentsList`
- `PlannedEngagementEditor`
- `PlanningComment`
- `CustomerManagementPage`
- `CustomerManager`
- `ScopeSettingsModal`

### 🗂️ **Auskommentierte Komponenten:**

- `UtilizationChartSection` - In UtilizationReportView auskommentiert

---

## 🎯 **EMPFOHLENES BEREINIGUNGSVORGEHEN**

### **Phase 1 - Sichere Bereinigung (Sofort möglich)**

1. **Auskommentierte Komponenten entfernen:**
   - `UtilizationChartSection` (bereits auskommentiert)

2. **Offensichtlich ungenutzte Komponenten:**
   - `JiraTicketsList` (keine Integration)
   - `ProjectOffersList` (keine Integration)
   - `ConsolidationAdminPanel` (keine Integration)
   - `KnowledgeUploadPanel` (keine Integration)

### **Phase 2 - Tiefere Analyse erforderlich**

1. **Button-Komponenten validieren:**
   - Prüfen ob tatsächlich in UI verwendet
   - Eventuell konsolidieren

2. **Projekt-Unterkomponenten:**
   - Prüfen welche von Hauptkomponenten verwendet werden
   - Ungenutzte entfernen

3. **Management-Komponenten:**
   - Auf Redundanz prüfen
   - Ähnliche Funktionen zusammenfassen

### **Phase 3 - Strukturelle Bereinigung**

1. **Ordnerstruktur optimieren**
2. **Ähnliche Komponenten konsolidieren**
3. **Naming-Conventions vereinheitlichen**

---

## ✅ **NÄCHSTE SCHRITTE**

1. **Bestätigung:** Welche Komponenten sollen definitiv entfernt werden?
2. **Validierung:** Soll ich die Button-Komponenten auf tatsächliche Verwendung prüfen?
3. **Bereinigung:** Schritt-für-Schritt Durchführung mit Backup

---

*Dieses Dokument dient als Grundlage für die systematische Bereinigung der Komponenten-Struktur.*
