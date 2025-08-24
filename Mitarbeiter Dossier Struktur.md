VERWENDETE TSX-UNTERKOMPONENTEN:
1. PlanningModal.tsx
UI-Titel: "Planung: Projektangebote & Jira-Tickets"
Sektionen:
"Projektangebote" (mit Target-Icon)
"Jira-Tickets" (mit Ticket-Icon)
"Projektangebot anlegen"
"Jira-Ticket anlegen"
2. AssignmentsList.tsx
UI-Titel: "Projektzuordnungen" (mit Link2-Icon)
Zweck: Liste der aktuellen Projektzuweisungen
3. AssignmentEditorModal.tsx
UI-Titel: "Projektzuordnung bearbeiten" / "Neue Projektzuordnung"
Button-Text: "Projekt zuordnen"
4. ProjectHistorySection.tsx
UI-Titel: "Projektvergangenheit" (mit History-Icon)
Untertitel: "{Anzahl} abgeschlossene(s) Projekt(e) aus der Vergangenheit"
Button: "Projekt hinzufügen"
5. ProjectHistoryEditorModal.tsx
UI-Titel: "Projekt bearbeiten" / "Neues historisches Projekt"
Sektionen:
"Historischer Kunde (Lebenslauf)"
"Historisches Projekt (Lebenslauf)"
"Rolle"
"Dauer"
"Startdatum" / "Enddatum"
"Auslastung (%)"
"Status"
"Tätigkeiten im Projekt"
"Kommentar"
6. EmployeeSkillAssignment.tsx
UI-Titel: "Skills & Kompetenzen"
Untertitel: "Verwalten Sie die Skills und Bewertungen für {Name}"
Sektionen:
"Zugewiesene Skills ({Anzahl})"
"Weitere Skills hinzufügen"
Button: "Skills zuweisen ({Anzahl} verfügbar)"
7. EmployeeRoleAssignment.tsx
UI-Titel: "Rollen-Zuweisungen"
Untertitel: "Verwalten Sie die Rollen und Bewertungen für {Name}"
Sektionen:
"Zugewiesene Rollen ({Anzahl})"
"Weitere Rollen hinzufügen"
Button: "Rollen zuweisen ({Anzahl} verfügbar)"
8. UtilizationComment.tsx
Zweck: Auslastungskommentare (eingebettet)
9. PlanningComment.tsx
Zweck: Planungskommentare (eingebettet)
🔗 INDIREKTE TSX-ABHÄNGIGKEITEN:
TechnicalSkillSelectionModal.tsx
Wird von EmployeeSkillAssignment verwendet
UI-Titel: Skills-Auswahl Modal
RoleSelectionModal.tsx
Wird von EmployeeRoleAssignment verwendet
UI-Titel: Rollen-Auswahl Modal
🏗️ DOSSIER UI-STRUKTUR:
📋 Mitarbeiter-Dossier: [Name]
├── 👤 Basisinformationen
├── 💪 Stärken & Schwächen
├── 🛠️ Skills & Kompetenzen
│   ├── Zugewiesene Skills (X)
│   └── Weitere Skills hinzufügen
├── 🎭 Rollen-Zuweisungen  
│   ├── Zugewiesene Rollen (X)
│   └── Weitere Rollen hinzufügen
├── 📚 Projektvergangenheit
│   └── X abgeschlossene(s) Projekt(e)
├── 🔗 Projektzuordnungen
│   └── Projekt zuordnen
└── 📝 Planung: Projektangebote & Jira-Tickets
    ├── 🎯 Projektangebote
    └── 🎫 Jira-Tickets