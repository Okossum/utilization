import React, { useMemo, useRef } from 'react';
// Custom SVG star for precise fill control

interface StarRatingProps {
  value: number; // 0..5 in 0.5 steps
  onChange?: (value: number) => void;
  max?: number; // default 5
  step?: number; // default 0.5
  readOnly?: boolean;
  size?: number; // pixel size for icon
  className?: string;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  step = 0.5,
  readOnly = false,
  size = 20,
  className = ''
}: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const percentage = useMemo(() => {
    const clamped = Math.max(0, Math.min(max, value || 0));
    return (clamped / max) * 100;
  }, [value, max]);

  const handlePointer = (clientX: number) => {
    if (readOnly || !containerRef.current || !onChange) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const raw = ratio * max;
    const snapped = Math.round(raw / step) * step;
    const clamped = Math.max(0, Math.min(max, Number(snapped.toFixed(2))));
    onChange(clamped);
  };

  const onClick = (e: React.MouseEvent) => handlePointer(e.clientX);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.max(0, Math.min(max, Number((value + step).toFixed(2)))));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(0, Math.min(max, Number((value - step).toFixed(2)))));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block select-none ${readOnly ? '' : 'cursor-pointer'} ${className}`}
      role={readOnly ? 'img' : 'slider'}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number((value || 0).toFixed(1))}
      tabIndex={readOnly ? -1 : 0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{ width: size * max, height: size }}
    >
      {/* Base (empty) */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: max }).map((_, i) => (
          <svg key={`base-${i}`} width={size} height={size} viewBox="0 0 24 24" className="text-gray-300">
            <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        ))}
      </div>
      {/* Filled overlay */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${percentage}%` }}>
        <div className="flex text-yellow-400">
          {Array.from({ length: max }).map((_, i) => (
            <svg key={`fill-${i}`} width={size} height={size} viewBox="0 0 24 24" className="fill-yellow-400">
              <path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StarRating;


