# 🏗️ Komponenten-Hierarchie Diagramm

> **Projekt:** Ressource Utilization  
> **Erstellt:** $(date)  
> **Zweck:** Visualisierung der Komponenten-Struktur und Abhängigkeiten

---

## 📊 **DIAGRAMM-ÜBERSICHT**

Das Diagramm zeigt die vollständige Hierarchie aller aktiv genutzten React-Komponenten in der Anwendung.

### 🎨 **FARB-LEGENDE**

| Farbe | Bedeutung | Beispiel |
|-------|-----------|----------|
| 🔵 **Blau** | Hauptansichten | UtilizationReportView, EmployeeOverview |
| 🟠 **Orange (gestrichelt)** | Modals/Popups | AdminUserModal, ExcelUploadModal |
| 🟣 **Lila** | Cards/UI-Elemente | EmployeeCard, KpiCard |
| 🟢 **Grün** | Filter/Controls | PersonFilterBar, MultiSelectFilter |
| 🟡 **Gelb** | Demo-Komponenten | ProjectRoleDemo, ProjectSkillDemo |

---

## 🏠 **ROOT-EBENE**

```
App.tsx (Hauptanwendung)
├── AppHeader (Navigation & Settings)
├── LoginForm (Anmeldung)
├── 5 Hauptansichten
└── Demo-Komponenten
```

---

## 📊 **HAUPTANSICHTEN**

### 1️⃣ **UtilizationReportView** - "Auslastung & Vorblick"
**Komplexeste Komponente mit 8 Unterkomponenten:**

```
UtilizationReportView
├── PersonFilterBar (Personen Filter)
├── KpiCardsGrid (KPI Dashboard)
│   ├── KpiCard (Ø Auslastung Rückblick)
│   ├── KpiCard (Ø Auslastung Vorblick)
│   ├── KpiCard (>100% Überauslastung)
│   └── KpiCard (Fehlende Werte)
├── UtilizationTrendChart (Trend Diagramm)
├── MultiSelectFilter (Dropdown Filter)
├── UtilizationComment (Kommentare)
├── SalesOpportunities (Verkaufschancen)
├── ScopeFilterDropdown (Bereichsfilter)
└── StatusLabelSelector (Status Auswahl)
```

**Zugehörige Modals:**
- AuslastungView (Modal: Auslastungsansicht)
- EinsatzplanView (Modal: Einsatzplan)
- AssignmentEditorModal (Modal: Zuweisungs-Editor)
- PlanningModal (Modal: Planungs-Editor)

### 2️⃣ **EmployeeOverviewDashboard** - "Mitarbeiter"
**Strukturierte Mitarbeiter-Verwaltung:**

```
EmployeeOverviewDashboard
├── EmployeeCard (Mitarbeiter Karte)
│   └── ProjectDetail (Projekt Details)
├── EmployeeListView (Listen Ansicht)
└── EmployeeTable (Tabellen Ansicht)
```

### 3️⃣ **SalesView** - "Sales Übersicht"
**Verkaufs-orientierte Ansicht:**

```
SalesView
├── EmployeeOverview (Mitarbeiter Sales-Kontext)
│   ├── EmployeeCard (Mitarbeiter Karte)
│   └── EmployeeTable (Mitarbeiter Tabelle)
└── SalesFilterBar (Sales Filter)
```

### 4️⃣ **EmployeeDetailView** - "Mitarbeiterdetails"
**Einzelansicht für Mitarbeiter**

### 5️⃣ **Projects Area** - "Projekte"
**Projekt-Management-Bereich:**

```
Projects Area
├── OverviewPage (Projekt Übersicht)
│   ├── ProjectHistoryCard (Projekt Historie)
│   │   ├── PlannedProjectsModal (Modal: Geplante Projekte)
│   │   └── ProjectCreationModal (Modal: Projekt Erstellung)
│   └── ProjectRolesCard (Projekt Rollen)
├── ProjectManagementDashboard (Projekt Dashboard)
└── ProjectCreationWizard (Projekt Assistent)
```

---

## ⚙️ **MANAGEMENT-BEREICH**

Alle Management-Funktionen sind über **AppHeader → Settings** erreichbar:

### 📤 **Daten Upload**
- ExcelUploadModal → ModernUploadPanel
- AdminDataUploadModal

### 🛠️ **Verwaltung**
- RoleManagement (Rollen Verwaltung)
- TechnicalSkillManagement (Fähigkeiten Verwaltung)
- CustomerProjectsManager (Kundenprojekte)
- AuslastungserklaerungManagement (Auslastungserklärungen)

### 📥 **Import-Funktionen**
- TechnicalSkillBulkUploadModal (Skills Import)
- RoleTaskBulkUploadModal (Rollen Import)

### 👨‍💼 **Admin-Bereich**
- AdminUserManagementModal (Admin Benutzer)
- EmployeeSelectionModal (Mitarbeiter Auswahl)

---

## 🎯 **NAVIGATION-GUIDE**

### **Wie finde ich Komponenten in der App?**

| Komponenten-Typ | Zugriff über | Beispiel |
|------------------|--------------|----------|
| **Hauptansichten** | Obere Navigation | "Auslastung & Vorblick" → UtilizationReportView |
| **Cards/Filter** | Eingebettet in Hauptansichten | PersonFilterBar in UtilizationReportView |
| **Modals** | Buttons in Hauptansichten | "Einsatzplan" Button → EinsatzplanView |
| **Management** | Settings-Menü (⚙️) | Settings → Management → Rollen |
| **Import** | Settings-Menü (⚙️) | Settings → Import → Skills |

---

## 🔍 **ERKENNTNISSE**

### **Komplexitäts-Ranking:**
1. **UtilizationReportView** - 12 Komponenten (8 direkte + 4 Modals)
2. **Projects Area** - 7 Komponenten (3 Hauptbereiche + 4 Cards/Modals)
3. **EmployeeOverviewDashboard** - 4 Komponenten (3 Ansichten + 1 Detail)
4. **SalesView** - 4 Komponenten (2 Übersichten + 1 Filter)
5. **AppHeader** - 9 Management-Modals

### **Zentrale Komponenten:**
- **EmployeeCard** - Wird in 3 verschiedenen Kontexten verwendet
- **KpiCard** - 4 verschiedene Instanzen in KpiCardsGrid
- **ProjectDetail** - Eingebettet in EmployeeCard

### **Modal-Verteilung:**
- **UtilizationReportView:** 4 Modals
- **AppHeader:** 9 Management-Modals
- **Projects:** 2 Projekt-Modals
- **App-Level:** 3 globale Modals

---

## 📋 **VERWENDUNG**

**Für Entwickler:**
- Verstehen der Komponenten-Abhängigkeiten
- Refactoring-Planung
- Code-Navigation

**Für Projektmanager:**
- Überblick über App-Struktur
- Feature-Mapping
- Komplexitäts-Einschätzung

**Für Designer:**
- UI-Hierarchie verstehen
- Konsistenz-Checks
- User-Journey-Mapping

---

*Dieses Diagramm dient als zentrale Referenz für die Komponenten-Architektur der Ressource Utilization Anwendung.*
