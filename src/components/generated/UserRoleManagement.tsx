import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserRole } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { UserManagementService } from '../../services/userManagement';
import { COLLECTIONS, UserProfile } from '../../lib/types';
import { Users, Shield, CheckCircle, AlertCircle, Save, Filter, X, Zap } from 'lucide-react';
import AutoRoleAssignment from './AutoRoleAssignment';

// Verwende UserProfile aus types.ts
type UserData = UserProfile & {
  person: string; // Alias für displayName
  lbs?: string;   // Legacy-Felder für Kompatibilität
};

export default function UserRoleManagement() {
  const { user, role, canManageUsers } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Filter States
  const [selectedLbs, setSelectedLbs] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // View States
  const [showAutoAssignment, setShowAutoAssignment] = useState<boolean>(false);

  // Lade alle Benutzer aus utilizationData
  useEffect(() => {
    loadUsers();
  }, []);

  // Verfügbare LBS-Optionen aus den Benutzerdaten extrahieren
  const availableLbs = useMemo(() => {
    const lbsSet = new Set<string>();
    users.forEach(user => {
      if (user.lbs && user.lbs.trim()) {
        lbsSet.add(user.lbs.trim());
      }
    });
    return Array.from(lbsSet).sort();
  }, [users]);

  // Gefilterte Benutzer
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // LBS Filter
      if (selectedLbs && user.lbs !== selectedLbs) {
        return false;
      }
      
      // Rollen Filter
      if (selectedRole) {
        if (selectedRole === 'no-role' && user.systemRole) {
          return false;
        }
        if (selectedRole !== 'no-role' && user.systemRole !== selectedRole) {
          return false;
        }
      }
      
      // Suchterm Filter (Name oder E-Mail)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = user.person.toLowerCase().includes(term);
        const matchesEmail = user.email.toLowerCase().includes(term);
        if (!matchesName && !matchesEmail) {
          return false;
        }
      }
      
      return true;
    });
  }, [users, selectedLbs, selectedRole, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Lade alle Benutzer aus users Collection...');
      
      // Primär: Lade aus users Collection
      const activeUsers = await UserManagementService.getAllActiveUsers();
      const userData: UserData[] = activeUsers.map(user => ({
        ...user,
        person: user.displayName || 'Unbekannt'
      }));
      
      // Fallback: Ergänze aus utilizationData (für noch nicht migrierte User)
      console.log('🔄 Ergänze aus utilizationData (Legacy)...');
      const utilizationSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.UTILIZATION_DATA),
          where('systemRole', '!=', null)
        )
      );
      
      utilizationSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.email && !userData.find(u => u.email === data.email)) {
          // Nur hinzufügen wenn noch nicht in users Collection
          userData.push({
            id: data.email, // Temporäre ID
            uid: data.email,
            email: data.email,
            person: data.person || 'Unbekannt',
            displayName: data.person || 'Unbekannt',
            systemRole: data.systemRole,
            hasSystemAccess: data.hasSystemAccess || false,
            employeeId: doc.id,
            lob: data.lob,
            bereich: data.bereich,
            cc: data.cc,
            team: data.team,
            lbs: data.lbs,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      });
      
      // Sortiere nach E-Mail
      userData.sort((a, b) => a.email.localeCompare(b.email));
      setUsers(userData);
      console.log('✅ Benutzer geladen:', userData.length, '(davon', activeUsers.length, 'aus users Collection)');
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Benutzer:', error);
      setMessage({ type: 'error', text: 'Fehler beim Laden der Benutzer' });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole, hasAccess: boolean) => {
    try {
      setSaving(userId);
      
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) {
        throw new Error('User nicht gefunden');
      }
      
      // 🔐 Neue User-Management: Rolle in users Collection setzen
      if (targetUser.uid && targetUser.uid !== targetUser.email) {
        // User hat echte Firebase UID
        await UserManagementService.updateUserRole(
          targetUser.uid,
          newRole,
          hasAccess,
          user?.email || 'unknown',
          'Manual role assignment'
        );
      } else {
        // Legacy User oder temporäre ID - erstelle/aktualisiere User
        await UserManagementService.createOrUpdateUser({
          uid: targetUser.email, // Temporär, wird bei Firebase Auth ersetzt
          email: targetUser.email,
          displayName: targetUser.person,
          systemRole: newRole,
          hasSystemAccess: hasAccess,
          employeeId: targetUser.employeeId,
          lob: targetUser.lob,
          bereich: targetUser.bereich,
          cc: targetUser.cc,
          team: targetUser.team,
          roleAssignedBy: user?.email || 'unknown'
        });
      }
      
      // Legacy-Update entfernt - nur noch users Collection verwenden
      
      // Update lokalen State
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, systemRole: newRole, hasSystemAccess: hasAccess }
          : u
      ));
      
      setMessage({ type: 'success', text: 'Rolle erfolgreich aktualisiert' });
      console.log('✅ Rolle aktualisiert in users Collection');
      
    } catch (error) {
      console.error('❌ Fehler beim Update der Rolle:', error);
      setMessage({ type: 'error', text: 'Fehler beim Aktualisieren der Rolle' });
    } finally {
      setSaving(null);
    }
  };

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'führungskraft': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'führungskraft': return 'Führungskraft';
      case 'sales': return 'Sales';
      default: return 'Keine Rolle';
    }
  };

  // Prüfe Berechtigung
  if (!canManageUsers() && role !== 'unknown') {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <div className="text-sm text-yellow-800">
              Sie haben keine Berechtigung für die Benutzerverwaltung.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h1>
            </div>
            
            <button
              onClick={() => setShowAutoAssignment(!showAutoAssignment)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                showAutoAssignment 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Zap className="w-4 h-4 mr-2" />
              {showAutoAssignment ? 'Manuelle Verwaltung' : 'Auto-Zuweisung'}
            </button>
          </div>
          <p className="text-gray-600">
            Verwalten Sie Benutzerrollen und Systemzugriff. Ihre aktuelle Rolle: <span className="font-semibold">{getRoleLabel(role)}</span>
          </p>
        </div>

        {/* Nachricht */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Auto-Zuweisung oder Manuelle Verwaltung */}
        {showAutoAssignment ? (
          <AutoRoleAssignment />
        ) : (
          <>
            {/* Filter-Bereich */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6 p-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
            {(selectedLbs || selectedRole || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedLbs('');
                  setSelectedRole('');
                  setSearchTerm('');
                }}
                className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Filter zurücksetzen
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Suchfeld */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suche (Name oder E-Mail)
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Suche nach Name oder E-Mail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* LBS Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Laufbahnstufe (LBS)
              </label>
              <select
                value={selectedLbs}
                onChange={(e) => setSelectedLbs(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle LBS</option>
                {availableLbs.map(lbs => (
                  <option key={lbs} value={lbs}>{lbs}</option>
                ))}
              </select>
            </div>
            
            {/* Rollen Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System-Rolle
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle Rollen</option>
                <option value="admin">Admin</option>
                <option value="führungskraft">Führungskraft</option>
                <option value="sales">Sales</option>
                <option value="user">User</option>
                <option value="no-role">Keine Rolle</option>
              </select>
            </div>
          </div>
          
          {/* Filter-Zusammenfassung */}
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <span>
              {filteredUsers.length} von {users.length} Benutzern angezeigt
            </span>
            {(selectedLbs || selectedRole || searchTerm) && (
              <span className="ml-4 text-blue-600">
                Filter aktiv: 
                {searchTerm && ` Suche: "${searchTerm}"`}
                {selectedLbs && ` LBS: ${selectedLbs}`}
                {selectedRole && ` Rolle: ${selectedRole === 'no-role' ? 'Keine Rolle' : selectedRole}`}
              </span>
            )}
          </div>
        </div>

        {/* Benutzer-Tabelle */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Benutzer ({filteredUsers.length}{filteredUsers.length !== users.length && ` von ${users.length}`})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Lade Benutzer...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">
                {users.length === 0 
                  ? 'Keine Benutzer gefunden'
                  : 'Keine Benutzer entsprechen den Filterkriterien'
                }
              </div>
              {(selectedLbs || selectedRole || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedLbs('');
                    setSelectedRole('');
                    setSearchTerm('');
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Benutzer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktuelle Rolle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Neue Rolle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zugriff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((userData) => (
                    <UserRow
                      key={userData.id}
                      userData={userData}
                      onUpdateRole={updateUserRole}
                      saving={saving === userData.id}
                      getRoleColor={getRoleColor}
                      getRoleLabel={getRoleLabel}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// Separate Komponente für Benutzer-Zeile
function UserRow({ 
  userData, 
  onUpdateRole, 
  saving, 
  getRoleColor, 
  getRoleLabel 
}: {
  userData: UserData;
  onUpdateRole: (userId: string, role: UserRole, hasAccess: boolean) => void;
  saving: boolean;
  getRoleColor: (role?: UserRole) => string;
  getRoleLabel: (role?: UserRole) => string;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(userData.systemRole || 'unknown');
  const [hasAccess, setHasAccess] = useState(userData.hasSystemAccess || false);

  const handleSave = () => {
    onUpdateRole(userData.id, selectedRole, hasAccess);
  };

  const hasChanges = selectedRole !== (userData.systemRole || 'unknown') || hasAccess !== (userData.hasSystemAccess || false);

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{userData.person}</div>
          <div className="text-sm text-gray-500">{userData.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{userData.lbs || '-'}</div>
        <div className="text-sm text-gray-500">{userData.cc || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(userData.systemRole)}`}>
          {getRoleLabel(userData.systemRole)}
        </span>
        {userData.hasSystemAccess && (
          <Shield className="w-4 h-4 text-green-500 ml-2 inline" />
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
          disabled={saving}
        >
          <option value="unknown">Keine Rolle</option>
          <option value="user">User</option>
          <option value="sales">Sales</option>
          <option value="führungskraft">Führungskraft</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={hasAccess}
            onChange={(e) => setHasAccess(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={saving}
          />
          <span className="ml-2 text-sm text-gray-700">System-Zugriff</span>
        </label>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-md ${
            hasChanges && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Speichern...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Speichern
            </>
          )}
        </button>
      </td>
    </tr>
  );
}
