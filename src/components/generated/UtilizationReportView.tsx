import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Download, FileSpreadsheet, AlertCircle, Users, TrendingUp, Star, Info, Minus, Plus } from 'lucide-react';
import { UploadPanel } from './UploadPanel';
import { PersonFilterBar } from './PersonFilterBar';
import { KpiCardsGrid } from './KpiCardsGrid';
import { UtilizationChartSection } from './UtilizationChartSection';
interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
  mpid?: string;
}
interface UploadedFile {
  name: string;
  data: UtilizationData[];
  isValid: boolean;
  error?: string;
  mpid?: string;
}
export function UtilizationReportView() {
  const [uploadedFiles, setUploadedFiles] = useState<{
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }>({});
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [forecastStartWeek, setForecastStartWeek] = useState(33);
  const [lookbackWeeks, setLookbackWeeks] = useState(8);
  const [forecastWeeks, setForecastWeeks] = useState(4);

  // Mock data for demonstration
  const mockData: UtilizationData[] = useMemo(() => {
    const persons = ['Max Mustermann', 'Anna Schmidt', 'Peter Weber', 'Lisa Müller', 'Tom Fischer'];
    const totalWeeks = lookbackWeeks + forecastWeeks;
    const startWeek = forecastStartWeek - lookbackWeeks;
    const weeks = Array.from({
      length: totalWeeks
    }, (_, i) => `2025-KW${startWeek + i}`);
    return persons.flatMap(person => weeks.map((week, weekIndex) => ({
      person,
      week,
      utilization: Math.random() > 0.1 ? Math.round(Math.random() * 40 + 70) : null,
      isHistorical: weekIndex < lookbackWeeks
    })));
  }, [lookbackWeeks, forecastWeeks, forecastStartWeek]);
  const filteredData = useMemo(() => {
    if (selectedPersons.length === 0) return mockData;
    return mockData.filter(item => selectedPersons.includes(item.person));
  }, [mockData, selectedPersons]);
  const allPersons = useMemo(() => {
    return Array.from(new Set(mockData.map(item => item.person)));
  }, [mockData]);
  const kpiData = useMemo(() => {
    const historicalData = filteredData.filter(item => item.isHistorical && item.utilization !== null);
    const forecastData = filteredData.filter(item => !item.isHistorical && item.utilization !== null);
    const avgHistorical = historicalData.length > 0 ? historicalData.reduce((sum, item) => sum + item.utilization!, 0) / historicalData.length : 0;
    const avgForecast = forecastData.length > 0 ? forecastData.reduce((sum, item) => sum + item.utilization!, 0) / forecastData.length : 0;
    const overUtilized = filteredData.filter(item => item.utilization && item.utilization > 100).length;
    const missingValues = filteredData.filter(item => item.utilization === null).length;
    return {
      avgHistorical: Math.round(avgHistorical),
      avgForecast: Math.round(avgForecast),
      overUtilized,
      missingValues,
      lookbackWeeks,
      forecastWeeks
    };
  }, [filteredData, lookbackWeeks, forecastWeeks]);
  const hasData = uploadedFiles.auslastung?.isValid || uploadedFiles.einsatzplan?.isValid || mockData.length > 0;
  const handleExportCSV = () => {
    console.log('Exporting CSV...');
  };
  const handleExportExcel = () => {
    console.log('Exporting Excel...');
  };
  if (!hasData) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-magicpath-id="0" data-magicpath-path="UtilizationReportView.tsx">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center max-w-md" data-magicpath-id="1" data-magicpath-path="UtilizationReportView.tsx">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center" data-magicpath-id="2" data-magicpath-path="UtilizationReportView.tsx">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" data-magicpath-id="3" data-magicpath-path="UtilizationReportView.tsx" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2" data-magicpath-id="4" data-magicpath-path="UtilizationReportView.tsx">
            Lade Auslastung & Einsatzplan hoch
          </h2>
          <p className="text-gray-600" data-magicpath-id="5" data-magicpath-path="UtilizationReportView.tsx">um den Report zu sehen</p>
        </motion.div>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50" data-magicpath-id="6" data-magicpath-path="UtilizationReportView.tsx">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-6" data-magicpath-id="7" data-magicpath-path="UtilizationReportView.tsx">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-magicpath-id="8" data-magicpath-path="UtilizationReportView.tsx">
          <div data-magicpath-id="9" data-magicpath-path="UtilizationReportView.tsx">
            <h1 className="text-2xl font-bold text-gray-900" data-magicpath-id="10" data-magicpath-path="UtilizationReportView.tsx">
              Auslastung & Vorblick 2025
            </h1>
            <p className="text-sm text-gray-600 mt-1" data-magicpath-id="11" data-magicpath-path="UtilizationReportView.tsx">
              Rückblick {lookbackWeeks} W · Vorblick {forecastWeeks} W · ISO-KW
            </p>
          </div>
          <div className="flex items-center gap-2" data-magicpath-id="12" data-magicpath-path="UtilizationReportView.tsx">
            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" data-magicpath-id="13" data-magicpath-path="UtilizationReportView.tsx">
              <Download className="w-4 h-4" data-magicpath-id="14" data-magicpath-path="UtilizationReportView.tsx" />
              CSV
            </button>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" data-magicpath-id="15" data-magicpath-path="UtilizationReportView.tsx">
              <FileSpreadsheet className="w-4 h-4" data-magicpath-id="16" data-magicpath-path="UtilizationReportView.tsx" />
              Excel
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" data-magicpath-id="17" data-magicpath-path="UtilizationReportView.tsx">
              <Settings className="w-4 h-4" data-magicpath-id="18" data-magicpath-path="UtilizationReportView.tsx" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6" data-magicpath-id="19" data-magicpath-path="UtilizationReportView.tsx">
        {/* Upload Panel */}
        <UploadPanel uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} data-magicpath-id="20" data-magicpath-path="UtilizationReportView.tsx" />

        {/* Filter Bar */}
        <PersonFilterBar allPersons={allPersons} selectedPersons={selectedPersons} onSelectionChange={setSelectedPersons} data-magicpath-id="21" data-magicpath-path="UtilizationReportView.tsx" />

        {/* KPI Cards */}
        <KpiCardsGrid kpiData={kpiData} data-magicpath-id="22" data-magicpath-path="UtilizationReportView.tsx" />

        {/* Chart Section */}
        <UtilizationChartSection data={filteredData} forecastStartWeek={forecastStartWeek} lookbackWeeks={lookbackWeeks} forecastWeeks={forecastWeeks} data-magicpath-id="23" data-magicpath-path="UtilizationReportView.tsx" />

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-magicpath-id="24" data-magicpath-path="UtilizationReportView.tsx">
          <div className="p-6 border-b border-gray-200" data-magicpath-id="25" data-magicpath-path="UtilizationReportView.tsx">
            <h3 className="text-lg font-semibold text-gray-900" data-magicpath-id="26" data-magicpath-path="UtilizationReportView.tsx">
              Detailansicht nach Person
            </h3>
          </div>
          <div className="overflow-x-auto" data-magicpath-id="27" data-magicpath-path="UtilizationReportView.tsx">
            <table className="w-full" data-magicpath-id="28" data-magicpath-path="UtilizationReportView.tsx">
              <thead className="bg-gray-50 sticky top-0" data-magicpath-id="29" data-magicpath-path="UtilizationReportView.tsx">
                <tr data-magicpath-id="30" data-magicpath-path="UtilizationReportView.tsx">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-magicpath-id="31" data-magicpath-path="UtilizationReportView.tsx">
                    Person
                  </th>
                  {Array.from({
                  length: lookbackWeeks + forecastWeeks
                }, (_, i) => {
                  const weekNumber = forecastStartWeek - lookbackWeeks + i;
                  return <th key={i} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-20" data-magicpath-id="32" data-magicpath-path="UtilizationReportView.tsx">
                        2025-KW{weekNumber}
                      </th>;
                })}
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" data-magicpath-id="33" data-magicpath-path="UtilizationReportView.tsx">
                    Ø {lookbackWeeks}W Rückblick
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" data-magicpath-id="34" data-magicpath-path="UtilizationReportView.tsx">
                    Ø {forecastWeeks}W Vorblick
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200" data-magicpath-id="35" data-magicpath-path="UtilizationReportView.tsx">
                {allPersons.map(person => {
                const personData = filteredData.filter(item => item.person === person);
                const historicalAvg = personData.filter(item => item.isHistorical && item.utilization !== null).reduce((sum, item, _, arr) => sum + item.utilization! / arr.length, 0);
                const forecastAvg = personData.filter(item => !item.isHistorical && item.utilization !== null).reduce((sum, item, _, arr) => sum + item.utilization! / arr.length, 0);
                return <tr key={person} className="hover:bg-gray-50" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="36" data-magicpath-path="UtilizationReportView.tsx">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="37" data-magicpath-path="UtilizationReportView.tsx">
                        {person}
                      </td>
                      {Array.from({
                    length: lookbackWeeks + forecastWeeks
                  }, (_, i) => {
                    const weekNumber = forecastStartWeek - lookbackWeeks + i;
                    const weekData = personData.find(item => item.week === `2025-KW${weekNumber}`);
                    const utilization = weekData?.utilization;
                    let bgColor = 'bg-gray-100';
                    if (utilization !== null && utilization !== undefined) {
                      if (utilization > 90) bgColor = 'bg-green-100';else if (utilization > 80) bgColor = 'bg-yellow-100';else bgColor = 'bg-red-100';
                    }
                    return <td key={i} className={`px-3 py-4 text-center text-sm ${bgColor}`} data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="38" data-magicpath-path="UtilizationReportView.tsx">
                            {utilization !== null && utilization !== undefined ? <span className="flex items-center justify-center gap-1" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="39" data-magicpath-path="UtilizationReportView.tsx">
                                {utilization}%
                                {utilization > 100 && <Star className="w-3 h-3 text-yellow-500" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="40" data-magicpath-path="UtilizationReportView.tsx" />}
                              </span> : '—'}
                          </td>;
                  })}
                      <td className="px-3 py-4 text-center text-sm font-medium" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="41" data-magicpath-path="UtilizationReportView.tsx">
                        {Math.round(historicalAvg)}%
                      </td>
                      <td className="px-3 py-4 text-center text-sm font-medium" data-magicpath-uuid={(person as any)["mpid"] ?? "unsafe"} data-magicpath-id="42" data-magicpath-path="UtilizationReportView.tsx">
                        {Math.round(forecastAvg)}%
                      </td>
                    </tr>;
              })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence data-magicpath-id="43" data-magicpath-path="UtilizationReportView.tsx">
        {isSettingsOpen && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setIsSettingsOpen(false)} data-magicpath-id="44" data-magicpath-path="UtilizationReportView.tsx">
            <motion.div initial={{
          scale: 0.95,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.95,
          opacity: 0
        }} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()} data-magicpath-id="45" data-magicpath-path="UtilizationReportView.tsx">
              <h2 className="text-lg font-semibold text-gray-900 mb-6" data-magicpath-id="46" data-magicpath-path="UtilizationReportView.tsx">
                Zeitraum-Einstellungen
              </h2>
              
              <div className="space-y-6" data-magicpath-id="47" data-magicpath-path="UtilizationReportView.tsx">
                {/* Lookback Weeks */}
                <div data-magicpath-id="48" data-magicpath-path="UtilizationReportView.tsx">
                  <label className="block text-sm font-medium text-gray-700 mb-3" data-magicpath-id="49" data-magicpath-path="UtilizationReportView.tsx">
                    Rückblick-Wochen
                  </label>
                  <div className="flex items-center gap-4" data-magicpath-id="50" data-magicpath-path="UtilizationReportView.tsx">
                    <button onClick={() => setLookbackWeeks(Math.max(1, lookbackWeeks - 1))} disabled={lookbackWeeks <= 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="51" data-magicpath-path="UtilizationReportView.tsx">
                      <Minus className="w-4 h-4" data-magicpath-id="52" data-magicpath-path="UtilizationReportView.tsx" />
                    </button>
                    <div className="flex-1 text-center" data-magicpath-id="53" data-magicpath-path="UtilizationReportView.tsx">
                      <div className="text-2xl font-bold text-gray-900" data-magicpath-id="54" data-magicpath-path="UtilizationReportView.tsx">{lookbackWeeks}</div>
                      <div className="text-xs text-gray-500" data-magicpath-id="55" data-magicpath-path="UtilizationReportView.tsx">Wochen</div>
                    </div>
                    <button onClick={() => setLookbackWeeks(Math.min(12, lookbackWeeks + 1))} disabled={lookbackWeeks >= 12} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="56" data-magicpath-path="UtilizationReportView.tsx">
                      <Plus className="w-4 h-4" data-magicpath-id="57" data-magicpath-path="UtilizationReportView.tsx" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center" data-magicpath-id="58" data-magicpath-path="UtilizationReportView.tsx">
                    1 - 12 Wochen (aktuell: {lookbackWeeks})
                  </div>
                </div>

                {/* Forecast Weeks */}
                <div data-magicpath-id="59" data-magicpath-path="UtilizationReportView.tsx">
                  <label className="block text-sm font-medium text-gray-700 mb-3" data-magicpath-id="60" data-magicpath-path="UtilizationReportView.tsx">
                    Vorblick-Wochen
                  </label>
                  <div className="flex items-center gap-4" data-magicpath-id="61" data-magicpath-path="UtilizationReportView.tsx">
                    <button onClick={() => setForecastWeeks(Math.max(1, forecastWeeks - 1))} disabled={forecastWeeks <= 1} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="62" data-magicpath-path="UtilizationReportView.tsx">
                      <Minus className="w-4 h-4" data-magicpath-id="63" data-magicpath-path="UtilizationReportView.tsx" />
                    </button>
                    <div className="flex-1 text-center" data-magicpath-id="64" data-magicpath-path="UtilizationReportView.tsx">
                      <div className="text-2xl font-bold text-gray-900" data-magicpath-id="65" data-magicpath-path="UtilizationReportView.tsx">{forecastWeeks}</div>
                      <div className="text-xs text-gray-500" data-magicpath-id="66" data-magicpath-path="UtilizationReportView.tsx">Wochen</div>
                    </div>
                    <button onClick={() => setForecastWeeks(Math.min(12, forecastWeeks + 1))} disabled={forecastWeeks >= 12} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" data-magicpath-id="67" data-magicpath-path="UtilizationReportView.tsx">
                      <Plus className="w-4 h-4" data-magicpath-id="68" data-magicpath-path="UtilizationReportView.tsx" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center" data-magicpath-id="69" data-magicpath-path="UtilizationReportView.tsx">
                    1 - 12 Wochen (aktuell: {forecastWeeks})
                  </div>
                </div>

                {/* Forecast Start Week */}
                <div data-magicpath-id="70" data-magicpath-path="UtilizationReportView.tsx">
                  <label className="block text-sm font-medium text-gray-700 mb-2" data-magicpath-id="71" data-magicpath-path="UtilizationReportView.tsx">
                    Basiswoche Vorblick
                  </label>
                  <select value={forecastStartWeek} onChange={e => setForecastStartWeek(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-magicpath-id="72" data-magicpath-path="UtilizationReportView.tsx">
                    {Array.from({
                  length: 20
                }, (_, i) => <option key={i} value={30 + i} data-magicpath-id="73" data-magicpath-path="UtilizationReportView.tsx">
                        2025-KW{30 + i}
                      </option>)}
                  </select>
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200" data-magicpath-id="74" data-magicpath-path="UtilizationReportView.tsx">
                  <h4 className="text-sm font-medium text-blue-900 mb-2" data-magicpath-id="75" data-magicpath-path="UtilizationReportView.tsx">
                    Zeitraum-Übersicht
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1" data-magicpath-id="76" data-magicpath-path="UtilizationReportView.tsx">
                    <p data-magicpath-id="77" data-magicpath-path="UtilizationReportView.tsx">• Rückblick: KW{forecastStartWeek - lookbackWeeks} - KW{forecastStartWeek - 1} ({lookbackWeeks} Wochen)</p>
                    <p data-magicpath-id="78" data-magicpath-path="UtilizationReportView.tsx">• Vorblick: KW{forecastStartWeek} - KW{forecastStartWeek + forecastWeeks - 1} ({forecastWeeks} Wochen)</p>
                    <p data-magicpath-id="79" data-magicpath-path="UtilizationReportView.tsx">• Gesamt: {lookbackWeeks + forecastWeeks} Wochen</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500" data-magicpath-id="80" data-magicpath-path="UtilizationReportView.tsx">
                  Fehlende Werte werden in Aggregationen ignoriert.
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6" data-magicpath-id="81" data-magicpath-path="UtilizationReportView.tsx">
                <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700" data-magicpath-id="82" data-magicpath-path="UtilizationReportView.tsx">
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}