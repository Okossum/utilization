import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, AlertTriangle } from 'lucide-react';
import { auslastungserklaerungService, personAuslastungserklaerungService } from '../../lib/firebase-services';

interface Auslastungserklaerung {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AuslastungserklaerungManagement() {
  const [auslastungserklaerungen, setAuslastungserklaerungen] = useState<Auslastungserklaerung[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newName, setNewName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Lade alle Auslastungserklärungen
  const loadAuslastungserklaerungen = async () => {
    try {
      setLoading(true);
      const data = await auslastungserklaerungService.getAll();
      setAuslastungserklaerungen(data);
    } catch (error) {
      // console.error entfernt
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuslastungserklaerungen();
  }, []);

  // Neue Auslastungserklärung hinzufügen
  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    try {
      await auslastungserklaerungService.save({ name: newName.trim() });
      setNewName('');
      await loadAuslastungserklaerungen();
    } catch (error) {
      // console.error entfernt
    }
  };

  // Bearbeitung starten
  const startEdit = (item: Auslastungserklaerung) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  // Bearbeitung abbrechen
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Änderungen speichern
  const handleSave = async () => {
    if (!editingId || !editingName.trim()) return;
    
    try {
      await auslastungserklaerungService.update(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      await loadAuslastungserklaerungen();
    } catch (error) {
      // console.error entfernt
    }
  };

  // Löschen bestätigen
  const confirmDelete = (item: Auslastungserklaerung) => {
    setShowDeleteConfirm(item.id);
    setDeleteConfirmName(item.name);
  };

  // Löschen abbrechen
  const cancelDelete = () => {
    setShowDeleteConfirm(null);
    setDeleteConfirmName('');
  };

  // Auslastungserklärung löschen (Soft-Delete)
  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      // Prüfe ob der Status noch verwendet wird
      const allPersonStatuses = await personAuslastungserklaerungService.getAll();
      const isInUse = allPersonStatuses.some(ps => ps.auslastungserklaerung === showDeleteConfirm);
      
      if (isInUse) {
        // Soft-Delete wenn noch verwendet
        await auslastungserklaerungService.softDelete(showDeleteConfirm);
      } else {
        // Hard-Delete wenn nicht verwendet
        await auslastungserklaerungService.delete(showDeleteConfirm);
      }
      
      setShowDeleteConfirm(null);
      setDeleteConfirmName('');
      await loadAuslastungserklaerungen();
    } catch (error) {
      // console.error entfernt
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Lade Auslastungserklärungen...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Auslastungserklärung-Verwaltung</h2>
        <p className="text-gray-600">Verwalten Sie die verfügbaren Auslastungserklärungen für Mitarbeiter</p>
      </div>

      {/* Neue Auslastungserklärung hinzufügen */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Neue Auslastungserklärung hinzufügen</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name der Auslastungserklärung"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>
      </div>

      {/* Liste der Auslastungserklärungen */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Verfügbare Auslastungserklärungen</h3>
        </div>
        
        {auslastungserklaerungen.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Keine Auslastungserklärungen vorhanden
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {auslastungserklaerungen.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                {editingId === item.id ? (
                  // Bearbeitungsmodus
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <button
                      onClick={handleSave}
                      disabled={!editingName.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Anzeigemodus
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                      <span className="text-gray-900 font-medium">{item.name}</span>
                      {!item.isActive && (
                        <span className="text-xs text-gray-500">
                          (wird noch verwendet)
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(item)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lösch-Bestätigung Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900">Auslastungserklärung löschen</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              Möchten Sie die Auslastungserklärung <strong>"{deleteConfirmName}"</strong> wirklich löschen?
            </p>
            
            <p className="text-sm text-gray-500 mb-6 bg-yellow-50 p-3 rounded-lg">
              <strong>Hinweis:</strong> Falls diese Auslastungserklärung noch Mitarbeitern zugeordnet ist, 
              wird sie nur deaktiviert (Soft-Delete) und bleibt für bestehende Zuordnungen sichtbar.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
