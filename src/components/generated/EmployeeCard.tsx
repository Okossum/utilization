import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, ChevronDown, ChevronUp, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  skills: string[];
  experience: string;
  availability: 'Available' | 'Busy' | 'On Project';
  comments: string;
  email: string;
  phone: string;
  isActive: boolean;
  profileImage?: string;
}
interface EmployeeCardProps {
  employee: Employee;
  onToggleActive: (employeeId: string) => void;
}

// @component: EmployeeCard
export const EmployeeCard = ({
  employee,
  onToggleActive
}: EmployeeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Busy':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'On Project':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'Available':
        return 'Verfügbar';
      case 'Busy':
        return 'Beschäftigt';
      case 'On Project':
        return 'Im Projekt';
      default:
        return availability;
    }
  };

  // @return
  return <motion.div whileHover={{
    y: -4,
    scale: 1.02
  }} transition={{
    duration: 0.2
  }} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {employee.profileImage ? <img src={employee.profileImage} alt={`${employee.name} profile`} className="w-full h-full rounded-xl object-cover" /> : <User className="w-7 h-7" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                <span>{employee.name}</span>
              </h3>
              <p className="text-slate-600 font-medium">
                <span>{employee.role}</span>
              </p>
            </div>
          </div>
          
          <motion.button whileHover={{
          scale: 1.05
        }} whileTap={{
          scale: 0.95
        }} onClick={() => onToggleActive(employee.id)} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${employee.isActive ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <motion.span animate={{
            x: employee.isActive ? 24 : 4
          }} transition={{
            duration: 0.2
          }} className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg" />
            <span className={`absolute text-xs font-bold ${employee.isActive ? 'left-1 text-white' : 'right-1 text-slate-600'}`}>
              <span>ACT</span>
            </span>
          </motion.button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 text-sm">{employee.department}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 text-sm">{employee.experience}</span>
            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(employee.availability)}`}>
              <span>{getAvailabilityText(employee.availability)}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            <span>Fähigkeiten</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {employee.skills.slice(0, 3).map(skill => <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                <span>{skill}</span>
              </span>)}
            {employee.skills.length > 3 && <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-sm">
                <span>+{employee.skills.length - 3} mehr</span>
              </span>}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between w-full text-left">
            <h4 className="text-sm font-semibold text-slate-700">
              <span>Kommentare & Kontakt</span>
            </h4>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
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
          }} transition={{
            duration: 0.3
          }} className="mt-3 space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <span>{employee.comments}</span>
                </p>
                
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${employee.email}`} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                      <span>{employee.email}</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${employee.phone}`} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                      <span>{employee.phone}</span>
                    </a>
                  </div>
                </div>
              </motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>;
};