# 🏗️ Komponenten-Gesamtübersicht

> **Projekt:** Ressource Utilization  
> **Erstellt:** $(date)  
> **Zweck:** Vollständige Übersicht aller aktiven TSX-Komponenten mit UI-Titeln und Dateinamen

---

## 📊 **GESAMTÜBERSICHT**

Diese Dokumentation zeigt **alle aktiv genutzten React-Komponenten** mit:
- ✅ **TSX-Dateinamen** (z.B. `UtilizationReportView.tsx`)
- ✅ **UI-Titel** (z.B. "Auslastung & Vorblick")
- ✅ **Hierarchie** und Abhängigkeiten
- ✅ **Zugriffswege** in der App

---

## 🎨 **DIAGRAMM-LEGENDE**

| Stil | Bedeutung | Linienstärke | Beispiel |
|------|-----------|--------------|----------|
| 🔵 **Dicke schwarze Linie** | Root-Komponente | 4px | App.tsx |
| 🔵 **Dicke schwarze Linie** | Hauptansichten | 3px | UtilizationReportView.tsx |
| 🟠 **Gestrichelte Linie** | Modals/Popups | 2px | RoleManagement.tsx |
| ⚫ **Normale Linie** | Cards/UI-Elemente | 1px | EmployeeCard.tsx |
| 🔘 **Graue Linie** | Filter/Controls | 1px | PersonFilterBar.tsx |
| 🔘 **Hellgraue Linie** | Demo-Komponenten | 1px | ProjectRoleDemo.tsx |

---

## 🏠 **ROOT-EBENE**

### **App.tsx** - Hauptanwendung
**UI-Titel:** Hauptanwendung  
**Funktion:** Root-Komponente, steuert gesamte App-Navigation

---

## 📋 **HAUPTNAVIGATION**

### **AppHeader.tsx** - Navigation & Settings
**UI-Titel:** Navigation & Settings  
**Zugriff:** ⚙️ Settings-Menü  
**Funktion:** Zentrale Navigation und Einstellungen

### **LoginForm.tsx** - Anmeldung
**UI-Titel:** "Anmeldung"  
**Funktion:** Benutzer-Authentifizierung

---

## 📊 **HAUPTANSICHTEN**

### 1️⃣ **UtilizationReportView.tsx**
**UI-Titel:** "Auslastung & Vorblick"  
**Funktion:** Hauptansicht für Auslastungsberichte und KPIs

**Unterkomponenten:**
- `PersonFilterBar.tsx` → UI: "Personen Filter"
- `KpiCardsGrid.tsx` → UI: KPI Dashboard
- `UtilizationTrendChart.tsx` → UI: Trend Diagramm
- `MultiSelectFilter.tsx` → UI: Dropdown Filter
- `UtilizationComment.tsx` → UI: Kommentare
- `SalesOpportunities.tsx` → UI: Verkaufschancen
- `ScopeFilterDropdown.tsx` → UI: Bereichsfilter
- `StatusLabelSelector.tsx` → UI: Status Auswahl

**KPI Cards (intern):**
- UI: "Ø Auslastung Rückblick (8 W)" - Historische Daten
- UI: "Ø Auslastung Vorblick (4 W)" - Prognosedaten
- UI: "⭐ >100 % (Anzahl Personen/Wochen)" - Überauslastung
- UI: "Anzahl fehlender Werte (ignoriert)" - Datenqualität

### 2️⃣ **EmployeeOverviewDashboard.tsx**
**UI-Titel:** "Mitarbeiter"  
**Untertitel:** "Mitarbeiter Übersicht"  
**Funktion:** Zentrale Mitarbeiterverwaltung

**Unterkomponenten:**
- `EmployeeCard.tsx` → UI: [Mitarbeiter Name]
- `EmployeeListView.tsx` → UI: Listen Ansicht
- `EmployeeTable.tsx` → UI: Tabellen Ansicht
- `ProjectDetail.tsx` → UI: "Aktuelle Projekte"

### 3️⃣ **SalesView.tsx**
**UI-Titel:** "Sales Übersicht"  
**Funktion:** Verkaufs-orientierte Mitarbeiteransicht

**Unterkomponenten:**
- `EmployeeOverview.tsx` → UI: "Mitarbeiter (Sales)"
- `SalesFilterBar.tsx` → UI: "Sales Filter"

### 4️⃣ **EmployeeDetailView.tsx**
**UI-Titel:** "Mitarbeiterdetails"  
**Funktion:** Detailansicht für einzelne Mitarbeiter

### 5️⃣ **Projects Area**
**UI-Titel:** "Projekte"  
**Funktion:** Projekt-Management-Bereich

**Hauptkomponenten:**
- `OverviewPage.tsx` → UI: "Overview" (Tab)
- `ProjectManagementDashboard.tsx` → UI: "Projects" (Tab)
- `ProjectCreationWizard.tsx` → UI: "Wizard" (Tab)

**Project Cards:**
- `ProjectHistoryCard.tsx` → UI: "Projekt Historie"
- `ProjectRolesCard.tsx` → UI: "Projekt Rollen"

---

## 🎭 **DEMO-KOMPONENTEN**

### **ProjectRoleTaskSelectorDemo.tsx**
**UI-Titel:** "Projekt Rollen Demo"  
**Funktion:** Demo für Rollen-Selektor

### **ProjectSkillSelectorDemo.tsx**
**UI-Titel:** "Projekt Skills Demo"  
**Funktion:** Demo für Skills-Selektor

---

## 📱 **MODALS (POPUP-FENSTER)**

### 🔧 **Utilization Modals**
| Dateiname | Modal-Titel | Zugriff |
|-----------|-------------|---------|
| `AuslastungView.tsx` | "Auslastungsansicht" | Button "Auslastung" |
| `EinsatzplanView.tsx` | "Einsatzplan" | Button "Einsatzplan" |
| `AssignmentEditorModal.tsx` | "Zuweisungs-Editor" | Zuweisungs-Button |
| `PlanningModal.tsx` | "Planungs-Editor" | Planungs-Button |

### 🌐 **App-Level Modals**
| Dateiname | Modal-Titel | Zugriff |
|-----------|-------------|---------|
| `AdminUserManagementModal.tsx` | "Admin Benutzer Verwaltung" | Admin-Menü |
| `ExcelUploadModal.tsx` | "Excel Upload" | Settings → Excel Upload |
| `EmployeeSelectionModal.tsx` | "Mitarbeiter auswählen" | Auswahl-Button |
| `ModernUploadPanel.tsx` | Upload Interface | Innerhalb Excel Upload |

### 🚀 **Project Modals**
| Dateiname | Modal-Titel | Zugriff |
|-----------|-------------|---------|
| `PlannedProjectsModal.tsx` | "Geplante Projekte" | ProjectHistoryCard |
| `ProjectCreationModal.tsx` | "Projekt erstellen" | '+' Button |

### ⚙️ **Management Modals**
| Dateiname | Modal-Titel | Zugriff |
|-----------|-------------|---------|
| `RoleManagement.tsx` | "Rollen Management" | Settings → Management → Rollen |
| `TechnicalSkillManagement.tsx` | "Technische Fähigkeiten" | Settings → Management → Skills |
| `CustomerProjectsManager.tsx` | "Kundenprojekte Management" | Settings → Management → Kunden |
| `AuslastungserklaerungManagement.tsx` | "Auslastungserklärungen" | Settings → Management → Erklärungen |
| `AdminDataUploadModal.tsx` | "Admin Daten Upload" | Settings → Admin Upload |

### 📥 **Import Modals**
| Dateiname | Modal-Titel | Zugriff |
|-----------|-------------|---------|
| `TechnicalSkillBulkUploadModal.tsx` | "Skills Import" | Settings → Import → Skills |
| `RoleTaskBulkUploadModal.tsx` | "Rollen & Tasks Import" | Settings → Import → Rollen |

---

## 🎯 **NAVIGATION-GUIDE**

### **Wie finde ich Komponenten in der App?**

| Sehe ich in der UI | Dateiname | Typ |
|-------------------|-----------|-----|
| "Auslastung & Vorblick" | `UtilizationReportView.tsx` | Hauptansicht |
| "Personen Filter" | `PersonFilterBar.tsx` | Filter |
| "Ø Auslastung Rückblick (8 W)" | `KpiCardsGrid.tsx` (intern) | KPI Card |
| "Rollen Management" | `RoleManagement.tsx` | Modal |
| "Excel Upload" | `ExcelUploadModal.tsx` | Modal |
| "Mitarbeiter Übersicht" | `EmployeeOverviewDashboard.tsx` | Hauptansicht |
| "Overview" (Tab) | `OverviewPage.tsx` | Projekt-Tab |
| "Projekt Historie" | `ProjectHistoryCard.tsx` | Card |

### **Zugriffswege zu Modals:**

1. **Settings-Menü (⚙️):**
   - Management → Rollen, Skills, Kunden, Erklärungen
   - Import → Skills, Rollen
   - Admin Upload

2. **Hauptansichten:**
   - Buttons für Auslastung, Einsatzplan, Planung
   - '+' Buttons für Projekt-Erstellung

3. **Cards:**
   - Projekt-Cards haben eigene Modals
   - Mitarbeiter-Cards führen zu Details

---

## 📊 **STATISTIKEN**

**Gesamt aktive Komponenten:** 47  
**Hauptansichten:** 5  
**Modals:** 15  
**Cards/UI-Elemente:** 12  
**Filter/Controls:** 8  
**Demo-Komponenten:** 2  
**Navigation:** 2  
**Sonstige:** 3  

---

## 🔍 **VERWENDUNG**

**Für Entwickler:**
- Schnelle Zuordnung: UI-Titel → Dateiname
- Verstehen der Komponenten-Hierarchie
- Navigation im Code

**Für Tester:**
- Welche UI-Elemente zu welchen Dateien gehören
- Vollständige Abdeckung aller Bereiche
- Zugriffswege zu allen Funktionen

**Für Projektmanager:**
- Überblick über App-Struktur
- Feature-Mapping
- Komplexitäts-Einschätzung

---

*Diese Dokumentation dient als zentrale Referenz für alle aktiven Komponenten der Ressource Utilization Anwendung.*
