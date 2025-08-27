const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const absoluteServiceAccountPath = '/Users/oliver.koss/Projekte/Ressource Utilization/ressourceutilization-firebase-adminsdk-fbsvc-e8129f7d59.json';
  const svc = JSON.parse(fs.readFileSync(absoluteServiceAccountPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(svc) });
}

const db = admin.firestore();

/**
 * 🚀 MIGRATION: Projekte von utilizationData in eigene projects Collection
 * 
 * SCHRITT 1: Extrahiere alle plannedProjects aus utilizationData
 * SCHRITT 2: Erstelle projects Collection Dokumente
 * SCHRITT 3: Ersetze plannedProjects durch projectReferences
 * SCHRITT 4: Validiere Migration
 */

async function migrateProjectsToCollection() {
  console.log('🚀 Starte Migration: Projekte → projects Collection');
  
  const stats = {
    employeesProcessed: 0,
    projectsExtracted: 0,
    projectsCreated: 0,
    referencesCreated: 0,
    errors: []
  };

  try {
    // SCHRITT 1: Lade alle utilizationData Dokumente
    console.log('📊 Lade utilizationData Dokumente...');
    const utilizationSnap = await db.collection('utilizationData')
      .where('isLatest', '==', true)
      .get();
    
    console.log(`✅ Gefunden: ${utilizationSnap.docs.length} Mitarbeiter`);
    
    // SCHRITT 2: Sammle alle Projekte und erstelle Mapping
    const projectsToCreate = new Map(); // projectId -> projectData
    const employeeProjectReferences = new Map(); // employeeId -> projectReferences[]
    
    for (const doc of utilizationSnap.docs) {
      const data = doc.data();
      stats.employeesProcessed++;
      
      console.log(`👤 Verarbeite: ${data.person} (${data.id})`);
      
      if (data.plannedProjects && Array.isArray(data.plannedProjects)) {
        const projectReferences = [];
        
        for (const project of data.plannedProjects) {
          stats.projectsExtracted++;
          
          // Validiere Projekt-Daten
          if (!project.id || !project.projectName) {
            stats.errors.push(`❌ Ungültiges Projekt für ${data.person}: ${JSON.stringify(project)}`);
            continue;
          }
          
          // Sammle Projekt für projects Collection
          if (!projectsToCreate.has(project.id)) {
            projectsToCreate.set(project.id, {
              id: project.id,
              projectName: project.projectName || 'Unbekanntes Projekt',
              customer: project.customer || 'Unbekannter Kunde',
              projectType: project.projectType || 'planned',
              probability: project.probability || 'Prospect',
              startDate: project.startDate,
              endDate: project.endDate,
              description: project.description,
              comment: project.comment,
              plannedAllocationPct: project.plannedAllocationPct,
              
              // Metadaten
              createdAt: project.createdAt || new Date(),
              updatedAt: project.updatedAt || new Date(),
              createdBy: project.createdBy || 'migration-script',
              updatedBy: 'migration-script'
            });
          }
          
          // Erstelle Projekt-Referenz für Mitarbeiter
          projectReferences.push({
            projectId: project.id,
            plannedUtilization: project.plannedUtilization || project.plannedAllocationPct || 100,
            assignedWeeks: project.assignedWeeks || [],
            role: project.role,
            assignedAt: project.createdAt || new Date(),
            updatedAt: new Date()
          });
          
          stats.referencesCreated++;
        }
        
        if (projectReferences.length > 0) {
          employeeProjectReferences.set(data.id, projectReferences);
        }
      }
    }
    
    console.log(`📋 Projekte zu erstellen: ${projectsToCreate.size}`);
    console.log(`👥 Mitarbeiter mit Projekt-Referenzen: ${employeeProjectReferences.size}`);
    
    // SCHRITT 3: Erstelle projects Collection Dokumente
    console.log('🏗️ Erstelle projects Collection...');
    const batch = db.batch();
    let batchCount = 0;
    
    for (const [projectId, projectData] of projectsToCreate) {
      const projectRef = db.collection('projects').doc(projectId);
      batch.set(projectRef, projectData);
      batchCount++;
      stats.projectsCreated++;
      
      // Firestore Batch Limit: 500 Operationen
      if (batchCount >= 450) {
        console.log(`💾 Speichere Batch (${batchCount} Projekte)...`);
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      console.log(`💾 Speichere finalen Batch (${batchCount} Projekte)...`);
      await batch.commit();
    }
    
    // SCHRITT 4: Aktualisiere utilizationData mit Projekt-Referenzen
    console.log('🔗 Aktualisiere utilizationData mit Projekt-Referenzen...');
    
    for (const [employeeId, projectReferences] of employeeProjectReferences) {
      const employeeRef = db.collection('utilizationData').doc(employeeId);
      
      await employeeRef.update({
        projectReferences: projectReferences,
        // Entferne alte plannedProjects (optional - für Rollback behalten)
        // plannedProjects: admin.firestore.FieldValue.delete(),
        updatedAt: new Date(),
        migratedAt: new Date(),
        migrationVersion: '1.0.0'
      });
      
      console.log(`✅ Aktualisiert: ${employeeId} (${projectReferences.length} Referenzen)`);
    }
    
    // SCHRITT 5: Validierung
    console.log('🔍 Validiere Migration...');
    const projectsSnap = await db.collection('projects').get();
    const validationCount = projectsSnap.docs.length;
    
    console.log('\n📊 MIGRATION ABGESCHLOSSEN');
    console.log('================================');
    console.log(`👥 Mitarbeiter verarbeitet: ${stats.employeesProcessed}`);
    console.log(`📋 Projekte extrahiert: ${stats.projectsExtracted}`);
    console.log(`🏗️ Projekte erstellt: ${stats.projectsCreated}`);
    console.log(`🔗 Referenzen erstellt: ${stats.referencesCreated}`);
    console.log(`✅ Projekte in DB: ${validationCount}`);
    console.log(`❌ Fehler: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ FEHLER:');
      stats.errors.forEach(error => console.log(error));
    }
    
    if (stats.projectsCreated === validationCount) {
      console.log('\n🎉 MIGRATION ERFOLGREICH!');
    } else {
      console.log('\n⚠️ MIGRATION UNVOLLSTÄNDIG - Bitte prüfen!');
    }
    
  } catch (error) {
    console.error('❌ MIGRATION FEHLER:', error);
    throw error;
  }
}

// Führe Migration aus
if (require.main === module) {
  migrateProjectsToCollection()
    .then(() => {
      console.log('✅ Migration Script beendet');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration Script Fehler:', error);
      process.exit(1);
    });
}

module.exports = { migrateProjectsToCollection };
