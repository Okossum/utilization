import React from 'react';
import { Star } from 'lucide-react';
interface SkillRatingProps {
  rating: number;
  maxRating?: number;
}

// @component: SkillRating
export const SkillRating = ({
  rating,
  maxRating = 5
}: SkillRatingProps) => {
  // @return
  return <div className="flex items-center gap-1">
      {Array.from({
      length: maxRating
    }, (_, index) => {
      const starNumber = index + 1;
      const isFilled = starNumber <= rating;
      const isHalfFilled = starNumber - 0.5 === rating;
      return <div key={index} className="relative">
            <Star className={`w-4 h-4 ${isFilled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
            {isHalfFilled && <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>}
          </div>;
    })}
      <span className="text-xs text-slate-500 ml-1">
        {rating}/{maxRating}
      </span>
    </div>;
};