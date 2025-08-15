import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, AlertTriangle, Info, HelpCircle } from 'lucide-react';
interface KpiData {
  avgHistorical: number;
  avgForecast: number;
  overUtilized: number;
  missingValues: number;
  lookbackWeeks?: number;
  forecastWeeks?: number;
}
interface KpiCardsGridProps {
  kpiData: KpiData;
}
interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  tooltip: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  delay?: number;
  showAnalysisTooltip?: boolean;
  analysisData?: {
    overUtilized: number;
    missingValues: number;
  };
}
function KpiCard({
  title,
  value,
  icon: IconComponent,
  color,
  tooltip,
  trend,
  subtitle,
  delay = 0,
  showAnalysisTooltip = false,
  analysisData
}: KpiCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          iconBg: 'bg-green-100',
          value: 'text-green-900',
          indicator: 'bg-green-500'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          value: 'text-yellow-900',
          indicator: 'bg-yellow-500'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
          value: 'text-red-900',
          indicator: 'bg-red-500'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
          value: 'text-blue-900',
          indicator: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          iconBg: 'bg-gray-100',
          value: 'text-gray-900',
          indicator: 'bg-gray-500'
        };
    }
  };
  const colors = getColorClasses(color);
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
    return null;
  };
  const getStatusText = () => {
    if (title.includes('Auslastung')) {
      if (color === 'green') return 'Optimal';
      if (color === 'yellow') return 'Akzeptabel';
      if (color === 'red') return 'Niedrig';
    }
    return null;
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20,
    scale: 0.95
  }} animate={{
    opacity: 1,
    y: 0,
    scale: 1
  }} transition={{
    delay,
    duration: 0.3,
    ease: "easeOut"
  }} className={`relative p-6 rounded-xl border ${colors.bg} ${colors.border} hover:shadow-lg transition-all duration-300 group cursor-default`} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && <motion.div initial={{
        opacity: 0,
        y: 10,
        scale: 0.9
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 10,
        scale: 0.9
      }} transition={{
        duration: 0.2
      }} className="absolute top-4 right-4 z-10">
            <div className="relative">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                <p className="leading-relaxed">{tooltip}</p>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>

      {/* Header with Icon */}
      <div className="flex items-start justify-between mb-4">
        <motion.div whileHover={{
        scale: 1.05
      }} className={`p-3 rounded-lg ${colors.iconBg} border ${colors.border}`}>
          <IconComponent className={`w-5 h-5 ${colors.icon}`} />
        </motion.div>
        
        {/* Info Icon - Always visible on mobile, hover on desktop */}
        <div className="relative block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
          
          {/* Tooltip mit Auslastungsanalyse */}
          {showAnalysisTooltip && analysisData && (
            <div className="absolute right-0 top-6 w-80 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="font-semibold mb-2 text-blue-200">Auslastungsanalyse</div>
              <ul className="space-y-1 text-gray-200">
                <li>• Die prognostizierte Auslastung steigt im Vergleich zum historischen Durchschnitt</li>
                <li>• {analysisData.overUtilized || 0} Datenpunkte mit Überauslastung identifiziert</li>
                <li>• {analysisData.missingValues || 0} fehlende Werte werden in Berechnungen ignoriert</li>
              </ul>
              
              {/* Tooltip-Pfeil */}
              <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600 leading-tight pr-2">
          {title}
        </h3>
        
        <div className="flex items-baseline gap-2">
          <motion.p key={value} initial={{
          scale: 1.1,
          opacity: 0.8
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          duration: 0.2
        }} className={`text-3xl font-bold ${colors.value}`}>
            {value}
          </motion.p>
          {getTrendIcon()}
        </div>

        {subtitle && <p className="text-xs text-gray-500 mt-1">
            {subtitle}
          </p>}
      </div>

      {/* Status Indicator */}
      {getStatusText() && <motion.div initial={{
      opacity: 0,
      x: -10
    }} animate={{
      opacity: 1,
      x: 0
    }} transition={{
      delay: delay + 0.2
    }} className="mt-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.indicator}`}></div>
          <span className="text-xs font-medium text-gray-600">
            {getStatusText()}
          </span>
        </motion.div>}

      {/* Special indicator for over-utilization */}
      {title.includes('>100 %') && parseInt(value) > 0 && <motion.div initial={{
      opacity: 0,
      scale: 0
    }} animate={{
      opacity: 1,
      scale: 1
    }} transition={{
      delay: delay + 0.3,
      type: "spring",
      stiffness: 200
    }} className="absolute top-2 left-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
            <Star className="w-2 h-2 text-yellow-800" />
          </div>
        </motion.div>}

      {/* Hover effect overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>;
}
export function KpiCardsGrid({
  kpiData
}: KpiCardsGridProps) {
  const getHistoricalColor = (): 'green' | 'yellow' | 'red' => {
    return kpiData.avgHistorical > 90 ? 'green' : kpiData.avgHistorical > 80 ? 'yellow' : 'red';
  };
  const getForecastColor = (): 'green' | 'yellow' | 'red' => {
    return kpiData.avgForecast > 90 ? 'green' : kpiData.avgForecast > 80 ? 'yellow' : 'red';
  };
  const getHistoricalTrend = (): 'up' | 'down' | 'neutral' => {
    return kpiData.avgHistorical > 85 ? 'up' : kpiData.avgHistorical < 75 ? 'down' : 'neutral';
  };
  const getForecastTrend = (): 'up' | 'down' | 'neutral' => {
    return kpiData.avgForecast > kpiData.avgHistorical ? 'up' : kpiData.avgForecast < kpiData.avgHistorical ? 'down' : 'neutral';
  };
  const cards = [{
    title: `Ø Auslastung Rückblick (${kpiData.lookbackWeeks || 8} W)`,
    value: `${kpiData.avgHistorical}%`,
    icon: TrendingUp,
    color: getHistoricalColor(),
    tooltip: `Durchschnittliche Auslastung der letzten ${kpiData.lookbackWeeks || 8} Wochen. Ø über vorhandene Werte, fehlende Daten werden ignoriert.`,
    trend: getHistoricalTrend(),
    subtitle: 'Historische Daten',
    showAnalysisTooltip: true,
    analysisData: {
      overUtilized: kpiData.overUtilized,
      missingValues: kpiData.missingValues
    }
  }, {
    title: `Ø Auslastung Vorblick (${kpiData.forecastWeeks || 4} W)`,
    value: `${kpiData.avgForecast}%`,
    icon: TrendingDown,
    color: getForecastColor(),
    tooltip: `Prognostizierte durchschnittliche Auslastung der nächsten ${kpiData.forecastWeeks || 4} Wochen. Ø über vorhandene Werte, fehlende Daten werden ignoriert.`,
    trend: getForecastTrend(),
    subtitle: 'Prognosedaten'
  }, {
    title: '⭐ >100 % (Anzahl Personen/Wochen)',
    value: kpiData.overUtilized.toString(),
    icon: Star,
    color: 'blue' as const,
    tooltip: 'Anzahl der Datenpunkte (Person/Woche-Kombinationen) mit Überauslastung über 100%. Diese werden besonders hervorgehoben.',
    subtitle: kpiData.overUtilized === 1 ? 'Datenpunkt' : 'Datenpunkte'
  }, {
    title: 'Anzahl fehlender Werte (ignoriert)',
    value: kpiData.missingValues.toString(),
    icon: AlertTriangle,
    color: 'gray' as const,
    tooltip: 'Anzahl der fehlenden Auslastungswerte in den Daten. Diese Werte werden in allen Berechnungen und Aggregationen ignoriert.',
    subtitle: 'Werden nicht berücksichtigt'
  }] as any[];
  return <div className="space-y-4">
      {/* Section Header */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Kennzahlen Übersicht
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Wichtige Metriken zur Auslastungsanalyse
          </p>
        </div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {cards.map((card, index) => <KpiCard key={card.title} {...card} delay={index * 0.1} />)}
      </div>

      {/* Summary Insights */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.5
    }} className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">
              Auslastungsanalyse
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              {kpiData.avgHistorical > kpiData.avgForecast ? <p>• Die prognostizierte Auslastung liegt unter dem historischen Durchschnitt</p> : kpiData.avgHistorical < kpiData.avgForecast ? <p>• Die prognostizierte Auslastung steigt im Vergleich zum historischen Durchschnitt</p> : <p>• Die prognostizierte Auslastung bleibt stabil</p>}
              {kpiData.overUtilized > 0 && <p>• {kpiData.overUtilized} Datenpunkt{kpiData.overUtilized !== 1 ? 'e' : ''} mit Überauslastung identifiziert</p>}
              {kpiData.missingValues > 0 && <p>• {kpiData.missingValues} fehlende Werte werden in Berechnungen ignoriert</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>;
}