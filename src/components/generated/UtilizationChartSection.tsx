import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import { Star, TrendingUp, TrendingDown, Info, Maximize2, Minimize2 } from 'lucide-react';
interface UtilizationData {
  person: string;
  week: string;
  utilization: number | null;
  isHistorical: boolean;
}
interface UtilizationChartSectionProps {
  data: UtilizationData[];
  forecastStartWeek: number;
  lookbackWeeks?: number;
  forecastWeeks?: number;
}
interface ChartDataPoint {
  week: string;
  shortWeek: string;
  historical: number | null;
  forecast: number | null;
  isOverUtilizedHistorical: boolean;
  isOverUtilizedForecast: boolean;
  weekNumber: number;
}
export function UtilizationChartSection({
  data,
  forecastStartWeek,
  lookbackWeeks = 8,
  forecastWeeks = 4
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

    // Convert to chart format - using YY/WW format
    const totalWeeks = lookbackWeeks + forecastWeeks;
    const startWeek = forecastStartWeek - lookbackWeeks;
    const currentYear = new Date().getFullYear();
    const yy = String(currentYear).slice(-2);
    const weeks = Array.from({
      length: totalWeeks
    }, (_, i) => `${yy}/${String(startWeek + i).padStart(2, '0')}`);
    return weeks.map((week, index): ChartDataPoint => {
      const weekData = weekMap.get(week) || {
        historical: [],
        forecast: []
      };
      const weekNumber = startWeek + index;
      const historicalAvg = weekData.historical.length > 0 ? weekData.historical.reduce((sum, val) => sum + val, 0) / weekData.historical.length : null;
      const forecastAvg = weekData.forecast.length > 0 ? weekData.forecast.reduce((sum, val) => sum + val, 0) / weekData.forecast.length : null;
      return {
        week,
        shortWeek: week, // Use YY/WW format directly
        historical: historicalAvg ? Math.round(historicalAvg) : null,
        forecast: forecastAvg ? Math.round(forecastAvg) : null,
        isOverUtilizedHistorical: historicalAvg !== null && historicalAvg > 100,
        isOverUtilizedForecast: forecastAvg !== null && forecastAvg > 100,
        weekNumber
      };
    });
  }, [data, lookbackWeeks, forecastWeeks, forecastStartWeek]);
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
      }} className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-48">
          <div className="border-b border-gray-100 pb-2 mb-3">
            <p className="font-semibold text-gray-900">{`2025-${label}`}</p>
            <p className="text-xs text-gray-500">
              {data.weekNumber < forecastStartWeek ? 'Historische Daten' : 'Prognosedaten'}
            </p>
          </div>
          
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
            const isOverUtilized = entry.dataKey === 'historical' ? data.isOverUtilizedHistorical : data.isOverUtilizedForecast;
            return <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{
                  backgroundColor: entry.color
                }} />
                    <span className="text-sm text-gray-600">
                      {entry.dataKey === 'historical' ? 'Rückblick' : 'Vorblick'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">
                      {entry.value}%
                    </span>
                    {isOverUtilized && <Star className="w-3 h-3 text-yellow-500" />}
                  </div>
                </div>;
          })}
          </div>
          
          {(data.isOverUtilizedHistorical || data.isOverUtilizedForecast) && <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1 text-xs text-yellow-600">
                <Star className="w-3 h-3" />
                <span>Überauslastung erkannt</span>
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
      return <g>
          <motion.circle initial={{
          r: 0
        }} animate={{
          r: 6
        }} transition={{
          delay: 0.5,
          type: "spring",
          stiffness: 200
        }} cx={cx} cy={cy} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} />
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
        }}>
            <Star x={cx - 4} y={cy - 4} width={8} height={8} fill="#f59e0b" />
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
  }} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Auslastungsverlauf
            </h3>
            <p className="text-sm text-gray-600">
              Zeitreihenanalyse der durchschnittlichen Auslastung pro Woche
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Trend Indicators */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                {chartStats.historicalTrend > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : chartStats.historicalTrend < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <div className="w-4 h-4" />}
                <span className="text-gray-600">Rückblick</span>
              </div>
              <div className="flex items-center gap-1">
                {chartStats.forecastTrend > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : chartStats.forecastTrend < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <div className="w-4 h-4" />}
                <span className="text-gray-600">Vorblick</span>
              </div>
            </div>
            
            {/* Expand Button */}
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title={isExpanded ? "Verkleinern" : "Vergrößern"}>
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
    }} className="relative">
        <div className="absolute inset-0 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20
          }} onMouseMove={e => setHoveredPoint(e)} onMouseLeave={() => setHoveredPoint(null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" strokeOpacity={0.8} />
              
              <XAxis dataKey="shortWeek" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={60} />
              
              <YAxis domain={[0, Math.max(130, chartStats.maxValue + 10)]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}%`} width={50} />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend wrapperStyle={{
              paddingTop: '20px'
            }} iconType="line" />
              
              {/* Reference line at 100% */}
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} label={{
              value: "100%",
              position: "insideTopRight",
              fontSize: 10,
              fill: "#ef4444"
            }} />
              
              {/* Vertical line separating historical and forecast */}
              {separatorWeekIndex > 0 && <ReferenceLine x={chartData[separatorWeekIndex]?.shortWeek} stroke="#6b7280" strokeDasharray="3 3" strokeWidth={2} label={{
              value: "Prognose",
              position: "insideTopLeft",
              fontSize: 10,
              fill: "#6b7280",
              offset: 10
            }} />}
              
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
            }} name={`Rückblick (${lookbackWeeks}W)`} connectNulls={false} animationDuration={1000} animationBegin={200} />
              
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
            }} name={`Vorblick (${forecastWeeks}W)`} connectNulls={false} animationDuration={1000} animationBegin={400} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Legend and Info */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded-full"></div>
              <span>Historische Daten</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-green-500 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-white" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 2px, white 2px, white 4px)'
              }}></div>
              </div>
              <span>Prognosedaten</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Überauslastung ({'>'}100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-400 relative">
                <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(to right, transparent 0px, transparent 2px, #f87171 2px, #f87171 4px)'
              }}></div>
              </div>
              <span>100% Referenz</span>
            </div>
          </div>

          {/* Chart Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Ø über vorhandene Werte</span>
            </div>
            <span>•</span>
            <span>
              {chartData.filter(d => d.historical !== null || d.forecast !== null).length} Datenpunkte
            </span>
          </div>
        </div>

        {/* Additional Insights */}
        <AnimatePresence>
          {isExpanded && <motion.div initial={{
          opacity: 0,
          height: 0
        }} animate={{
          opacity: 1,
          height: 'auto'
        }} exit={{
          opacity: 0,
          height: 0
        }} className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-600 mb-1">Höchste Auslastung</div>
                  <div className="font-semibold text-gray-900">
                    {chartStats.maxValue}%
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-600 mb-1">Niedrigste Auslastung</div>
                  <div className="font-semibold text-gray-900">
                    {chartStats.minValue}%
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="text-gray-600 mb-1">Überauslastungen</div>
                  <div className="font-semibold text-gray-900">
                    {chartData.filter(d => d.isOverUtilizedHistorical || d.isOverUtilizedForecast).length}
                  </div>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>
      </div>
    </motion.div>;
}