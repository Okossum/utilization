import React, { useMemo, useRef } from 'react';
import { Star } from 'lucide-react';

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
          <Star key={`base-${i}`} width={size} height={size} className="text-gray-300" />
        ))}
      </div>
      {/* Filled overlay */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${percentage}%` }}>
        <div className="flex">
          {Array.from({ length: max }).map((_, i) => (
            <Star key={`fill-${i}`} width={size} height={size} className="text-yellow-400 fill-yellow-400" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default StarRating;


