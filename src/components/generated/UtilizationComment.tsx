import React, { useEffect, useState } from 'react';
import { MessageSquare, ArrowLeft, Save, X, Trash2, Loader2 } from 'lucide-react';
// DatabaseService removed - using direct Firebase calls
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

interface UtilizationCommentProps {
  personId: string;
  initialValue?: string;
  onLocalChange?: (value: string) => void;
  className?: string;
}

export function UtilizationComment({ personId, initialValue, onLocalChange, className = '' }: UtilizationCommentProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string>(initialValue || '');
  const [remoteValue, setRemoteValue] = useState<string>(initialValue || '');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Direct Firebase call to utilizationData collection
        const utilizationSnapshot = await getDocs(collection(db, 'utilizationData'));
        const utilizationDoc = utilizationSnapshot.docs.find(doc => doc.data().person === personId || doc.id === personId);
        const utilizationData = utilizationDoc?.data();
        if (!cancelled && utilizationData) {
          const v = String(utilizationData.utilizationComment || '');
          setValue(v);
          setRemoteValue(v);
        }
      } catch (e) {
        if (!cancelled) setError('Fehler beim Laden des Auslastungskommentars');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [personId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Direct Firebase call to utilizationData collection
      const utilizationSnapshot = await getDocs(collection(db, 'utilizationData'));
      const existingDoc = utilizationSnapshot.docs.find(doc => doc.data().person === personId || doc.id === personId);
      const existing = existingDoc?.data();
      
      if (existing) {
        // Update existing utilizationData document
        const docRef = doc(db, 'utilizationData', existingDoc.id);
        await setDoc(docRef, { utilizationComment: value || '' }, { merge: true });
      } else {
        // Create new utilizationData document if it doesn't exist
        const docRef = doc(db, 'utilizationData', personId);
        await setDoc(docRef, { 
          id: personId,
          person: personId,
          utilizationComment: value || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      setRemoteValue(value);
      onLocalChange?.(value);
    } catch (e) {
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      // Direct Firebase call to utilizationData collection
      const utilizationSnapshot = await getDocs(collection(db, 'utilizationData'));
      const existingDoc = utilizationSnapshot.docs.find(doc => doc.data().person === personId || doc.id === personId);
      const existing = existingDoc?.data();
      
      if (existing) {
        // Update existing utilizationData document
        const docRef = doc(db, 'utilizationData', existingDoc.id);
        await setDoc(docRef, { utilizationComment: '' }, { merge: true });
      }
      setValue('');
      setRemoteValue('');
      onLocalChange?.('');
    } catch (e) {
      setError('Fehler beim Löschen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Loader2 className="w-3 h-3 animate-spin" /> Lädt...
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={() => {
                // Auto-Save beim Verlassen des Feldes
                if (value !== remoteValue && value.trim() !== '') {
                  handleSave();
                }
              }}
              rows={1}
              className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Auslastung..."
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors cursor-pointer"
                title="Speichern"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => { setValue(remoteValue); }}
                disabled={saving}
                className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors cursor-pointer"
                title="Abbrechen"
              >
                <X className="w-3 h-3" />
              </button>
              {remoteValue && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors cursor-pointer"
                  title="Löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UtilizationComment;


