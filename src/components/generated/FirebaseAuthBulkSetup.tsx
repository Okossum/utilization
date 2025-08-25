import React, { useState, useMemo } from 'react';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, Mail, Key, CheckCircle, AlertTriangle, Download, Upload, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import app from '../../lib/firebase';

interface AuthUser {
  id: string;
  person: string;
  email: string;
  systemRole: string;
  hasSystemAccess: boolean;
  needsAuthAccount: boolean;
}

export default function FirebaseAuthBulkSetup() {
  const { databaseData } = useUtilizationData();
  const { user, canManageUsers } = useAuth();
  
  // Berechtigungsprüfung VOR allen anderen Hooks
  const hasPermission = canManageUsers();
  
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: number; details: string[] } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Gruppen-Auswahl States
  const [selectedGroups, setSelectedGroups] = useState<{
    admin: boolean;
    führungskraft: boolean;
    sales: boolean;
    user: boolean;
  }>({
    admin: true,    // Admins standardmäßig ausgewählt
    führungskraft: true,  // Führungskräfte standardmäßig ausgewählt
    sales: false,   // Sales optional
    user: false     // User optional (da sehr viele)
  });

  // Passwort-Konfiguration
  const [customPassword, setCustomPassword] = useState('TempPass2024!');
  const [showPassword, setShowPassword] = useState(false);

  // Passwort-Validierung
  const passwordValidation = useMemo(() => {
    const password = customPassword;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = Object.values(checks).every(check => check);
    const strength = Object.values(checks).filter(check => check).length;
    
    return { checks, isValid, strength };
  }, [customPassword]);

  // Passwort-Generator
  const generateSecurePassword = () => {
    const chars = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      special: '!@#$%^&*'
    };
    
    let password = '';
    // Mindestens ein Zeichen aus jeder Kategorie
    password += chars.uppercase[Math.floor(Math.random() * chars.uppercase.length)];
    password += chars.lowercase[Math.floor(Math.random() * chars.lowercase.length)];
    password += chars.numbers[Math.floor(Math.random() * chars.numbers.length)];
    password += chars.special[Math.floor(Math.random() * chars.special.length)];
    
    // Restliche Zeichen zufällig
    const allChars = chars.uppercase + chars.lowercase + chars.numbers + chars.special;
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Zeichen mischen
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Analysiere alle Benutzer nach Rollen
  const allAuthUsers = useMemo(() => {
    const utilizationDataArray = databaseData?.utilizationData || [];
    
    return utilizationDataArray
      .filter((user: any) => 
        user.email && 
        user.email.includes('@') && 
        user.hasSystemAccess && 
        user.systemRole && 
        user.systemRole !== 'unknown'
      )
      .map((user: any) => ({
        id: user.id,
        person: user.person,
        email: user.email,
        systemRole: user.systemRole || 'user',
        hasSystemAccess: user.hasSystemAccess || false,
        lbs: user.lbs || '',
        bereich: user.bereich || '',
        needsAuthAccount: true
      }));
  }, [databaseData]);

  // Filtere Benutzer basierend auf Gruppen-Auswahl
  const authUsers = useMemo(() => {
    return allAuthUsers.filter((user: any) => {
      return selectedGroups[user.systemRole as keyof typeof selectedGroups];
    });
  }, [allAuthUsers, selectedGroups]);

  const stats = useMemo(() => {
    if (!allAuthUsers) return null;
    
    // Alle verfügbaren Benutzer
    const available = {
      admin: allAuthUsers.filter(u => u.systemRole === 'admin').length,
      führungskraft: allAuthUsers.filter(u => u.systemRole === 'führungskraft').length,
      sales: allAuthUsers.filter(u => u.systemRole === 'sales').length,
      user: allAuthUsers.filter(u => u.systemRole === 'user').length,
    };
    
    // Ausgewählte Benutzer
    const selected = {
      total: authUsers.length,
      admin: authUsers.filter(u => u.systemRole === 'admin').length,
      führungskraft: authUsers.filter(u => u.systemRole === 'führungskraft').length,
      sales: authUsers.filter(u => u.systemRole === 'sales').length,
      user: authUsers.filter(u => u.systemRole === 'user').length,
    };
    
    return { available, selected };
  }, [allAuthUsers, authUsers]);

  const createFirebaseAuthAccounts = async () => {
    setProcessing(true);
    setMessage(null);
    
    try {
      console.log('🚀 Starte echte Firebase Auth Account-Erstellung...');
      
      const auth = getAuth(app);
      const DEFAULT_PASSWORD = customPassword;
      let successCount = 0;
      let errorCount = 0;
      const details: string[] = [];
      
      // Echte Account-Erstellung mit Firebase Auth
      for (const authUser of authUsers) {
        try {
          console.log(`🔄 Erstelle Account für: ${authUser.person} (${authUser.email})`);
          
          // Echte Firebase Auth Account-Erstellung
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            authUser.email, 
            DEFAULT_PASSWORD
          );
          
          console.log(`✅ Account erfolgreich erstellt für: ${authUser.person} (${authUser.email})`);
          console.log(`   Firebase UID: ${userCredential.user.uid}`);
          
          details.push(`✅ ${authUser.person} - ${authUser.systemRole} (UID: ${userCredential.user.uid})`);
          successCount++;
          
          // Kurze Pause zwischen Account-Erstellungen
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error: any) {
          console.error(`❌ Fehler bei ${authUser.person}:`, error);
          
          let errorMessage = 'Unbekannter Fehler';
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'E-Mail bereits registriert';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Ungültige E-Mail-Adresse';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Passwort zu schwach';
          } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'E-Mail/Passwort-Anmeldung nicht aktiviert';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          details.push(`❌ ${authUser.person} - ${errorMessage}`);
          errorCount++;
        }
      }
      
      setResults({ success: successCount, errors: errorCount, details });
      
      if (successCount > 0) {
        setMessage({
          type: 'success',
          text: `🎉 ${successCount} echte Firebase Auth Accounts erstellt! ${errorCount > 0 ? `(${errorCount} Fehler)` : ''}`
        });
      } else if (errorCount > 0) {
        setMessage({
          type: 'error',
          text: `❌ Alle Account-Erstellungen fehlgeschlagen (${errorCount} Fehler)`
        });
      }
      
    } catch (error: any) {
      console.error('❌ Kritischer Fehler bei Bulk-Account-Erstellung:', error);
      setMessage({
        type: 'error',
        text: `Kritischer Fehler: ${error.message || error}`
      });
    } finally {
      setProcessing(false);
    }
  };

  const generatePasswordResetLinks = async () => {
    if (!authUsers || authUsers.length === 0) return;
    
    setProcessing(true);
    setMessage(null);
    
    try {
      console.log('📧 Sende Password-Reset E-Mails...');
      
      const auth = getAuth(app);
      let successCount = 0;
      let errorCount = 0;
      const details: string[] = [];
      
      for (const authUser of authUsers) {
        try {
          console.log(`📧 Sende Reset-E-Mail an: ${authUser.email}`);
          
          // Echte Password-Reset E-Mail senden
          await sendPasswordResetEmail(auth, authUser.email);
          
          console.log(`✅ Reset-E-Mail gesendet an: ${authUser.email}`);
          details.push(`✅ ${authUser.person} - Reset-E-Mail gesendet`);
          successCount++;
          
          // Kurze Pause zwischen E-Mails
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error: any) {
          console.error(`❌ Fehler bei Reset-E-Mail für ${authUser.person}:`, error);
          
          let errorMessage = 'Unbekannter Fehler';
          if (error.code === 'auth/user-not-found') {
            errorMessage = 'Benutzer nicht gefunden';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Ungültige E-Mail-Adresse';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          details.push(`❌ ${authUser.person} - ${errorMessage}`);
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setMessage({
          type: 'success',
          text: `📧 ${successCount} Password-Reset E-Mails versendet! ${errorCount > 0 ? `(${errorCount} Fehler)` : ''}`
        });
      } else if (errorCount > 0) {
        setMessage({
          type: 'error',
          text: `❌ Alle E-Mail-Sendungen fehlgeschlagen (${errorCount} Fehler)`
        });
      }
      
    } catch (error: any) {
      console.error('❌ Kritischer Fehler bei Password-Reset:', error);
      setMessage({
        type: 'error',
        text: `Kritischer Fehler: ${error.message || error}`
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadUserList = () => {
    const csvContent = [
      'Name,E-Mail,Rolle,System-Zugriff,Standard-Passwort',
      ...authUsers.map(user => 
        `"${user.person}","${user.email}","${user.systemRole}","${user.hasSystemAccess}","${customPassword}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'firebase_auth_users.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Berechtigungsprüfung NACH allen Hooks
  if (!hasPermission) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Berechtigung</h3>
        <p className="text-gray-600">Nur Administratoren können Firebase Auth Accounts erstellen.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">Analysiere Benutzer...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-2" />
            Firebase Auth Bulk Setup
          </h2>
          <p className="text-gray-600 mt-1">
            Erstelle <strong>echte</strong> Firebase Authentication Accounts für alle Benutzer mit System-Zugriff
          </p>
        </div>
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

      {/* Wichtige Hinweise */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div className="text-blue-800">
            <h4 className="font-medium">⚠️ Wichtige Voraussetzungen für echte Account-Erstellung</h4>
            <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
              <li><strong>Firebase Auth muss aktiviert sein</strong> in der Firebase Console</li>
              <li><strong>E-Mail/Passwort-Anmeldung</strong> muss in den Auth-Einstellungen aktiviert sein</li>
              <li><strong>Benutzer werden sofort erstellt</strong> - keine Simulation mehr!</li>
              <li><strong>E-Mail-Adressen müssen eindeutig sein</strong> (bereits existierende werden übersprungen)</li>
              <li><strong>Password-Reset E-Mails</strong> werden an echte E-Mail-Adressen gesendet</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Passwort-Konfiguration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔑 Standard-Passwort konfigurieren</h3>
        <p className="text-gray-600 mb-4">
          Dieses Passwort wird für alle neuen Firebase Auth Accounts verwendet. Benutzer müssen es beim ersten Login ändern.
        </p>
        
        <div className="space-y-4">
          {/* Passwort-Eingabe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard-Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className={`w-full px-3 py-2 pr-20 border rounded-md focus:outline-none focus:ring-2 focus:border-blue-500 ${
                  passwordValidation.isValid 
                    ? 'border-green-300 focus:ring-green-500' 
                    : 'border-red-300 focus:ring-red-500'
                }`}
                placeholder="Mindestens 8 Zeichen..."
              />
              <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                <button
                  type="button"
                  onClick={() => setCustomPassword(generateSecurePassword())}
                  className="text-gray-400 hover:text-gray-600"
                  title="Sicheres Passwort generieren"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                  title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Passwort-Stärke Anzeige */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Passwort-Stärke</span>
              <span className={`text-sm font-medium ${
                passwordValidation.strength >= 5 ? 'text-green-600' :
                passwordValidation.strength >= 3 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {passwordValidation.strength >= 5 ? 'Stark' :
                 passwordValidation.strength >= 3 ? 'Mittel' : 'Schwach'}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  passwordValidation.strength >= 5 ? 'bg-green-500' :
                  passwordValidation.strength >= 3 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${(passwordValidation.strength / 5) * 100}%` }}
              />
            </div>

            {/* Passwort-Anforderungen */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div className={`flex items-center ${passwordValidation.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Min. 8 Zeichen
              </div>
              <div className={`flex items-center ${passwordValidation.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Großbuchstabe
              </div>
              <div className={`flex items-center ${passwordValidation.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Kleinbuchstabe
              </div>
              <div className={`flex items-center ${passwordValidation.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Zahl
              </div>
              <div className={`flex items-center ${passwordValidation.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Sonderzeichen
              </div>
            </div>
          </div>

          {/* Passwort-Vorschläge */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCustomPassword('TempPass2024!')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Standard verwenden
            </button>
            <button
              onClick={() => setCustomPassword(generateSecurePassword())}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Sicheres Passwort generieren
            </button>
          </div>
        </div>
      </div>

      {/* Gruppen-Auswahl */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Benutzergruppen auswählen</h3>
        <p className="text-gray-600 mb-4">
          Wählen Sie aus, für welche Rollen Firebase Auth Accounts erstellt werden sollen:
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Admin Checkbox */}
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selectedGroups.admin}
              onChange={(e) => setSelectedGroups(prev => ({ ...prev, admin: e.target.checked }))}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Admin</div>
              <div className="text-sm text-gray-500">{stats?.available.admin || 0} verfügbar</div>
            </div>
          </label>

          {/* Führungskraft Checkbox */}
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selectedGroups.führungskraft}
              onChange={(e) => setSelectedGroups(prev => ({ ...prev, führungskraft: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Führungskraft</div>
              <div className="text-sm text-gray-500">{stats?.available.führungskraft || 0} verfügbar</div>
            </div>
          </label>

          {/* Sales Checkbox */}
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selectedGroups.sales}
              onChange={(e) => setSelectedGroups(prev => ({ ...prev, sales: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">Sales</div>
              <div className="text-sm text-gray-500">{stats?.available.sales || 0} verfügbar</div>
            </div>
          </label>

          {/* User Checkbox */}
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selectedGroups.user}
              onChange={(e) => setSelectedGroups(prev => ({ ...prev, user: e.target.checked }))}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">User</div>
              <div className="text-sm text-gray-500">{stats?.available.user || 0} verfügbar</div>
            </div>
          </label>
        </div>

        {/* Schnell-Auswahl Buttons */}
        <div className="flex items-center space-x-2 mt-4">
          <button
            onClick={() => setSelectedGroups({ admin: true, führungskraft: true, sales: true, user: true })}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Alle auswählen
          </button>
          <button
            onClick={() => setSelectedGroups({ admin: true, führungskraft: true, sales: false, user: false })}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Nur Management
          </button>
          <button
            onClick={() => setSelectedGroups({ admin: false, führungskraft: false, sales: false, user: false })}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Alle abwählen
          </button>
        </div>
      </div>

      {/* Statistiken der Auswahl */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-gray-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats?.selected.total || 0}</div>
              <div className="text-sm text-gray-600">Ausgewählt</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-red-900">{stats?.selected.admin || 0}</div>
              <div className="text-sm text-gray-600">Admin</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-blue-900">{stats?.selected.führungskraft || 0}</div>
              <div className="text-sm text-gray-600">Führungskraft</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Mail className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-green-900">{stats?.selected.sales || 0}</div>
              <div className="text-sm text-gray-600">Sales</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-purple-600 mr-2" />
            <div>
              <div className="text-2xl font-bold text-purple-900">{stats?.selected.user || 0}</div>
              <div className="text-sm text-gray-600">User</div>
            </div>
          </div>
        </div>
      </div>

      {/* Informationen */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">🔐 Authentifizierungs-Konzept</h3>
        
        <div className="space-y-4 text-blue-800">
          <div>
            <h4 className="font-medium">1. Account-Erstellung:</h4>
            <p className="text-sm">Alle Benutzer mit <code>hasSystemAccess: true</code> bekommen einen Firebase Auth Account</p>
          </div>
          
          <div>
            <h4 className="font-medium">2. Standard-Passwort:</h4>
            <p className="text-sm"><code>TempPass2024!</code> - Benutzer müssen beim ersten Login ändern</p>
          </div>
          
          <div>
            <h4 className="font-medium">3. Rollen-Mapping:</h4>
            <p className="text-sm">Login-E-Mail → Suche in <code>utilizationData</code> → <code>systemRole</code> laden</p>
          </div>
          
          <div>
            <h4 className="font-medium">4. Passwort-Reset:</h4>
            <p className="text-sm">Automatische E-Mail-Links für alle neuen Accounts</p>
          </div>
        </div>
      </div>

      {/* Warnungen */}
      {(stats?.selected.total || 0) === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-yellow-800">
              <h4 className="font-medium">⚠️ Keine Benutzergruppen ausgewählt</h4>
              <p className="text-sm mt-1">
                Bitte wählen Sie mindestens eine Benutzergruppe aus, um Firebase Auth Accounts zu erstellen.
              </p>
            </div>
          </div>
        </div>
      )}

      {!passwordValidation.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
            <div className="text-red-800">
              <h4 className="font-medium">🔒 Passwort erfüllt nicht alle Anforderungen</h4>
              <p className="text-sm mt-1">
                Das Standard-Passwort muss mindestens 8 Zeichen lang sein und Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen enthalten.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aktionen */}
      <div className="flex items-center space-x-4">
        <button
          onClick={downloadUserList}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Benutzerliste herunterladen
        </button>

        <button
          onClick={createFirebaseAuthAccounts}
          disabled={processing || (stats?.selected.total || 0) === 0 || !passwordValidation.isValid}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2" />
          {processing ? 'Erstelle Accounts...' : `${stats?.selected.total || 0} Auth-Accounts erstellen`}
        </button>

        <button
          onClick={generatePasswordResetLinks}
          disabled={processing || (stats?.selected.total || 0) === 0}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Key className="w-4 h-4 mr-2" />
          {processing ? 'Sende E-Mails...' : 'Passwort-Reset E-Mails senden'}
        </button>
      </div>

      {/* Ergebnisse */}
      {results && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ergebnisse: {results.success} erfolgreich, {results.errors} Fehler
          </h3>
          
          <div className="max-h-64 overflow-y-auto">
            {results.details.map((detail, index) => (
              <div key={index} className="text-sm py-1 font-mono">
                {detail}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnung */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-yellow-800">
            <h4 className="font-medium">⚠️ Wichtiger Hinweis:</h4>
            <p className="text-sm mt-1">
              Diese Funktion benötigt Firebase Admin SDK mit Service Account Schlüssel. 
              Aktuell wird der Prozess simuliert. Für die echte Implementierung muss der 
              Server mit entsprechenden Berechtigungen konfiguriert werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
