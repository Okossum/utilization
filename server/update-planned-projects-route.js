// 🔄 UPDATE: /api/planned-projects Route für neue Architektur
// Diese Datei zeigt die notwendigen Änderungen für server/index.js

/**
 * ALTE VERSION (vor Migration):
 * Projekte wurden direkt aus utilizationData.plannedProjects gelesen
 */
const oldPlannedProjectsRoute = `
app.get('/api/planned-projects', requireAuth, async (req, res) => {
  try {
    // Lade alle geplanten Projekte aus utilizationData
    const snap = await db.collection('utilizationData')
      .where('isLatest', '==', true)
      .get();
    
    const plannedProjects = [];
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      
      // Prüfe ob der Mitarbeiter geplante Projekte hat
      if (data.plannedProjects && Array.isArray(data.plannedProjects)) {
        data.plannedProjects.forEach(project => {
          // Projekte waren direkt eingebettet
          plannedProjects.push({
            employeeId: data.id,
            employeeName: data.person,
            projectId: project.id,
            projectName: project.projectName,
            // ... weitere Felder
          });
        });
      }
    });
    
    res.json(plannedProjects);
  } catch (error) {
    console.error('Error loading planned projects:', error);
    res.status(500).json({ error: 'Fehler beim Laden der geplanten Projekte' });
  }
});
`;

/**
 * NEUE VERSION (nach Migration):
 * Projekte werden aus projects Collection geladen, Referenzen aus utilizationData
 */
const newPlannedProjectsRoute = `
app.get('/api/planned-projects', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Loading planned projects from new architecture...');
    
    // SCHRITT 1: Lade alle Mitarbeiter mit Projekt-Referenzen
    const utilizationSnap = await db.collection('utilizationData')
      .where('isLatest', '==', true)
      .get();
    
    // SCHRITT 2: Sammle alle Projekt-IDs
    const projectIds = new Set();
    const employeeProjectMap = new Map(); // employeeId -> projectReferences[]
    
    utilizationSnap.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.projectReferences && Array.isArray(data.projectReferences)) {
        data.projectReferences.forEach(ref => {
          projectIds.add(ref.projectId);
        });
        
        employeeProjectMap.set(data.id, {
          employeeName: data.person,
          projectReferences: data.projectReferences
        });
      }
    });
    
    // SCHRITT 3: Lade alle referenzierten Projekte aus projects Collection
    const projectsMap = new Map();
    
    if (projectIds.size > 0) {
      // Firestore 'in' Query Limit: 10 IDs pro Query
      const projectIdChunks = Array.from(projectIds).reduce((chunks, id, index) => {
        const chunkIndex = Math.floor(index / 10);
        if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
        chunks[chunkIndex].push(id);
        return chunks;
      }, []);
      
      for (const chunk of projectIdChunks) {
        const projectsSnap = await db.collection('projects')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .get();
        
        projectsSnap.docs.forEach(doc => {
          projectsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      }
    }
    
    // SCHRITT 4: Kombiniere Projekt-Daten mit Mitarbeiter-Referenzen
    const plannedProjects = [];
    
    for (const [employeeId, employeeData] of employeeProjectMap) {
      for (const reference of employeeData.projectReferences) {
        const project = projectsMap.get(reference.projectId);
        
        if (project && project.projectType === 'planned') {
          plannedProjects.push({
            employeeId: employeeId,
            employeeName: employeeData.employeeName,
            projectId: project.id,
            projectName: project.projectName,
            customer: project.customer,
            startDate: project.startDate,
            endDate: project.endDate,
            plannedUtilization: reference.plannedUtilization,
            probability: project.probability || 75,
            role: reference.role,
            createdAt: project.createdAt,
            assignedWeeks: reference.assignedWeeks || []
          });
        }
      }
    }
    
    console.log(\`✅ Found \${plannedProjects.length} planned projects from \${projectsMap.size} total projects\`);
    res.json(plannedProjects);
    
  } catch (error) {
    console.error('❌ Error loading planned projects:', error);
    res.status(500).json({ error: 'Fehler beim Laden der geplanten Projekte' });
  }
});
`;

/**
 * 📋 ZUSÄTZLICHE ROUTES FÜR PROJEKT-MANAGEMENT
 */

// GET /api/projects/:id - Einzelnes Projekt laden
const getProjectRoute = `
app.get('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const projectDoc = await db.collection('projects').doc(id).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }
    
    res.json({ id: projectDoc.id, ...projectDoc.data() });
  } catch (error) {
    console.error('Error loading project:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Projekts' });
  }
});
`;

// PUT /api/projects/:id - Projekt aktualisieren
const updateProjectRoute = `
app.put('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validierung
    if (!updates.projectName || !updates.customer) {
      return res.status(400).json({ error: 'Projektname und Kunde sind erforderlich' });
    }
    
    // Update mit Metadaten
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      updatedBy: req.user.email || 'unknown'
    };
    
    await db.collection('projects').doc(id).update(updateData);
    
    console.log(\`✅ Projekt aktualisiert: \${id}\`);
    res.json({ success: true, id });
    
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Projekts' });
  }
});
`;

// POST /api/projects - Neues Projekt erstellen
const createProjectRoute = `
app.post('/api/projects', requireAuth, async (req, res) => {
  try {
    const projectData = req.body;
    
    // Validierung
    if (!projectData.projectName || !projectData.customer) {
      return res.status(400).json({ error: 'Projektname und Kunde sind erforderlich' });
    }
    
    // Generiere Projekt-ID
    const projectId = \`project_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    
    const newProject = {
      id: projectId,
      projectName: projectData.projectName,
      customer: projectData.customer,
      projectType: projectData.projectType || 'planned',
      probability: projectData.probability || 'Prospect',
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      description: projectData.description,
      comment: projectData.comment,
      plannedAllocationPct: projectData.plannedAllocationPct || 100,
      
      // Metadaten
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.email || 'unknown'
    };
    
    await db.collection('projects').doc(projectId).set(newProject);
    
    console.log(\`✅ Neues Projekt erstellt: \${projectId}\`);
    res.json({ success: true, id: projectId, project: newProject });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Projekts' });
  }
});
`;

console.log('📋 Server-Route Updates für neue Projekt-Architektur');
console.log('Diese Änderungen müssen in server/index.js implementiert werden.');

module.exports = {
  oldPlannedProjectsRoute,
  newPlannedProjectsRoute,
  getProjectRoute,
  updateProjectRoute,
  createProjectRoute
};
