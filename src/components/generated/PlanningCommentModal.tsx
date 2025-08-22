import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MessageSquare, ArrowRight, Check, Trash2, Loader2 } from 'lucide-react';
// DatabaseService removed - using direct Firebase calls
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

interface PlanningCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
}

export function PlanningCommentModal({ isOpen, onClose, personId }: PlanningCommentModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<string>('');
  const [remoteValue, setRemoteValue] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !personId) return;
      setLoading(true);
      setError(null);
      try {
        // Direct Firebase call instead of DatabaseService
        const dossierSnapshot = await getDocs(collection(db, 'employee_dossiers'));
        const dossierDoc = dossierSnapshot.docs.find(doc => doc.data().name === personId || doc.id === personId);
        const dossier = dossierDoc?.data();
        if (!cancelled && dossier) {
          const v = String(dossier.planningComment || '');
          setValue(v);
          setRemoteValue(v);
        }
      } catch (e) {
        if (!cancelled) setError('Fehler beim Laden des Einsatzplan-Kommentars');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, personId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Direct Firebase call instead of DatabaseService
      const dossierSnapshot = await getDocs(collection(db, 'employee_dossiers'));
      const existingDoc = dossierSnapshot.docs.find(doc => doc.data().name === personId || doc.id === personId);
      const existing = existingDoc?.data();
      
      const payload = {
        id: existing?.employeeId || personId,
        name: existing?.name || '',
        email: existing?.email || '',
        phone: existing?.phone || '',
        strengths: existing?.strengths || '',
        weaknesses: existing?.weaknesses || '',
        comments: existing?.comments || '',
        utilizationComment: existing?.utilizationComment || '',
        planningComment: value || '',
        travelReadiness: existing?.travelReadiness || '',
        projectHistory: existing?.projectHistory || [],
        projectOffers: existing?.projectOffers || [],
        jiraTickets: existing?.jiraTickets || [],
        skills: existing?.skills || [],
        excelData: existing?.excelData || {},
        uid: existing?.uid || personId,
        displayName: existing?.displayName || existing?.name || '',
        experience: existing?.experience || '',
      };
      
      const docRef = existingDoc ? doc(db, 'employee_dossiers', existingDoc.id) : doc(db, 'employee_dossiers', personId);
      await setDoc(docRef, payload, { merge: true });
      setRemoteValue(value);
      onClose();
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
      // Direct Firebase call instead of DatabaseService
      const dossierSnapshot = await getDocs(collection(db, 'employee_dossiers'));
      const existingDoc = dossierSnapshot.docs.find(doc => doc.data().name === personId || doc.id === personId);
      const existing = existingDoc?.data();
      
      const payload = {
        id: existing?.employeeId || personId,
        name: existing?.name || '',
        email: existing?.email || '',
        phone: existing?.phone || '',
        strengths: existing?.strengths || '',
        weaknesses: existing?.weaknesses || '',
        comments: existing?.comments || '',
        utilizationComment: existing?.utilizationComment || '',
        planningComment: '',
        travelReadiness: existing?.travelReadiness || '',
        projectHistory: existing?.projectHistory || [],
        projectOffers: existing?.projectOffers || [],
        jiraTickets: existing?.jiraTickets || [],
        skills: existing?.skills || [],
        excelData: existing?.excelData || {},
        uid: existing?.uid || personId,
        displayName: existing?.displayName || existing?.name || '',
        experience: existing?.experience || '',
      };
      
      const docRef = existingDoc ? doc(db, 'employee_dossiers', existingDoc.id) : doc(db, 'employee_dossiers', personId);
      await setDoc(docRef, payload, { merge: true });
      setValue('');
      setRemoteValue('');
      onClose();
    } catch (e) {
      setError('Fehler beim Löschen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="absolute inset-0 p-4 overflow-auto">
            <motion.div className="relative max-w-2xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-900 font-medium">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  Einsatzplan-Kommentar
                </div>
                <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X className="w-4 h-4 text-gray-500"/></button>
              </div>
              <div className="p-4 space-y-3">
                {error && (
                  <div className="p-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded">{error}</div>
                )}
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Lädt...
                  </div>
                ) : (
                  <>
                    <textarea
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Kommentar zum Einsatzplan / Vorblick..."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-3 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" /> Speichern
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" /> Abbrechen
                      </button>
                      {remoteValue && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-3 py-2 text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Löschen
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PlanningCommentModal;


