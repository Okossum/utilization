import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import { Star, TrendingUp, TrendingDown, Info, Maximize2, Minimize2 } from 'lucide-react';
interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
  mpid?: string;
}
interface UtilizationChartSectionProps {
  data: UtilizationData[];
  forecastStartWeek: number;
  mpid?: string;
}
interface ChartDataPoint {
  week: string;
  shortWeek: string;
  historical: number | null;
  forecast: number | null;
  isOverUtilizedHistorical: boolean;
  isOverUtilizedForecast: boolean;
  weekNumber: number;
  mpid?: string;
}
export function UtilizationChartSection({
  data,
  forecastStartWeek
}: UtilizationChartSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const chartData = useMemo(() => {
    // Group data by week and calculate averages
    const weekMap = new Map<string, {
      historical: number[];
      forecast: number[];
    }>();
    data.forEach(item => {
      if (item.utilization === null) return;
      if (!weekMap.has(item.week)) {
        weekMap.set(item.week, {
          historical: [],
          forecast: []
        });
      }
      const weekData = weekMap.get(item.week)!;
      if (item.isHistorical) {
        weekData.historical.push(item.utilization);
      } else {
        weekData.forecast.push(item.utilization);
      }
    });

    // Convert to chart format
    const weeks = Array.from({
      length: 12
    }, (_, i) => `2025-KW${29 + i}`);
    return weeks.map((week, index): ChartDataPoint => {
      const weekData = weekMap.get(week) || {
        historical: [],
        forecast: []
      };
      const weekNumber = 29 + index;
      const historicalAvg = weekData.historical.length > 0 ? weekData.historical.reduce((sum, val) => sum + val, 0) / weekData.historical.length : null;
      const forecastAvg = weekData.forecast.length > 0 ? weekData.forecast.reduce((sum, val) => sum + val, 0) / weekData.forecast.length : null;
      return {
        week,
        shortWeek: `KW${weekNumber}`,
        historical: historicalAvg ? Math.round(historicalAvg) : null,
        forecast: forecastAvg ? Math.round(forecastAvg) : null,
        isOverUtilizedHistorical: historicalAvg !== null && historicalAvg > 100,
        isOverUtilizedForecast: forecastAvg !== null && forecastAvg > 100,
        weekNumber
      };
    });
  }, [data]);
  const chartStats = useMemo(() => {
    const historicalValues = chartData.filter(d => d.historical !== null).map(d => d.historical!);
    const forecastValues = chartData.filter(d => d.forecast !== null).map(d => d.forecast!);
    const historicalTrend = historicalValues.length > 1 ? historicalValues[historicalValues.length - 1] - historicalValues[0] : 0;
    const forecastTrend = forecastValues.length > 1 ? forecastValues[forecastValues.length - 1] - forecastValues[0] : 0;
    return {
      historicalTrend,
      forecastTrend,
      maxValue: Math.max(...historicalValues, ...forecastValues, 100),
      minValue: Math.min(...historicalValues, ...forecastValues, 0)
    };
  }, [chartData]);
  const CustomTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-48" data-magicpath-id="0" data-magicpath-path="UtilizationChartSection.tsx">
          <div className="border-b border-gray-100 pb-2 mb-3" data-magicpath-id="1" data-magicpath-path="UtilizationChartSection.tsx">
            <p className="font-semibold text-gray-900" data-magicpath-id="2" data-magicpath-path="UtilizationChartSection.tsx">{`2025-${label}`}</p>
            <p className="text-xs text-gray-500" data-magicpath-id="3" data-magicpath-path="UtilizationChartSection.tsx">
              {data.weekNumber < forecastStartWeek ? 'Historische Daten' : 'Prognosedaten'}
            </p>
          </div>
          
          <div className="space-y-2" data-magicpath-id="4" data-magicpath-path="UtilizationChartSection.tsx">
            {payload.map((entry: any, index: number) => {
            const isOverUtilized = entry.dataKey === 'historical' ? data.isOverUtilizedHistorical : data.isOverUtilizedForecast;
            return <div key={index} className="flex items-center justify-between gap-4" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="5" data-magicpath-path="UtilizationChartSection.tsx">
                  <div className="flex items-center gap-2" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="6" data-magicpath-path="UtilizationChartSection.tsx">
                    <div className="w-3 h-3 rounded-full" style={{
                  backgroundColor: entry.color
                }} data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="7" data-magicpath-path="UtilizationChartSection.tsx" />
                    <span className="text-sm text-gray-600" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="8" data-magicpath-path="UtilizationChartSection.tsx">
                      {entry.dataKey === 'historical' ? 'Rückblick' : 'Vorblick'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="9" data-magicpath-path="UtilizationChartSection.tsx">
                    <span className="font-semibold text-gray-900" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-field="value:unknown" data-magicpath-id="10" data-magicpath-path="UtilizationChartSection.tsx">
                      {entry.value}%
                    </span>
                    {isOverUtilized && <Star className="w-3 h-3 text-yellow-500" data-magicpath-uuid={(entry as any)["mpid"] ?? "unsafe"} data-magicpath-id="11" data-magicpath-path="UtilizationChartSection.tsx" />}
                  </div>
                </div>;
          })}
          </div>
          
          {(data.isOverUtilizedHistorical || data.isOverUtilizedForecast) && <div className="mt-3 pt-2 border-t border-gray-100" data-magicpath-id="12" data-magicpath-path="UtilizationChartSection.tsx">
              <div className="flex items-center gap-1 text-xs text-yellow-600" data-magicpath-id="13" data-magicpath-path="UtilizationChartSection.tsx">
                <Star className="w-3 h-3" data-magicpath-id="14" data-magicpath-path="UtilizationChartSection.tsx" />
                <span data-magicpath-id="15" data-magicpath-path="UtilizationChartSection.tsx">Überauslastung erkannt</span>
              </div>
            </div>}
        </motion.div>;
    }
    return null;
  };
  const CustomDot = (props: any) => {
    const {
      cx,
      cy,
      payload,
      dataKey
    } = props;
    const isOverUtilized = dataKey === 'historical' ? payload.isOverUtilizedHistorical : payload.isOverUtilizedForecast;
    if (isOverUtilized) {
      return <g data-magicpath-id="16" data-magicpath-path="UtilizationChartSection.tsx">
          <motion.circle initial={{
          r: 0
        }} animate={{
          r: 6
        }} transition={{
          delay: 0.5,
          type: "spring",
          stiffness: 200
        }} cx={cx} cy={cy} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} data-magicpath-id="17" data-magicpath-path="UtilizationChartSection.tsx" />
          <motion.g initial={{
          opacity: 0,
          scale: 0
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          delay: 0.7,
          type: "spring",
          stiffness: 300
        }} data-magicpath-id="18" data-magicpath-path="UtilizationChartSection.tsx">
            <Star x={cx - 4} y={cy - 4} width={8} height={8} fill="#f59e0b" data-magicpath-id="19" data-magicpath-path="UtilizationChartSection.tsx" />
          </motion.g>
        </g>;
    }
    return null;
  };
  const separatorWeekIndex = chartData.findIndex(d => d.weekNumber >= forecastStartWeek);
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-magicpath-id="20" data-magicpath-path="UtilizationChartSection.tsx">
      {/* Header */}
      <div className="p-6 border-b border-gray-200" data-magicpath-id="21" data-magicpath-path="UtilizationChartSection.tsx">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-magicpath-id="22" data-magicpath-path="UtilizationChartSection.tsx">
          <div data-magicpath-id="23" data-magicpath-path="UtilizationChartSection.tsx">
            <h3 className="text-lg font-semibold text-gray-900 mb-2" data-magicpath-id="24" data-magicpath-path="UtilizationChartSection.tsx">
              Auslastungsverlauf
            </h3>
            <p className="text-sm text-gray-600" data-magicpath-id="25" data-magicpath-path="UtilizationChartSection.tsx">
              Zeitreihenanalyse der durchschnittlichen Auslastung pro Woche
            </p>
          </div>
          
          <div className="flex items-center gap-3" data-magicpath-id="26" data-magicpath-path="UtilizationChartSection.tsx">
            {/* Trend Indicators */}
            <div className="flex items-center gap-4 text-sm" data-magicpath-id="27" data-magicpath-path="UtilizationChartSection.tsx">
              <div className="flex items-center gap-1" data-magicpath-id="28" data-magicpath-path="UtilizationChartSection.tsx">
                {chartStats.historicalTrend > 0 ? <TrendingUp className="w-4 h-4 text-green-500" data-magicpath-id="29" data-magicpath-path="UtilizationChartSection.tsx" /> : chartStats.historicalTrend < 0 ? <TrendingDown className="w-4 h-4 text-red-500" data-magicpath-id="30" data-magicpath-path="UtilizationChartSection.tsx" /> : <div className="w-4 h-4" data-magicpath-id="31" data-magicpath-path="UtilizationChartSection.tsx" />}
                <span className="text-gray-600" data-magicpath-id="32" data-magicpath-path="UtilizationChartSection.tsx">Rückblick</span>
              </div>
              <div className="flex items-center gap-1" data-magicpath-id="33" data-magicpath-path="UtilizationChartSection.tsx">
                {chartStats.forecastTrend > 0 ? <TrendingUp className="w-4 h-4 text-green-500" data-magicpath-id="34" data-magicpath-path="UtilizationChartSection.tsx" /> : chartStats.forecastTrend < 0 ? <TrendingDown className="w-4 h-4 text-red-500" data-magicpath-id="35" data-magicpath-path="UtilizationChartSection.tsx" /> : <div className="w-4 h-4" data-magicpath-id="36" data-magicpath-path="UtilizationChartSection.tsx" />}
                <span className="text-gray-600" data-magicpath-id="37" data-magicpath-path="UtilizationChartSection.tsx">Vorblick</span>
              </div>
            </div>
            
            {/* Expand Button */}
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title={isExpanded ? "Verkleinern" : "Vergrößern"} data-magicpath-id="38" data-magicpath-path="UtilizationChartSection.tsx">
              {isExpanded ? <Minimize2 className="w-4 h-4" data-magicpath-id="39" data-magicpath-path="UtilizationChartSection.tsx" /> : <Maximize2 className="w-4 h-4" data-magicpath-id="40" data-magicpath-path="UtilizationChartSection.tsx" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <motion.div animate={{
      height: isExpanded ? 500 : 320
    }} transition={{
      duration: 0.3,
      ease: "easeInOut"
    }} className="relative" data-magicpath-id="41" data-magicpath-path="UtilizationChartSection.tsx">
        <div className="absolute inset-0 p-6" data-magicpath-id="42" data-magicpath-path="UtilizationChartSection.tsx">
          <ResponsiveContainer width="100%" height="100%" data-magicpath-id="43" data-magicpath-path="UtilizationChartSection.tsx">
            <LineChart data={chartData} margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }} onMouseMove={e => setHoveredPoint(e)} onMouseLeave={() => setHoveredPoint(null)} data-magicpath-id="44" data-magicpath-path="UtilizationChartSection.tsx">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" strokeOpacity={0.8} data-magicpath-id="45" data-magicpath-path="UtilizationChartSection.tsx" />
              
              <XAxis dataKey="shortWeek" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={60} data-magicpath-id="46" data-magicpath-path="UtilizationChartSection.tsx" />
              
              <YAxis domain={[0, Math.max(130, chartStats.maxValue + 10)]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}%`} width={50} data-magicpath-id="47" data-magicpath-path="UtilizationChartSection.tsx" />
              
              <Tooltip content={<CustomTooltip data-magicpath-id="49" data-magicpath-path="UtilizationChartSection.tsx" />} data-magicpath-id="48" data-magicpath-path="UtilizationChartSection.tsx" />
              
              <Legend wrapperStyle={{
              paddingTop: '20px'
            }} iconType="line" data-magicpath-id="50" data-magicpath-path="UtilizationChartSection.tsx" />
              
              {/* Reference line at 100% */}
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} label={{
              value: "100%",
              position: "insideTopRight",
              fontSize: 10,
              fill: "#ef4444"
            }} data-magicpath-id="51" data-magicpath-path="UtilizationChartSection.tsx" />
              
              {/* Vertical line separating historical and forecast */}
              {separatorWeekIndex > 0 && <ReferenceLine x={chartData[separatorWeekIndex]?.shortWeek} stroke="#6b7280" strokeDasharray="3 3" strokeWidth={2} label={{
              value: "Prognose",
              position: "insideTopLeft",
              fontSize: 10,
              fill: "#6b7280",
              offset: 10
            }} data-magicpath-id="52" data-magicpath-path="UtilizationChartSection.tsx" />}
              
              {/* Historical Line */}
              <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={3} dot={{
              fill: '#3b82f6',
              strokeWidth: 2,
              r: 4
            }} activeDot={{
              r: 6,
              stroke: '#3b82f6',
              strokeWidth: 2,
              fill: '#ffffff'
            }} name="Rückblick (8W)" connectNulls={false} animationDuration={1000} animationBegin={200} />
              
              {/* Forecast Line */}
              <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={3} strokeDasharray="8 4" dot={{
              fill: '#10b981',
              strokeWidth: 2,
              r: 4
            }} activeDot={{
              r: 6,
              stroke: '#10b981',
              strokeWidth: 2,
              fill: '#ffffff'
            }} name="Vorblick (4W)" connectNulls={false} animationDuration={1000} animationBegin={400} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Legend and Info */}
      <div className="p-6 border-t border-gray-200 bg-gray-50" data-magicpath-id="53" data-magicpath-path="UtilizationChartSection.tsx">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" data-magicpath-id="54" data-magicpath-path="UtilizationChartSection.tsx">
          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600" data-magicpath-id="55" data-magicpath-path="UtilizationChartSection.tsx">
            <div className="flex items-center gap-2" data-magicpath-id="56" data-magicpath-path="UtilizationChartSection.tsx">
              <div className="w-4 h-1 bg-blue-500 rounded-full" data-magicpath-id="57" data-magicpath-path="UtilizationChartSection.tsx"></div>
              <span data-magicpath-id="58" data-magicpath-path="UtilizationChartSection.tsx">Historische Daten</span>
            </div>
            <div className="flex items-center gap-2" data-magicpath-id="59" data-magicpath-path="UtilizationChartSection.tsx">
              <div className="w-4 h-1 bg-green-500 rounded-full relative overflow-hidden" data-magicpath-id="60" data-magicpath-path="UtilizationChartSection.tsx">
                <div className="absolute inset-0 bg-white" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 2px, white 2px, white 4px)'
              }} data-magicpath-id="61" data-magicpath-path="UtilizationChartSection.tsx"></div>
              </div>
              <span data-magicpath-id="62" data-magicpath-path="UtilizationChartSection.tsx">Prognosedaten</span>
            </div>
            <div className="flex items-center gap-2" data-magicpath-id="63" data-magicpath-path="UtilizationChartSection.tsx">
              <Star className="w-4 h-4 text-yellow-500" data-magicpath-id="64" data-magicpath-path="UtilizationChartSection.tsx" />
              <span data-magicpath-id="65" data-magicpath-path="UtilizationChartSection.tsx">Überauslastung ({'>'}100%)</span>
            </div>
            <div className="flex items-center gap-2" data-magicpath-id="66" data-magicpath-path="UtilizationChartSection.tsx">
              <div className="w-6 h-0.5 bg-red-400 relative" data-magicpath-id="67" data-magicpath-path="UtilizationChartSection.tsx">
                <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(to right, transparent 0px, transparent 2px, #f87171 2px, #f87171 4px)'
              }} data-magicpath-id="68" data-magicpath-path="UtilizationChartSection.tsx"></div>
              </div>
              <span data-magicpath-id="69" data-magicpath-path="UtilizationChartSection.tsx">100% Referenz</span>
            </div>
          </div>

          {/* Chart Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500" data-magicpath-id="70" data-magicpath-path="UtilizationChartSection.tsx">
            <div className="flex items-center gap-1" data-magicpath-id="71" data-magicpath-path="UtilizationChartSection.tsx">
              <Info className="w-3 h-3" data-magicpath-id="72" data-magicpath-path="UtilizationChartSection.tsx" />
              <span data-magicpath-id="73" data-magicpath-path="UtilizationChartSection.tsx">Ø über vorhandene Werte</span>
            </div>
            <span data-magicpath-id="74" data-magicpath-path="UtilizationChartSection.tsx">•</span>
            <span data-magicpath-id="75" data-magicpath-path="UtilizationChartSection.tsx">
              {chartData.filter(d => d.historical !== null || d.forecast !== null).length} Datenpunkte
            </span>
          </div>
        </div>

        {/* Additional Insights */}
        <AnimatePresence data-magicpath-id="76" data-magicpath-path="UtilizationChartSection.tsx">
          {isExpanded && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: 'auto'
        }} exit={{
          opacity: 0,
          height: 0
        }} className="mt-4 pt-4 border-t border-gray-200" data-magicpath-id="77" data-magicpath-path="UtilizationChartSection.tsx">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm" data-magicpath-id="78" data-magicpath-path="UtilizationChartSection.tsx">
                <div className="bg-white p-3 rounded-lg border border-gray-200" data-magicpath-id="79" data-magicpath-path="UtilizationChartSection.tsx">
                  <div className="text-gray-600 mb-1" data-magicpath-id="80" data-magicpath-path="UtilizationChartSection.tsx">Höchste Auslastung</div>
                  <div className="font-semibold text-gray-900" data-magicpath-id="81" data-magicpath-path="UtilizationChartSection.tsx">
                    {chartStats.maxValue}%
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200" data-magicpath-id="82" data-magicpath-path="UtilizationChartSection.tsx">
                  <div className="text-gray-600 mb-1" data-magicpath-id="83" data-magicpath-path="UtilizationChartSection.tsx">Niedrigste Auslastung</div>
                  <div className="font-semibold text-gray-900" data-magicpath-id="84" data-magicpath-path="UtilizationChartSection.tsx">
                    {chartStats.minValue}%
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200" data-magicpath-id="85" data-magicpath-path="UtilizationChartSection.tsx">
                  <div className="text-gray-600 mb-1" data-magicpath-id="86" data-magicpath-path="UtilizationChartSection.tsx">Überauslastungen</div>
                  <div className="font-semibold text-gray-900" data-magicpath-id="87" data-magicpath-path="UtilizationChartSection.tsx">
                    {chartData.filter(d => d.isOverUtilizedHistorical || d.isOverUtilizedForecast).length}
                  </div>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>
      </div>
    </motion.div>;
}