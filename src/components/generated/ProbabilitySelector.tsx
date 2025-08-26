import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { ProbabilitySelectorProps, ProbabilityLevel, PROBABILITY_OPTIONS } from '../../types/projects';

export function ProbabilitySelector({
  value,
  onChange,
  label = 'Wahrscheinlichkeit',
  showPercentage = true
}: ProbabilitySelectorProps) {

  const getIcon = (probability: ProbabilityLevel) => {
    switch (probability) {
      case 25: return <AlertCircle className="w-4 h-4" />;
      case 50: return <TrendingUp className="w-4 h-4" />;
      case 75: return <Target className="w-4 h-4" />;
      case 100: return <CheckCircle className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const selectedOption = PROBABILITY_OPTIONS.find(opt => opt.value === value);

  return (
    <div className="space-y-2">
      {/* Probability Options Grid */}
      <div className="grid grid-cols-2 gap-3">
        {PROBABILITY_OPTIONS.map(option => {
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                relative px-4 py-2 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
              )}

              {/* Content */}
              <div className="flex items-center space-x-3">
                {/* Icon */}
                <div className={`
                  p-2 rounded-full
                  ${isSelected ? option.color : 'bg-gray-100 text-gray-600'}
                `}>
                  {getIcon(option.value)}
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{option.label}</span>
                    {showPercentage && (
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-medium
                        ${isSelected ? option.color : 'bg-gray-100 text-gray-600'}
                      `}>
                        {option.value}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Alternative: Dropdown-Version für kompakte Darstellung
export function ProbabilityDropdown({
  value,
  onChange,
  label = 'Wahrscheinlichkeit',
  showPercentage = true
}: ProbabilitySelectorProps) {
  const selectedOption = PROBABILITY_OPTIONS.find(opt => opt.value === value);

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Dropdown */}
      <select
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) as ProbabilityLevel)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Wahrscheinlichkeit auswählen</option>
        {PROBABILITY_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.value}%) - {option.description}
          </option>
        ))}
      </select>

      {/* Selected Value Display */}
      {selectedOption && (
        <div className="flex items-center space-x-2 text-sm">
          <div className={`p-1 rounded-full ${selectedOption.color}`}>
            {getIcon(selectedOption.value)}
          </div>
          <span className="text-gray-600">
            {selectedOption.description}
          </span>
        </div>
      )}
    </div>
  );
}
