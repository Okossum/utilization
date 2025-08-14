import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Car, X } from 'lucide-react';

export interface TravelReadinessOption {
  value: number;
  label: string;
}

const TRAVEL_READINESS_OPTIONS: TravelReadinessOption[] = [
  { value: 0, label: '0%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100%' },
];

interface TravelReadinessSelectorProps {
  person: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function TravelReadinessSelector({ person, value, onChange }: TravelReadinessSelectorProps) {
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

  const selectedOption = TRAVEL_READINESS_OPTIONS.find(option => option.value === value);

  const handleSelect = (optionValue: number) => {
    onChange(optionValue === value ? undefined : optionValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {selectedOption ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">{selectedOption.label}</span>
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Reisebereitschaft entfernen"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleToggle}
          className="flex items-center justify-center gap-2 px-1 py-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Car className="w-4 h-4" />
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-30 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-2">Reisebereitschaft auswählen</div>
            {TRAVEL_READINESS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-center px-3 py-2 text-sm rounded hover:bg-gray-50 transition-colors ${
                  value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
