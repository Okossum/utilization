import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, Baby, Heart, Thermometer, X, UserX, GraduationCap, Clock, Plane, Flag } from 'lucide-react';

export interface StatusLabel {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const STATUS_OPTIONS: StatusLabel[] = [
  { id: 'vacation', label: 'Urlaub', icon: <Plane className="w-4 h-4" />, color: 'text-blue-600' },
  { id: 'parental-leave', label: 'Elternzeit', icon: <Baby className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'maternity-leave', label: 'Mutterschutz', icon: <Heart className="w-4 h-4" />, color: 'text-pink-600' },
  { id: 'sick-leave', label: 'Krankheit', icon: <Thermometer className="w-4 h-4" />, color: 'text-red-600' },
  { id: 'long-absence', label: 'Lange Abwesent', icon: <Clock className="w-4 h-4" />, color: 'text-orange-600' },
  { id: 'termination', label: 'Kündigung', icon: <UserX className="w-4 h-4" />, color: 'text-gray-600' },
];

interface StatusLabelSelectorProps {
  person: string;
  value: string | undefined;
  onChange: (status: string | undefined) => void;
  isManual?: boolean; // Flag für manuelle Änderungen
}

export function StatusLabelSelector({ person, value, onChange, isManual = false }: StatusLabelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedStatus = STATUS_OPTIONS.find(s => s.id === value);

  const handleSelect = (statusId: string) => {
    onChange(statusId === value ? undefined : statusId);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {selectedStatus ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">{selectedStatus.label}</span>
            {isManual && (
              <div title="Manuell gesetzt">
                <Flag className="w-3 h-3 text-blue-600" />
              </div>
            )}
          </div>
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Status entfernen"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <span>Status</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-30 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-2">Status auswählen</div>
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.id}
                onClick={() => handleSelect(status.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors ${
                  value === status.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span className={status.color}>
                  {status.icon}
                </span>
                <span>{status.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
