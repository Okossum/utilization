import React, { useEffect, useState } from 'react';
import { MessageSquare, ArrowLeft, Check, X, Trash2, Loader2 } from 'lucide-react';
import DatabaseService from '../../services/database';

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
        const dossier = await DatabaseService.getEmployeeDossier(personId);
        if (!cancelled && dossier) {
          const v = String(dossier.utilizationComment || '');
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
      const existing = await DatabaseService.getEmployeeDossier(personId);
      const payload = {
        id: existing?.employeeId || personId,
        name: existing?.name || '',
        email: existing?.email || '',
        phone: existing?.phone || '',
        strengths: existing?.strengths || '',
        weaknesses: existing?.weaknesses || '',
        comments: existing?.comments || '',
        utilizationComment: value || '',
        travelReadiness: existing?.travelReadiness || '',
        projectHistory: existing?.projectHistory || [],
        projectOffers: existing?.projectOffers || [],
        jiraTickets: existing?.jiraTickets || [],
        skills: existing?.skills || [],
        excelData: existing?.excelData || {},
      };
      await DatabaseService.saveEmployeeDossier(personId, payload);
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
      const existing = await DatabaseService.getEmployeeDossier(personId);
      const payload = {
        id: existing?.employeeId || personId,
        name: existing?.name || '',
        email: existing?.email || '',
        phone: existing?.phone || '',
        strengths: existing?.strengths || '',
        weaknesses: existing?.weaknesses || '',
        comments: existing?.comments || '',
        utilizationComment: '',
        travelReadiness: existing?.travelReadiness || '',
        projectHistory: existing?.projectHistory || [],
        projectOffers: existing?.projectOffers || [],
        jiraTickets: existing?.jiraTickets || [],
        skills: existing?.skills || [],
        excelData: existing?.excelData || {},
      };
      await DatabaseService.saveEmployeeDossier(personId, payload);
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-gray-900 font-medium">
        <MessageSquare className="w-4 h-4 text-blue-600" />
        <ArrowLeft className="w-4 h-4 text-blue-600" />
        Auslastungskommentar
      </div>

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
            placeholder="Kommentar zur Auslastung / Act-Notizen..."
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
              onClick={() => { setValue(remoteValue); }}
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
  );
}

export default UtilizationComment;


