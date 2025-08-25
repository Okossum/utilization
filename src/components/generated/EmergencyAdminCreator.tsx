import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Shield, CheckCircle, AlertTriangle, User } from 'lucide-react';

export default function EmergencyAdminCreator() {
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const createAdminUser = async () => {
    try {
      setCreating(true);
      console.log('🚨 NOTFALL: Erstelle Admin-Benutzer für Oliver Koss...');
      
      // Admin-Daten für Oliver Koss
      const adminData = {
        person: 'Koss, Oliver',
        email: 'oliver.koss@adesso.de',
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
        emergencyReason: 'Admin-Zugriff nach Datenbank-Reset wiederhergestellt'
      };

      // Verwende E-Mail als Document-ID für eindeutige Identifikation
      const docId = 'oliver_koss_adesso_de';
      await setDoc(doc(db, 'utilizationData', docId), adminData);

      console.log('✅ Admin-Benutzer Oliver Koss erfolgreich erstellt');
      
      setMessage({ 
        type: 'success', 
        text: '🎉 Admin-Benutzer Oliver Koss erfolgreich erstellt! Bitte Seite neu laden.' 
      });
      
      // Seite nach 3 Sekunden neu laden
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Admin-Benutzers:', error);
      setMessage({ 
        type: 'error', 
        text: 'Fehler beim Erstellen des Admin-Benutzers: ' + (error as Error).message 
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">🚨 Notfall: Admin-Benutzer erstellen</h2>
          <p className="text-red-700 mb-6">
            Die utilizationData Collection ist leer oder Oliver Koss wurde nicht gefunden.
            <br />
            Hier können Sie einen Admin-Benutzer für Oliver Koss direkt erstellen.
          </p>

          {/* Benutzer-Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <User className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-semibold">Zu erstellender Admin:</span>
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Name:</strong> Koss, Oliver</p>
              <p><strong>E-Mail:</strong> oliver.koss@adesso.de</p>
              <p><strong>Rolle:</strong> admin</p>
            </div>
          </div>

          {/* Nachricht */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center justify-center">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2" />
                )}
                {message.text}
              </div>
            </div>
          )}

          <button
            onClick={createAdminUser}
            disabled={creating}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors mx-auto"
          >
            <Shield className="w-5 h-5 mr-2" />
            {creating ? 'Wird erstellt...' : 'Admin-Benutzer erstellen'}
          </button>

          <div className="mt-4 text-xs text-gray-500">
            ⚠️ Dieser Vorgang erstellt einen Admin-Eintrag direkt in der Firebase-Datenbank
          </div>
        </div>
      </div>
    </div>
  );
}
