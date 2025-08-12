import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, AlertTriangle, Info, HelpCircle } from 'lucide-react';
interface KpiData {
  avgHistorical: number;
  avgForecast: number;
  overUtilized: number;
  missingValues: number;
  mpid?: string;
}
interface KpiCardsGridProps {
  kpiData: KpiData;
  mpid?: string;
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
  mpid?: string;
}
function KpiCard({
  title,
  value,
  icon: IconComponent,
  color,
  tooltip,
  trend,
  subtitle,
  delay = 0
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
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" data-magicpath-id="0" data-magicpath-path="KpiCardsGrid.tsx" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" data-magicpath-id="1" data-magicpath-path="KpiCardsGrid.tsx" />;
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
  }} className={`relative p-6 rounded-xl border ${colors.bg} ${colors.border} hover:shadow-lg transition-all duration-300 group cursor-default`} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} data-magicpath-id="2" data-magicpath-path="KpiCardsGrid.tsx">
      {/* Tooltip */}
      <AnimatePresence data-magicpath-id="3" data-magicpath-path="KpiCardsGrid.tsx">
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
      }} className="absolute top-4 right-4 z-10" data-magicpath-id="4" data-magicpath-path="KpiCardsGrid.tsx">
            <div className="relative" data-magicpath-id="5" data-magicpath-path="KpiCardsGrid.tsx">
              <HelpCircle className="w-4 h-4 text-gray-400" data-magicpath-id="6" data-magicpath-path="KpiCardsGrid.tsx" />
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl" data-magicpath-id="7" data-magicpath-path="KpiCardsGrid.tsx">
                <p className="leading-relaxed" data-magicpath-id="8" data-magicpath-path="KpiCardsGrid.tsx">{tooltip}</p>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" data-magicpath-id="9" data-magicpath-path="KpiCardsGrid.tsx"></div>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>

      {/* Header with Icon */}
      <div className="flex items-start justify-between mb-4" data-magicpath-id="10" data-magicpath-path="KpiCardsGrid.tsx">
        <motion.div whileHover={{
        scale: 1.05
      }} className={`p-3 rounded-lg ${colors.iconBg} border ${colors.border}`} data-magicpath-id="11" data-magicpath-path="KpiCardsGrid.tsx">
          <IconComponent className={`w-5 h-5 ${colors.icon}`} data-magicpath-id="12" data-magicpath-path="KpiCardsGrid.tsx" />
        </motion.div>
        
        {/* Info Icon - Always visible on mobile, hover on desktop */}
        <div className="block sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" data-magicpath-id="13" data-magicpath-path="KpiCardsGrid.tsx">
          <Info className="w-4 h-4 text-gray-400" data-magicpath-id="14" data-magicpath-path="KpiCardsGrid.tsx" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2" data-magicpath-id="15" data-magicpath-path="KpiCardsGrid.tsx">
        <h3 className="text-sm font-medium text-gray-600 leading-tight pr-2" data-magicpath-id="16" data-magicpath-path="KpiCardsGrid.tsx">
          {title}
        </h3>
        
        <div className="flex items-baseline gap-2" data-magicpath-id="17" data-magicpath-path="KpiCardsGrid.tsx">
          <motion.p key={value} initial={{
          scale: 1.1,
          opacity: 0.8
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          duration: 0.2
        }} className={`text-3xl font-bold ${colors.value}`} data-magicpath-id="18" data-magicpath-path="KpiCardsGrid.tsx">
            {value}
          </motion.p>
          {getTrendIcon()}
        </div>

        {subtitle && <p className="text-xs text-gray-500 mt-1" data-magicpath-id="19" data-magicpath-path="KpiCardsGrid.tsx">
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
    }} className="mt-4 flex items-center gap-2" data-magicpath-id="20" data-magicpath-path="KpiCardsGrid.tsx">
          <div className={`w-2 h-2 rounded-full ${colors.indicator}`} data-magicpath-id="21" data-magicpath-path="KpiCardsGrid.tsx"></div>
          <span className="text-xs font-medium text-gray-600" data-magicpath-id="22" data-magicpath-path="KpiCardsGrid.tsx">
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
    }} className="absolute top-2 left-2" data-magicpath-id="23" data-magicpath-path="KpiCardsGrid.tsx">
          <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center" data-magicpath-id="24" data-magicpath-path="KpiCardsGrid.tsx">
            <Star className="w-2 h-2 text-yellow-800" data-magicpath-id="25" data-magicpath-path="KpiCardsGrid.tsx" />
          </div>
        </motion.div>}

      {/* Hover effect overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" data-magicpath-id="26" data-magicpath-path="KpiCardsGrid.tsx" />
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
    title: 'Ø Auslastung Rückblick (8 W)',
    value: `${kpiData.avgHistorical}%`,
    icon: TrendingUp,
    color: getHistoricalColor(),
    tooltip: 'Durchschnittliche Auslastung der letzten 8 Wochen. Ø über vorhandene Werte, fehlende Daten werden ignoriert.',
    trend: getHistoricalTrend(),
    subtitle: 'Historische Daten',
    mpid: "4e3e5bda-c367-472d-9fe7-b359f605b5fc"
  }, {
    title: 'Ø Auslastung Vorblick (4 W)',
    value: `${kpiData.avgForecast}%`,
    icon: TrendingDown,
    color: getForecastColor(),
    tooltip: 'Prognostizierte durchschnittliche Auslastung der nächsten 4 Wochen. Ø über vorhandene Werte, fehlende Daten werden ignoriert.',
    trend: getForecastTrend(),
    subtitle: 'Prognosedaten',
    mpid: "703aaf10-7814-4e74-9005-98d8a9bdf602"
  }, {
    title: '⭐ >100 % (Anzahl Personen/Wochen)',
    value: kpiData.overUtilized.toString(),
    icon: Star,
    color: 'blue' as const,
    tooltip: 'Anzahl der Datenpunkte (Person/Woche-Kombinationen) mit Überauslastung über 100%. Diese werden besonders hervorgehoben.',
    subtitle: kpiData.overUtilized === 1 ? 'Datenpunkt' : 'Datenpunkte',
    mpid: "61a2a0f3-b262-4a20-9a7d-f4311bee7baa"
  }, {
    title: 'Anzahl fehlender Werte (ignoriert)',
    value: kpiData.missingValues.toString(),
    icon: AlertTriangle,
    color: 'gray' as const,
    tooltip: 'Anzahl der fehlenden Auslastungswerte in den Daten. Diese Werte werden in allen Berechnungen und Aggregationen ignoriert.',
    subtitle: 'Werden nicht berücksichtigt',
    mpid: "bb2782dc-3d04-4c8c-b951-9e0f5c30c04d"
  }] as any[];
  return <div className="space-y-4" data-magicpath-id="27" data-magicpath-path="KpiCardsGrid.tsx">
      {/* Section Header */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="flex items-center justify-between" data-magicpath-id="28" data-magicpath-path="KpiCardsGrid.tsx">
        <div data-magicpath-id="29" data-magicpath-path="KpiCardsGrid.tsx">
          <h2 className="text-lg font-semibold text-gray-900" data-magicpath-id="30" data-magicpath-path="KpiCardsGrid.tsx">
            Kennzahlen Übersicht
          </h2>
          <p className="text-sm text-gray-600 mt-1" data-magicpath-id="31" data-magicpath-path="KpiCardsGrid.tsx">
            Wichtige Metriken zur Auslastungsanalyse
          </p>
        </div>
      </motion.div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" data-magicpath-id="32" data-magicpath-path="KpiCardsGrid.tsx">
        {cards.map((card, index) => <KpiCard key={card.title} {...card} delay={index * 0.1} data-magicpath-uuid={(card as any)["mpid"] ?? "unsafe"} data-magicpath-id="33" data-magicpath-path="KpiCardsGrid.tsx" />)}
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
    }} className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200" data-magicpath-id="34" data-magicpath-path="KpiCardsGrid.tsx">
        <div className="flex items-start gap-3" data-magicpath-id="35" data-magicpath-path="KpiCardsGrid.tsx">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" data-magicpath-id="36" data-magicpath-path="KpiCardsGrid.tsx" />
          <div className="space-y-2" data-magicpath-id="37" data-magicpath-path="KpiCardsGrid.tsx">
            <h4 className="text-sm font-medium text-gray-900" data-magicpath-id="38" data-magicpath-path="KpiCardsGrid.tsx">
              Auslastungsanalyse
            </h4>
            <div className="text-sm text-gray-600 space-y-1" data-magicpath-id="39" data-magicpath-path="KpiCardsGrid.tsx">
              {kpiData.avgHistorical > kpiData.avgForecast ? <p data-magicpath-id="40" data-magicpath-path="KpiCardsGrid.tsx">• Die prognostizierte Auslastung liegt unter dem historischen Durchschnitt</p> : kpiData.avgHistorical < kpiData.avgForecast ? <p data-magicpath-id="41" data-magicpath-path="KpiCardsGrid.tsx">• Die prognostizierte Auslastung steigt im Vergleich zum historischen Durchschnitt</p> : <p data-magicpath-id="42" data-magicpath-path="KpiCardsGrid.tsx">• Die prognostizierte Auslastung bleibt stabil</p>}
              {kpiData.overUtilized > 0 && <p data-magicpath-id="43" data-magicpath-path="KpiCardsGrid.tsx">• {kpiData.overUtilized} Datenpunkt{kpiData.overUtilized !== 1 ? 'e' : ''} mit Überauslastung identifiziert</p>}
              {kpiData.missingValues > 0 && <p data-magicpath-id="44" data-magicpath-path="KpiCardsGrid.tsx">• {kpiData.missingValues} fehlende Werte werden in Berechnungen ignoriert</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>;
}