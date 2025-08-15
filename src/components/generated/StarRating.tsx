import React, { useMemo } from 'react';
// Hochwertige, gefüllte Sterne mit Half-Star-Unterstützung

interface StarRatingProps {
  value: number; // 0..5 in 0.5 steps
  max?: number; // default 5
  size?: number; // pixel size for icon
  className?: string;
  colorClassName?: string; // e.g. text-yellow-400
  backgroundClassName?: string; // e.g. text-gray-300
  gap?: number; // px gap between stars
  readOnly?: boolean; // kompatibilität; interaktiv ist nicht vorgesehen
}

export function StarRating({
  value,
  max = 5,
  size = 18,
  className = '',
  colorClassName = 'text-yellow-400',
  backgroundClassName = 'text-gray-300',
  gap = 4,
}: StarRatingProps) {
  const clamped = useMemo(() => Math.max(0, Math.min(max, Number(value || 0))), [value, max]);
  const full = Math.floor(clamped);
  const frac = clamped - full;
  const hasHalf = frac >= 0.5 - 1e-6;

  const StarFull = (
    <svg width={size} height={size} viewBox="0 0 24 24" className={colorClassName} aria-hidden>
      <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  );
  const StarEmpty = (
    <svg width={size} height={size} viewBox="0 0 24 24" className={backgroundClassName} aria-hidden>
      <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
  );

  const StarHalf = (
    <div style={{ width: size, height: size, position: 'relative' }} aria-hidden>
      {/* Base empty */}
      <div className="absolute inset-0">{StarEmpty}</div>
      {/* Left filled half */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: size / 2 }}>{StarFull}</div>
    </div>
  );

  const stars: React.ReactNode[] = [];
  for (let i = 0; i < max; i++) {
    if (i < full) stars.push(<span key={`s-${i}`} style={{ display: 'inline-block', marginRight: i < max - 1 ? gap : 0 }}>{StarFull}</span>);
    else if (i === full && hasHalf) stars.push(<span key={`s-${i}`} style={{ display: 'inline-block', marginRight: i < max - 1 ? gap : 0 }}>{StarHalf}</span>);
    else stars.push(<span key={`s-${i}`} style={{ display: 'inline-block', marginRight: i < max - 1 ? gap : 0 }}>{StarEmpty}</span>);
  }

  return (
    <div className={`inline-flex items-center ${className}`} aria-label={`${clamped.toFixed(1)} von ${max} Sternen`}>
      {stars}
    </div>
  );
}

export default StarRating;


