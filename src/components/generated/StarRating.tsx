import React, { useMemo, useState } from 'react';
// Hochwertige, gefüllte Sterne mit Half-Star-Unterstützung

interface StarRatingProps {
  value: number; // 0..5 in 0.5 steps
  max?: number; // default 5
  size?: number; // pixel size for icon
  className?: string;
  colorClassName?: string; // e.g. text-yellow-400
  backgroundClassName?: string; // e.g. text-gray-300
  gap?: number; // px gap between stars
  readOnly?: boolean; // wenn false und onChange vorhanden → klickbar
  onChange?: (value: number) => void; // 1..max
}

export function StarRating({
  value,
  max = 5,
  size = 18,
  className = '',
  colorClassName = 'text-yellow-400',
  backgroundClassName = 'text-gray-300',
  gap = 4,
  readOnly = true,
  onChange,
}: StarRatingProps) {
  const clamped = useMemo(() => Math.max(0, Math.min(max, Number(value || 0))), [value, max]);
  const full = Math.floor(clamped);
  const [hover, setHover] = useState<number | null>(null);
  const displayFull = Math.floor(hover ?? full);

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

  const stars: React.ReactNode[] = [];
  for (let i = 0; i < max; i++) {
    const isActive = i < displayFull;
    const node = isActive ? StarFull : StarEmpty;
    const interactive = !readOnly && typeof onChange === 'function';
    stars.push(
      <button
        key={`s-${i}`}
        type="button"
        className={`p-0 m-0 bg-transparent border-0 ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ display: 'inline-block', marginRight: i < max - 1 ? gap : 0, lineHeight: 0 }}
        onMouseEnter={interactive ? () => setHover(i + 1) : undefined}
        onMouseLeave={interactive ? () => setHover(null) : undefined}
        onFocus={interactive ? () => setHover(i + 1) : undefined}
        onBlur={interactive ? () => setHover(null) : undefined}
        onClick={interactive ? () => onChange!(i + 1) : undefined}
        aria-label={`${i + 1} Sterne`}
      >
        {node}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`} aria-label={`${Math.floor(clamped)} von ${max} Sternen`}>
      {stars}
    </div>
  );
}

export default StarRating;


