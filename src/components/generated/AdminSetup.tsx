import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useUtilizationData } from '../../contexts/UtilizationDataContext';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminSetup() {
  const { databaseData } = useUtilizationData();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const setupOliverAsAdmin = async () => {
    try {
      setApplying(true);
      console.log('🔍 Suche nach Oliver Koss...');
      
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
          roleAssignedAt: new Date(),
          roleAssignedBy: 'initial-admin-setup'
        });
        
        setMessage({ 
          type: 'success', 
          text: `🎉 ${oliverData.person} (${oliverData.email}) wurde erfolgreich als Administrator eingerichtet!` 
        });
        
        // Seite neu laden um die Änderungen zu übernehmen
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        
      } else {
        console.log('❌ Oliver nicht gefunden. Verfügbare Personen:');
        utilizationDataArray.forEach((user: any) => {
          if (user.person?.toLowerCase().includes('koss') || user.email?.toLowerCase().includes('koss')) {
            console.log(`  - ${user.person} (${user.email})`);
          }
        });
        
        setMessage({ 
          type: 'error', 
          text: 'Oliver Koss nicht gefunden. Bitte prüfen Sie die Konsole für verfügbare Benutzer.' 
        });
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Admin-Setup:', error);
      setMessage({ type: 'error', text: 'Fehler beim Einrichten der Admin-Rolle: ' + (error as Error).message });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Administrator einrichten</h2>
          <p className="text-gray-600 mb-6">
            Richten Sie Oliver Koss (oliver.koss@adesso.de) als Administrator ein.
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
            onClick={setupOliverAsAdmin}
            disabled={applying}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mx-auto"
          >
            <Shield className="w-5 h-5 mr-2" />
            {applying ? 'Wird eingerichtet...' : 'Oliver als Admin einrichten'}
          </button>

          {message?.type === 'success' && (
            <p className="text-sm text-gray-500 mt-4">
              Die Seite wird in wenigen Sekunden automatisch neu geladen...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
