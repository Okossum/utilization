import React, { useMemo } from 'react';

interface AuslastungRow {
  person: string;
  lob: string;
  bereich: string;
  cc: string;
  team: string;
  values: Record<string, number>; // label -> percent
}

interface AuslastungPreviewExplorerProps {
  rows: AuslastungRow[];
  maxWeeks?: number; // default 8
}

export function AuslastungPreviewExplorer({ rows, maxWeeks = 8 }: AuslastungPreviewExplorerProps) {
  const { weeks, previewRows } = useMemo(() => {
    const weekSet = new Set<string>();
    for (const r of rows) {
      // Support both structures: values object and flat properties
      if (r.values && typeof r.values === 'object') {
        Object.keys(r.values).forEach(w => weekSet.add(w));
      } else {
        // Look for YY/WW format keys directly in row properties
        Object.keys(r).forEach(key => {
          if (key.match(/^\d{2}\/\d{2}$/)) {
            weekSet.add(key);
          }
        });
      }
    }
    const sortedWeeks = Array.from(weekSet).sort((a, b) => {
      // a = "25/33" (YY/WW format)
      const pa = a.match(/^(\d{2})\/(\d{2})$/);
      const pb = b.match(/^(\d{2})\/(\d{2})$/);
      if (!pa || !pb) return a.localeCompare(b);
      const ya = parseInt(`20${pa[1]}`, 10); // Convert YY to YYYY
      const wa = parseInt(pa[2], 10);
      const yb = parseInt(`20${pb[1]}`, 10); // Convert YY to YYYY
      const wb = parseInt(pb[2], 10);
      if (ya !== yb) return ya - yb;
      return wa - wb;
    });
    const weeks = sortedWeeks.slice(0, maxWeeks);
    const previewRows = rows.slice(0, 200).map(r => ({
      ...r,
      // ensure number formatting with 1 decimal - support both structures
      formatted: weeks.map(w => {
        let value;
        if (r.values && typeof r.values === 'object') {
          value = r.values[w];
        } else {
          value = r[w];
        }
        return value === undefined ? '' : `${Math.round(value * 10) / 10}%`;
      })
    }));
    return { weeks, previewRows };
  }, [rows, maxWeeks]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Auslastung – Datenvoransicht</h3>
        <p className="text-sm text-gray-600 mt-1">Dimensionen je Person und die ersten {maxWeeks} Kalenderwochen (vereinheitlicht)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LoB</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bereich</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CC</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
              {weeks.map(w => (
                <th key={w} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-20">{w}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewRows.map(r => (
              <tr key={`${r.person}-${r.cc}-${r.team}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-900">{r.person}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-700">{r.lob}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-700">{r.bereich}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-700">{r.cc}</td>
                <td className="px-3 py-3 whitespace-nowrap text-gray-700">{r.team}</td>
                {weeks.map((w, idx) => (
                  <td key={w} className="px-3 py-3 text-center text-gray-800">{r.formatted[idx]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




