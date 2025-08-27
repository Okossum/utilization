import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import { UserRole } from '../../lib/permissions';
import { UserManagementService } from '../../services/userManagement';
import { COLLECTIONS } from '../../lib/types';
import { Play, Eye, CheckCircle, AlertTriangle, Users, Zap, BarChart3, Shield, User } from 'lucide-react';

interface RoleAssignment {
  id: string;
  person: string;
  email: string;
  currentRole: string;
  newRole: UserRole;
  reason: string;
  needsUpdate: boolean;
}

interface VgAnalysis {
  managersSet: Set<string>;
  vgMapping: Map<string, string[]>;
  salesUsers: string[];
  bereichStats: Map<string, number>;
}

export default function AutoRoleAssignment() {
  const { user, role, canManageUsers } = useAuth();
  const { databaseData } = useUtilizationData();
  const [analysis, setAnalysis] = useState<VgAnalysis | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // ✅ Notfall-Funktion: Admin-Benutzer erstellen
  const createEmergencyAdmin = async () => {
    if (!user?.email) return;
    
    try {
      setCreatingAdmin(true);
      console.log('🚨 Erstelle Notfall-Admin für:', user.email);
      
      const adminData = {
        person: user.displayName || 'Admin User',
        email: user.email,
        systemRole: 'admin',
        hasSystemAccess: true,
        cc: 'ADMIN',
        team: 'ADMIN',
        lob: 'ADMIN',
        bereich: 'ADMIN',
        isLatest: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        emergencyCreated: true,
        emergencyCreatedAt: new Date().toISOString(),
        emergencyReason: 'Notfall-Admin über Auto-Zuweisung erstellt'
      };

      const docId = user.email.replace(/[@.]/g, '_');
      await setDoc(doc(db, 'utilizationData', docId), adminData);
      
      setMessage({ 
        type: 'success', 
        text: '✅ Admin-Benutzer erfolgreich erstellt! Seite wird neu geladen...' 
      });
      
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Admin-Benutzers:', error);
      setMessage({ 
        type: 'error', 
        text: 'Fehler beim Erstellen: ' + (error as Error).message 
      });
    } finally {
      setCreatingAdmin(false);
    }
  };

  // ✅ TEMPORÄR: Berechtigung deaktiviert für Admin-Wiederherstellung
  // Nur für Admins verfügbar
  if (!canManageUsers() && role !== 'unknown') {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Berechtigung</h3>
        <p className="text-gray-600">Nur Administratoren können automatische Rollen-Zuweisungen durchführen.</p>
        <div className="mt-4 text-sm text-gray-500">
          Aktuelle Rolle: {role}
        </div>
      </div>
    );
  }

  // VG-Analyse durchführen
  const performAnalysis = useMemo(() => {
    const utilizationDataArray = databaseData?.utilizationData || [];
    if (utilizationDataArray.length === 0) return null;

    console.log('🔍 Analysiere VG-Feld und Bereiche...');

    // VG-Mapping erstellen (wer ist Vorgesetzter von wem)
    const vgMapping = new Map<string, string[]>();
    const salesUsers: string[] = [];
    const bereichStats = new Map<string, number>();

    utilizationDataArray.forEach(user => {
      // VG-Analyse
      if (user.vg && user.vg.trim()) {
        const vg = user.vg.trim();
        if (!vgMapping.has(vg)) {
          vgMapping.set(vg, []);
        }
        vgMapping.get(vg)!.push(user.person);
      }

      // Sales-Analyse
      if (user.bereich && user.bereich.includes('AT SAL')) {
        salesUsers.push(user.person);
      }

      // Bereich-Statistiken
      if (user.bereich) {
        const count = bereichStats.get(user.bereich) || 0;
        bereichStats.set(user.bereich, count + 1);
      }
    });

    const managersSet = new Set(vgMapping.keys());

    // Debug-Ausgaben
    console.log('📊 VG-Analyse Ergebnisse:');
    console.log(`- Gefundene Vorgesetzte: ${managersSet.size}`);
    console.log(`- Sales-Mitarbeiter: ${salesUsers.length}`);
    console.log('- Vorgesetzte Liste:', Array.from(managersSet));
    console.log('- Sales Liste:', salesUsers);

    return {
      managersSet,
      vgMapping,
      salesUsers,
      bereichStats
    };
  }, [databaseData]);

  // Rollen-Zuweisungen berechnen
  const calculateRoleAssignments = useMemo(() => {
    const utilizationDataArray = databaseData?.utilizationData || [];
    if (!performAnalysis || utilizationDataArray.length === 0) return [];

    const { managersSet, vgMapping, salesUsers } = performAnalysis;
    const assignments: RoleAssignment[] = [];

    utilizationDataArray.forEach(user => {
      // WICHTIG: Admin-Rollen dürfen NIEMALS überschrieben werden!
      if (user.systemRole === 'admin') {
        assignments.push({
          id: user.id,
          person: user.person,
          email: user.email || '',
          currentRole: user.systemRole || 'keine',
          newRole: 'admin',
          reason: 'Bestehende Admin-Rolle (geschützt)',
          needsUpdate: false // Admin bleibt unverändert
        });
        return; // Früher Ausstieg - keine weiteren Regeln anwenden
      }

      let newRole: UserRole = 'user'; // Standard-Rolle für normale Mitarbeiter
      let reason = 'Standard-Rolle (normaler Mitarbeiter)';

      // Regel 1: Sales-Bereich
      const isSales = salesUsers.includes(user.person);
      if (isSales) {
        newRole = 'sales';
        reason = `Sales-Bereich: "${user.bereich}"`;
      }

      // Regel 2: Führungskraft (überschreibt Sales) - NUR wenn tatsächlich Vorgesetzter
      const isManager = managersSet.has(user.person);
      if (isManager) {
        newRole = 'führungskraft';
        const subordinateCount = vgMapping.get(user.person)?.length || 0;
        reason = `Führungskraft: Vorgesetzter von ${subordinateCount} Mitarbeiter(n)`;
      }

      assignments.push({
        id: user.id,
        person: user.person,
        email: user.email || '',
        currentRole: user.systemRole || 'keine',
        newRole,
        reason,
        needsUpdate: user.systemRole !== newRole || !user.hasSystemAccess || 
                    (newRole !== 'user' && newRole !== 'unknown') // Migriere alle Führungskräfte und Sales
      });
    });

    return assignments;
  }, [performAnalysis, databaseData]);

  useEffect(() => {
    if (performAnalysis) {
      setAnalysis(performAnalysis);
      setRoleAssignments(calculateRoleAssignments);
    }
  }, [performAnalysis, calculateRoleAssignments]);

  const stats = useMemo(() => {
    if (roleAssignments.length === 0) return null;

    return {
      total: roleAssignments.length,
      admin: roleAssignments.filter(r => r.newRole === 'admin').length,
      führungskraft: roleAssignments.filter(r => r.newRole === 'führungskraft').length,
      sales: roleAssignments.filter(r => r.newRole === 'sales').length,
      user: roleAssignments.filter(r => r.newRole === 'user').length,
      needsUpdate: roleAssignments.filter(r => r.needsUpdate).length,
      managers: analysis?.managersSet.size || 0,
      salesCount: analysis?.salesUsers.length || 0
    };
  }, [roleAssignments, analysis]);

  const setupOliverAsAdmin = async () => {
    try {
      setApplying(true);
      console.log('🔍 Suche nach Oliver Koss...');
      
      // Suche nach Oliver Koss in den utilizationData
      const utilizationDataArray = databaseData?.utilizationData || [];
      const oliverData = utilizationDataArray.find((user: any) => 
        user.person === 'Koss, Oliver' || 
        user.email === 'oliver.koss@adesso.de'
      );
      
      if (oliverData) {
        console.log('✅ Oliver gefunden:', oliverData.person);
        
        // 🔐 Neue User-Management: Rolle in users Collection setzen
        if (oliverData.email) {
          await UserManagementService.createOrUpdateUser({
            uid: oliverData.email, // Temporär, wird bei Firebase Auth ersetzt
            email: oliverData.email,
            displayName: oliverData.person,
            systemRole: 'admin',
            hasSystemAccess: true,
            employeeId: oliverData.id,
            lob: oliverData.lob,
            bereich: oliverData.bereich,
            cc: oliverData.cc,
            team: oliverData.team,
            roleAssignedBy: 'manual-admin-setup'
          });
        }
        
        // Legacy-Update entfernt - nur noch users Collection verwenden
        
        setMessage({ 
          type: 'success', 
          text: '🎉 Oliver Koss wurde erfolgreich als Administrator eingerichtet!' 
        });
        
        // Seite neu laden um die Änderungen zu übernehmen
        setTimeout(() => window.location.reload(), 2000);
        
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Oliver Koss nicht in den Daten gefunden. Bitte prüfen Sie Name und E-Mail.' 
        });
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Admin-Setup:', error);
      setMessage({ type: 'error', text: 'Fehler beim Einrichten der Admin-Rolle.' });
    } finally {
      setApplying(false);
    }
  };

  const applyRoleAssignments = async () => {
    const updatesNeeded = roleAssignments.filter(r => r.needsUpdate);
    
    if (updatesNeeded.length === 0) {
      setMessage({ type: 'info', text: 'Keine Aktualisierungen erforderlich.' });
      return;
    }

    setApplying(true);
    let updated = 0;
    let errors = 0;

    try {
      // 🔄 Utilization Data neu laden für die Migration
      const utilizationDataSnapshot = await getDocs(collection(db, COLLECTIONS.UTILIZATION_DATA));
      const utilizationDataArray = utilizationDataSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      for (const assignment of updatesNeeded) {
        try {
          // 🔐 Neue User-Management: Rolle in users Collection setzen
          const utilizationUser = utilizationDataArray.find(u => u.id === assignment.id);
          if (utilizationUser?.email) {
            await UserManagementService.createOrUpdateUser({
              uid: utilizationUser.email, // Temporär, wird bei Firebase Auth ersetzt
              email: utilizationUser.email,
              displayName: utilizationUser.person,
              systemRole: assignment.newRole,
              hasSystemAccess: true,
              employeeId: utilizationUser.id,
              lob: utilizationUser.lob,
              bereich: utilizationUser.bereich,
              cc: utilizationUser.cc,
              team: utilizationUser.team,
              roleAssignedBy: user?.email || 'auto-assignment'
            });
          }
          
          // Legacy-Update entfernt - nur noch users Collection verwenden
          updated++;
        } catch (error) {
          console.error(`❌ Fehler bei ${assignment.person}:`, error);
          errors++;
        }
      }

      if (updated > 0) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${updated} Rollen erfolgreich zugewiesen${errors > 0 ? `, ${errors} Fehler` : ''}` 
        });
        
        // Daten neu laden
        window.location.reload();
      }

    } catch (error) {
      console.error('❌ Fehler beim Anwenden der Rollen:', error);
      setMessage({ type: 'error', text: 'Fehler beim Anwenden der Rollen-Zuweisungen.' });
    } finally {
      setApplying(false);
    }
  };

  if (!analysis || !stats) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">Analysiere Daten...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-6 h-6 text-blue-600 mr-2" />
            Automatische Rollen-Zuweisung
          </h2>
          <p className="text-gray-600 mt-1">
            Basierend auf Geschäftsregeln: VG-Spalte (Führungskraft) und AT SAL Bereich (Sales)
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Ihre aktuelle Rolle: <span className="font-semibold">{role === 'unknown' ? 'Keine Rolle' : role}</span>
          </div>
        </div>
        
        {/* Notfall-Admin Button */}
        {(role === 'unknown' || !canManageUsers()) && user?.email && (
          <button
            onClick={createEmergencyAdmin}
            disabled={creatingAdmin}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            {creatingAdmin ? 'Erstelle Admin...' : 'Notfall-Admin erstellen'}
          </button>
        )}
      </div>

      {/* Nachricht */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-gray-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Gesamt</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-blue-900">{stats.führungskraft}</div>
              <div className="text-sm text-gray-600">Führungskraft</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-green-900">{stats.sales}</div>
              <div className="text-sm text-gray-600">Sales</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <User className="w-5 h-5 text-purple-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-purple-900">{stats.user}</div>
              <div className="text-sm text-gray-600">User</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-orange-900">{stats.needsUpdate}</div>
              <div className="text-sm text-gray-600">Updates nötig</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analyse-Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse-Ergebnisse</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Führungskräfte (VG-Spalte)</h4>
            <div className="text-sm text-gray-600">
              <p>Gefunden: <span className="font-medium">{stats.managers}</span> Personen als Vorgesetzte</p>
              <p className="mt-1">Diese erhalten automatisch die Rolle "Führungskraft"</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Sales-Mitarbeiter (AT SAL)</h4>
            <div className="text-sm text-gray-600">
              <p>Gefunden: <span className="font-medium">{stats.salesCount}</span> Personen im Sales-Bereich</p>
              <p className="mt-1">Diese erhalten die Rolle "Sales" (außer wenn sie Führungskraft sind)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex items-center space-x-4">
        {/* Spezielle Admin-Setup Funktion für Oliver */}
        <button
          onClick={setupOliverAsAdmin}
          disabled={applying}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Shield className="w-4 h-4 mr-2" />
          {applying ? 'Wird eingerichtet...' : 'Oliver als Admin einrichten'}
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
        </button>

        {stats.needsUpdate > 0 && (
          <button
            onClick={applyRoleAssignments}
            disabled={applying}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            {applying ? 'Wird angewendet...' : `${stats.needsUpdate} Rollen zuweisen`}
          </button>
        )}
      </div>

      {/* Vorschau */}
      {showPreview && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Vorschau der Änderungen ({roleAssignments.filter(r => r.needsUpdate).length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktuelle Rolle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Neue Rolle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grund</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roleAssignments
                  .filter(assignment => assignment.needsUpdate)
                  .map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{assignment.person}</div>
                          <div className="text-sm text-gray-500">{assignment.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {assignment.currentRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          assignment.newRole === 'admin' ? 'bg-red-100 text-red-800' :
                          assignment.newRole === 'führungskraft' ? 'bg-blue-100 text-blue-800' :
                          assignment.newRole === 'sales' ? 'bg-green-100 text-green-800' :
                          assignment.newRole === 'user' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.newRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{assignment.reason}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
