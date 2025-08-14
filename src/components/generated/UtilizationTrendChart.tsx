import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

export interface UtilizationPoint {
  person: string;
  week: string; // e.g. "2025-KW33"
  utilization: number | null;
  isHistorical: boolean;
}

export interface UtilizationTrendChartProps {
  data: UtilizationPoint[];
  forecastStartWeek: number; // ISO week for the basis week (current week)
  lookbackWeeks: number;
  forecastWeeks: number;
  isoYear: number;
}

interface ChartRow {
  week: string;
  shortWeek: string;
  historical: number | null;
  forecast: number | null;
}

export function UtilizationTrendChart({
  data,
  forecastStartWeek,
  lookbackWeeks,
  forecastWeeks,
  isoYear
}: UtilizationTrendChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const chartData: ChartRow[] = useMemo(() => {
    // Build ordered list of week labels (strings used in data)
    const leftWeeks = Array.from({ length: lookbackWeeks }, (_, i) => (forecastStartWeek - lookbackWeeks + 1) + i);
    const rightWeeks = Array.from({ length: forecastWeeks }, (_, i) => (forecastStartWeek + 1) + i);
    const orderedWeeks = [...leftWeeks, ...rightWeeks].map(n => `${isoYear}-KW${n}`);

    // Aggregate per week: average of available values
    const groups = new Map<string, { historical: number[]; forecast: number[] }>();
    for (const w of orderedWeeks) {
      groups.set(w, { historical: [], forecast: [] });
    }
    data.forEach(item => {
      if (item.utilization == null) return;
      if (!groups.has(item.week)) return;
      const g = groups.get(item.week)!;
      if (item.isHistorical) g.historical.push(item.utilization);
      else g.forecast.push(item.utilization);
    });

    const rows: ChartRow[] = orderedWeeks.map(w => {
      const g = groups.get(w)!;
      const weekNumber = parseInt(w.split('-KW')[1] || '0', 10);
      const histAvg = g.historical.length ? Math.round((g.historical.reduce((s, v) => s + v, 0) / g.historical.length) * 10) / 10 : null;
      const foreAvg = g.forecast.length ? Math.round((g.forecast.reduce((s, v) => s + v, 0) / g.forecast.length) * 10) / 10 : null;
      return {
        week: w,
        shortWeek: `KW${weekNumber}`,
        historical: histAvg,
        forecast: foreAvg
      };
    });
    return rows;
  }, [data, lookbackWeeks, forecastWeeks, forecastStartWeek, isoYear]);

  const separatorIndex = useMemo(() => {
    // Separator is after the last left week
    return lookbackWeeks - 1;
  }, [lookbackWeeks]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Auslastungsverlauf</h3>
          <p className="text-sm text-gray-600">Ø-Auslastung pro Woche (links Rückblick inkl. Basiswoche, rechts Vorblick)</p>
        </div>
        <button onClick={() => setIsExpanded(v => !v)} className="px-3 py-1.5 text-xs border rounded-lg text-gray-700 bg-white hover:bg-gray-50">{isExpanded ? 'Kleiner' : 'Größer'}</button>
      </div>

      <motion.div animate={{ height: isExpanded ? 460 : 320 }} transition={{ duration: 0.25 }} className="relative">
        <div className="absolute inset-0 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 24, left: 16, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="shortWeek" tickLine={false} axisLine={false} height={48} angle={-45} textAnchor="end" stroke="#6b7280" fontSize={12} />
              <YAxis domain={[0, 130]} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} width={48} stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(v: any) => `${v}%`} labelFormatter={(l: any) => `${isoYear}-${l}`} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />

              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" />
              {separatorIndex >= 0 && chartData[separatorIndex] && (
                <ReferenceLine x={chartData[separatorIndex].shortWeek} stroke="#9ca3af" strokeDasharray="3 3" />
              )}

              <Line type="monotone" dataKey="historical" name="Rückblick" stroke="#3b82f6" strokeWidth={3} dot={false} connectNulls />
              <Line type="monotone" dataKey="forecast" name="Vorblick" stroke="#10b981" strokeWidth={3} strokeDasharray="8 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        Basiswoche: {isoYear}-KW{forecastStartWeek} • Rückblick: {lookbackWeeks}W • Vorblick: {forecastWeeks}W
      </div>
    </motion.div>
  );
}



