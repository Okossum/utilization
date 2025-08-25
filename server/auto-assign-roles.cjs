/**
 * Automatische Rollen-Zuweisung basierend auf Geschäftsregeln
 * 
 * Regeln:
 * 1. Sales: bereich === "AT SAL" → systemRole = "sales"
 * 2. Führungskraft: person steht in VG-Spalte → systemRole = "führungskraft"
 * 3. Priorität: Führungskraft > Sales (wenn beide zutreffen)
 * 4. Standard: systemRole = "führungskraft" (für alle anderen)
 */

const admin = require('firebase-admin');

// Firebase Admin initialisieren (falls noch nicht geschehen)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'ressource-utilization-app'
  });
}

const db = admin.firestore();

async function analyzeVgField() {
  console.log('🔍 Analysiere VG-Feld in utilizationData Collection...');
  
  try {
    const snapshot = await db.collection('utilizationData').get();
    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📊 Gefunden: ${allUsers.length} Benutzer`);
    
    // VG-Werte sammeln
    const vgValues = new Set();
    const vgMapping = new Map(); // person -> [vg1, vg2, ...]
    
    allUsers.forEach(user => {
      if (user.vg && user.vg.trim()) {
        vgValues.add(user.vg.trim());
        
        if (!vgMapping.has(user.vg.trim())) {
          vgMapping.set(user.vg.trim(), []);
        }
        vgMapping.get(user.vg.trim()).push(user.person);
      }
    });
    
    console.log(`\n📋 VG-Analyse:`);
    console.log(`- Eindeutige VG-Werte: ${vgValues.size}`);
    console.log(`- VG-Zuordnungen:`);
    
    vgMapping.forEach((subordinates, vg) => {
      console.log(`  "${vg}" → ${subordinates.length} Mitarbeiter`);
    });
    
    // Bereiche analysieren
    const bereichValues = new Set();
    const salesUsers = [];
    
    allUsers.forEach(user => {
      if (user.bereich) {
        bereichValues.add(user.bereich);
        if (user.bereich.includes('AT SAL')) {
          salesUsers.push(user.person);
        }
      }
    });
    
    console.log(`\n🏢 Bereich-Analyse:`);
    console.log(`- Eindeutige Bereiche: ${bereichValues.size}`);
    console.log(`- Sales-Benutzer (AT SAL): ${salesUsers.length}`);
    
    Array.from(bereichValues).sort().forEach(bereich => {
      const count = allUsers.filter(u => u.bereich === bereich).length;
      console.log(`  "${bereich}" → ${count} Benutzer`);
    });
    
    return { allUsers, vgMapping, salesUsers };
    
  } catch (error) {
    console.error('❌ Fehler bei VG-Analyse:', error);
    throw error;
  }
}

async function determineRoles(allUsers, vgMapping, salesUsers) {
  console.log('\n🎭 Bestimme Rollen nach Geschäftsregeln...');
  
  const roleAssignments = [];
  
  // Alle Personen sammeln, die als VG (Vorgesetzte) aufgeführt sind
  const managersSet = new Set(vgMapping.keys());
  
  allUsers.forEach(user => {
    let newRole = 'führungskraft'; // Standard-Rolle
    let reason = 'Standard-Rolle';
    
    // Regel 1: Sales-Bereich
    const isSales = user.bereich && user.bereich.includes('AT SAL');
    if (isSales) {
      newRole = 'sales';
      reason = `Sales-Bereich: "${user.bereich}"`;
    }
    
    // Regel 2: Führungskraft (überschreibt Sales)
    const isManager = managersSet.has(user.person);
    if (isManager) {
      newRole = 'führungskraft';
      const subordinateCount = vgMapping.get(user.person)?.length || 0;
      reason = `Führungskraft: ${subordinateCount} Mitarbeiter`;
    }
    
    roleAssignments.push({
      id: user.id,
      person: user.person,
      email: user.email,
      currentRole: user.systemRole || 'keine',
      newRole,
      reason,
      hasSystemAccess: true, // Alle bekommen System-Zugriff
      needsUpdate: user.systemRole !== newRole || !user.hasSystemAccess
    });
  });
  
  // Statistiken
  const stats = {
    total: roleAssignments.length,
    admin: roleAssignments.filter(r => r.newRole === 'admin').length,
    führungskraft: roleAssignments.filter(r => r.newRole === 'führungskraft').length,
    sales: roleAssignments.filter(r => r.newRole === 'sales').length,
    needsUpdate: roleAssignments.filter(r => r.needsUpdate).length
  };
  
  console.log(`\n📊 Rollen-Statistiken:`);
  console.log(`- Gesamt: ${stats.total}`);
  console.log(`- Admin: ${stats.admin}`);
  console.log(`- Führungskraft: ${stats.führungskraft}`);
  console.log(`- Sales: ${stats.sales}`);
  console.log(`- Benötigen Update: ${stats.needsUpdate}`);
  
  return roleAssignments;
}

async function applyRoleAssignments(roleAssignments, dryRun = true) {
  const updatesNeeded = roleAssignments.filter(r => r.needsUpdate);
  
  if (dryRun) {
    console.log(`\n🔍 DRY RUN - Würde ${updatesNeeded.length} Benutzer aktualisieren:`);
    
    updatesNeeded.forEach(assignment => {
      console.log(`  "${assignment.person}"`);
      console.log(`    Aktuell: ${assignment.currentRole} → Neu: ${assignment.newRole}`);
      console.log(`    Grund: ${assignment.reason}`);
      console.log(`    E-Mail: ${assignment.email}`);
      console.log('');
    });
    
    return { updated: 0, errors: 0 };
  }
  
  console.log(`\n✅ ECHTE AUSFÜHRUNG - Aktualisiere ${updatesNeeded.length} Benutzer...`);
  
  let updated = 0;
  let errors = 0;
  
  for (const assignment of updatesNeeded) {
    try {
      await db.collection('utilizationData').doc(assignment.id).update({
        systemRole: assignment.newRole,
        hasSystemAccess: assignment.hasSystemAccess,
        roleAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleAssignedBy: 'auto-assignment-script'
      });
      
      console.log(`✅ ${assignment.person}: ${assignment.currentRole} → ${assignment.newRole}`);
      updated++;
      
    } catch (error) {
      console.error(`❌ Fehler bei ${assignment.person}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Ergebnis: ${updated} aktualisiert, ${errors} Fehler`);
  return { updated, errors };
}

async function main() {
  try {
    console.log('🚀 Starte automatische Rollen-Zuweisung...\n');
    
    // Schritt 1: VG-Feld analysieren
    const { allUsers, vgMapping, salesUsers } = await analyzeVgField();
    
    // Schritt 2: Rollen bestimmen
    const roleAssignments = await determineRoles(allUsers, vgMapping, salesUsers);
    
    // Schritt 3: Dry Run (Vorschau)
    await applyRoleAssignments(roleAssignments, true);
    
    console.log('\n❓ Möchten Sie die Änderungen anwenden?');
    console.log('   Führen Sie aus: node auto-assign-roles.cjs --apply');
    
    // Schritt 4: Echte Ausführung (nur mit --apply Flag)
    if (process.argv.includes('--apply')) {
      console.log('\n⚠️  ECHTE AUSFÜHRUNG gestartet...');
      const result = await applyRoleAssignments(roleAssignments, false);
      
      if (result.updated > 0) {
        console.log('\n🎉 Rollen-Zuweisung erfolgreich abgeschlossen!');
      }
    }
    
  } catch (error) {
    console.error('💥 Fehler beim Ausführen:', error);
    process.exit(1);
  }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  main();
}

module.exports = {
  analyzeVgField,
  determineRoles,
  applyRoleAssignments
};
