// Migration Script: Skills & Rollen zu utilizationData Hub
const admin = require('firebase-admin');

// Firebase Admin initialisieren (falls noch nicht geschehen)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

/**
 * Migriert Skills und Rollen von separaten Collections in den utilizationData Hub
 */
async function migrateSkillsRolesToHub() {
  console.log('🚀 Starte Migration: Skills & Rollen → utilizationData Hub');
  
  try {
    // 1. Lade alle utilizationData Dokumente
    const utilizationSnapshot = await db.collection('utilizationData').get();
    console.log(`📊 Gefunden: ${utilizationSnapshot.size} utilizationData Dokumente`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // 2. Für jedes utilizationData Dokument
    for (const utilizationDoc of utilizationSnapshot.docs) {
      const utilizationData = utilizationDoc.data();
      const personName = utilizationData.person;
      const personId = utilizationData.id;
      
      console.log(`\n👤 Migriere Person: ${personName} (ID: ${personId})`);
      
      try {
        // 3. Sammle Skills/Rollen Daten aus verschiedenen Quellen
        const migrationData = {
          assignedRoles: [],
          technicalSkills: [],
          softSkills: []
        };
        
        // 3a. Lade Technical Skills aus employee_skills Collection
        const employeeSkillsQuery = await db.collection('employee_skills')
          .where('employeeName', '==', personName)
          .get();
        
        console.log(`  🛠️ Technical Skills gefunden: ${employeeSkillsQuery.size}`);
        
        for (const skillDoc of employeeSkillsQuery.docs) {
          const skillData = skillDoc.data();
          
          migrationData.technicalSkills.push({
            skillId: skillData.skillId || skillDoc.id,
            skillName: skillData.skillName || 'Unknown Skill',
            categoryName: skillData.categoryName || 'General',
            rating: skillData.level || 0,
            assessedAt: skillData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            assessedBy: 'migration-script',
            updatedAt: new Date().toISOString(),
            certificationLevel: getRatingLevel(skillData.level || 0)
          });
        }
        
        // 3b. Lade Rollen (falls vorhanden in separater Collection)
        // Hinweis: Rollen werden über Backend-API verwaltet, daher schwieriger zu migrieren
        // Für jetzt erstellen wir Platzhalter-Rollen basierend auf LBS
        if (utilizationData.lbs) {
          const roleFromLBS = mapLBSToRole(utilizationData.lbs);
          if (roleFromLBS) {
            migrationData.assignedRoles.push({
              roleId: `role-${personId}`,
              roleName: roleFromLBS.name,
              categoryName: roleFromLBS.category,
              level: roleFromLBS.level,
              assignedAt: new Date().toISOString(),
              assignedBy: 'migration-script',
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        // 3c. Lade Soft Skills aus employeeDossiers (falls vorhanden)
        try {
          const dossierDoc = await db.collection('employeeDossiers').doc(personId).get();
          if (dossierDoc.exists) {
            const dossierData = dossierDoc.data();
            const softSkills = dossierData.assignedSoftSkills || [];
            
            console.log(`  🧠 Soft Skills gefunden: ${softSkills.length}`);
            
            for (const softSkill of softSkills) {
              migrationData.softSkills.push({
                skillId: softSkill.id || `soft-${Date.now()}-${Math.random()}`,
                skillName: softSkill.name || 'Unknown Soft Skill',
                categoryName: softSkill.category || 'Soft Skills',
                rating: softSkill.rating || 0,
                assessedAt: softSkill.updatedAt || new Date().toISOString(),
                assessedBy: 'migration-script',
                updatedAt: new Date().toISOString(),
                description: softSkill.description || ''
              });
            }
          }
        } catch (dossierError) {
          console.log(`  ⚠️ Kein Dossier gefunden für ${personName}`);
        }
        
        // 4. Aktualisiere utilizationData Dokument mit Skills/Rollen
        const updateData = {
          ...migrationData,
          updatedAt: new Date().toISOString(),
          migratedAt: new Date().toISOString(),
          migrationVersion: '1.0'
        };
        
        await db.collection('utilizationData').doc(utilizationDoc.id).update(updateData);
        
        console.log(`  ✅ Migration erfolgreich:`, {
          roles: migrationData.assignedRoles.length,
          technicalSkills: migrationData.technicalSkills.length,
          softSkills: migrationData.softSkills.length
        });
        
        migratedCount++;
        
      } catch (personError) {
        console.error(`  ❌ Fehler bei Person ${personName}:`, personError.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration abgeschlossen:`);
    console.log(`  ✅ Erfolgreich migriert: ${migratedCount} Personen`);
    console.log(`  ❌ Fehler: ${errorCount} Personen`);
    
  } catch (error) {
    console.error('💥 Migration fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * Mappt Rating-Werte zu Zertifizierungslevels
 */
function getRatingLevel(rating) {
  if (rating >= 4.5) return 'Expert';
  if (rating >= 3.5) return 'Advanced';
  if (rating >= 2.5) return 'Intermediate';
  if (rating >= 1.0) return 'Beginner';
  return 'None';
}

/**
 * Mappt LBS (Laufbahnstufe) zu Standard-Rollen
 */
function mapLBSToRole(lbs) {
  const lbsLower = lbs.toLowerCase();
  
  if (lbsLower.includes('senior')) {
    return {
      name: 'Senior Consultant',
      category: 'Consulting',
      level: 4
    };
  }
  
  if (lbsLower.includes('principal') || lbsLower.includes('lead')) {
    return {
      name: 'Principal Consultant',
      category: 'Consulting',
      level: 5
    };
  }
  
  if (lbsLower.includes('manager')) {
    return {
      name: 'Manager',
      category: 'Management',
      level: 4
    };
  }
  
  if (lbsLower.includes('consultant')) {
    return {
      name: 'Consultant',
      category: 'Consulting',
      level: 3
    };
  }
  
  if (lbsLower.includes('analyst')) {
    return {
      name: 'Analyst',
      category: 'Analysis',
      level: 2
    };
  }
  
  // Default für unbekannte LBS
  return {
    name: 'Consultant',
    category: 'General',
    level: 3
  };
}

/**
 * Dry-Run Modus: Zeigt was migriert werden würde, ohne Änderungen zu machen
 */
async function dryRunMigration() {
  console.log('🔍 DRY RUN: Analysiere was migriert werden würde...\n');
  
  const utilizationSnapshot = await db.collection('utilizationData').get();
  console.log(`📊 Zu migrierende Dokumente: ${utilizationSnapshot.size}\n`);
  
  for (const utilizationDoc of utilizationSnapshot.docs) {
    const utilizationData = utilizationDoc.data();
    const personName = utilizationData.person;
    
    // Prüfe ob bereits migriert
    if (utilizationData.assignedRoles || utilizationData.technicalSkills || utilizationData.softSkills) {
      console.log(`⏭️ ${personName}: Bereits migriert`);
      continue;
    }
    
    // Zähle verfügbare Daten
    const employeeSkillsQuery = await db.collection('employee_skills')
      .where('employeeName', '==', personName)
      .get();
    
    let softSkillsCount = 0;
    try {
      const dossierDoc = await db.collection('employeeDossiers').doc(utilizationData.id).get();
      if (dossierDoc.exists) {
        const dossierData = dossierDoc.data();
        softSkillsCount = (dossierData.assignedSoftSkills || []).length;
      }
    } catch (e) {
      // Ignore
    }
    
    console.log(`📋 ${personName}:`);
    console.log(`  - Technical Skills: ${employeeSkillsQuery.size}`);
    console.log(`  - Soft Skills: ${softSkillsCount}`);
    console.log(`  - LBS Role: ${utilizationData.lbs ? '1' : '0'}`);
  }
}

// Script ausführen
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  if (isDryRun) {
    dryRunMigration()
      .then(() => {
        console.log('\n✅ Dry Run abgeschlossen');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Dry Run fehlgeschlagen:', error);
        process.exit(1);
      });
  } else {
    migrateSkillsRolesToHub()
      .then(() => {
        console.log('\n✅ Migration abgeschlossen');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Migration fehlgeschlagen:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  migrateSkillsRolesToHub,
  dryRunMigration
};
