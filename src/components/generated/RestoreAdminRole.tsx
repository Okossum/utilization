import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RestoreAdminRole() {
  const { databaseData } = useUtilizationData();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const restoreOliverAsAdmin = async () => {
    try {
      setApplying(true);
      console.log('🔧 Stelle Oliver Admin-Rolle wieder her...');
      
      // Suche nach Oliver Koss in den utilizationData
      const utilizationDataArray = databaseData?.utilizationData || [];
      const oliverData = utilizationDataArray.find((user: any) => 
        user.person === 'Koss, Oliver' || 
        user.email === 'oliver.koss@adesso.de' ||
        user.person?.toLowerCase().includes('koss') ||
        user.email?.toLowerCase().includes('oliver.koss')
      );
      
      if (oliverData) {
        console.log('✅ Oliver gefunden:', oliverData.person, oliverData.email);

        
        await updateDoc(doc(db, 'utilizationData', oliverData.id), {
          systemRole: 'admin',
          hasSystemAccess: true,
          roleRestoredAt: new Date(),
          roleRestoredBy: 'admin-restore-script',
          roleRestoredReason: 'Admin-Rolle nach automatischer Zuweisung wiederhergestellt'
        });
        
        setMessage({ 
          type: 'success', 
          text: `🎉 Admin-Rolle für ${oliverData.person} erfolgreich wiederhergestellt!` 
        });
        
        // Seite neu laden um die Änderungen zu übernehmen
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Oliver Koss nicht gefunden. Bitte prüfen Sie die Konsole.' 
        });
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Wiederherstellen der Admin-Rolle:', error);
      setMessage({ type: 'error', text: 'Fehler beim Wiederherstellen der Admin-Rolle: ' + (error as Error).message });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Admin-Rolle wiederherstellen</h2>
          <p className="text-red-700 mb-6">
            Die automatische Rollen-Zuweisung hat versehentlich die Admin-Rolle überschrieben.
            <br />
            Hier können Sie Oliver Koss die Admin-Rolle zurückgeben.
          </p>

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
            onClick={restoreOliverAsAdmin}
            disabled={applying}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors mx-auto"
          >
            <Shield className="w-5 h-5 mr-2" />
            {applying ? 'Wird wiederhergestellt...' : 'Admin-Rolle wiederherstellen'}
          </button>

          {message?.type === 'success' && (
            <p className="text-sm text-gray-500 mt-4">
              Die Seite wird automatisch neu geladen...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
