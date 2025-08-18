import React, { useState } from 'react';
import { Search, Filter, Users, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeUploadModal } from './EmployeeUploadModal';
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
const employeeData: Employee[] = [{
  id: '1',
  name: 'Sarah Chen',
  role: 'Senior Frontend Developer',
  department: 'Engineering',
  skills: ['React', 'TypeScript', 'UI/UX Design', 'Node.js'],
  experience: '5+ years',
  availability: 'Available',
  comments: 'Excellent track record with client-facing projects. Strong communication skills and proven ability to deliver complex frontend solutions on time.',
  email: 'sarah.chen@company.com',
  phone: '+1 (555) 123-4567',
  isActive: false
}, {
  id: '2',
  name: 'Marcus Rodriguez',
  role: 'DevOps Engineer',
  department: 'Infrastructure',
  skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
  experience: '7+ years',
  availability: 'On Project',
  comments: 'Infrastructure specialist with deep cloud expertise. Currently leading the migration project but available for consultation.',
  email: 'marcus.rodriguez@company.com',
  phone: '+1 (555) 234-5678',
  isActive: true
}, {
  id: '3',
  name: 'Emily Watson',
  role: 'Product Manager',
  department: 'Product',
  skills: ['Strategy', 'Analytics', 'Agile', 'Stakeholder Management'],
  experience: '6+ years',
  availability: 'Available',
  comments: 'Strategic thinker with excellent client relationship management. Has successfully delivered 15+ projects with high client satisfaction.',
  email: 'emily.watson@company.com',
  phone: '+1 (555) 345-6789',
  isActive: false
}, {
  id: '4',
  name: 'David Kim',
  role: 'Full Stack Developer',
  department: 'Engineering',
  skills: ['Python', 'Django', 'React', 'PostgreSQL'],
  experience: '4+ years',
  availability: 'Busy',
  comments: 'Versatile developer with strong backend and frontend capabilities. Currently wrapping up a major client project.',
  email: 'david.kim@company.com',
  phone: '+1 (555) 456-7890',
  isActive: false
}, {
  id: '5',
  name: 'Lisa Thompson',
  role: 'UX Designer',
  department: 'Design',
  skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
  experience: '5+ years',
  availability: 'Available',
  comments: 'Award-winning designer with expertise in enterprise applications. Excellent at translating complex requirements into intuitive interfaces.',
  email: 'lisa.thompson@company.com',
  phone: '+1 (555) 567-8901',
  isActive: true
}, {
  id: '6',
  name: 'Alex Johnson',
  role: 'Backend Developer',
  department: 'Engineering',
  skills: ['Java', 'Spring Boot', 'Microservices', 'MongoDB'],
  experience: '6+ years',
  availability: 'Available',
  comments: 'Scalable architecture expert with proven experience in high-traffic applications. Strong problem-solving skills and mentoring capabilities.',
  email: 'alex.johnson@company.com',
  phone: '+1 (555) 678-9012',
  isActive: false
}];

// @component: EmployeeListView
export const EmployeeListView = () => {
  const [employees, setEmployees] = useState<Employee[]>(employeeData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const departments = ['All', ...Array.from(new Set(employees.map(emp => emp.department)))];
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) || employee.role.toLowerCase().includes(searchTerm.toLowerCase()) || employee.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDepartment = selectedDepartment === 'All' || employee.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });
  const handleToggleActive = (employeeId: string) => {
    setEmployees(prev => prev.map(emp => emp.id === employeeId ? {
      ...emp,
      isActive: !emp.isActive
    } : emp));
  };

  // @return
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{
        opacity: 0,
        y: -20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6
      }} className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-slate-800">
                <span>Mitarbeiter für Projekte</span>
              </h1>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              title="Mitarbeiter-Excel hochladen"
            >
              <Upload className="w-4 h-4" />
              Excel Upload
            </button>
          </div>
          <p className="text-slate-600 text-lg">
            <span>Identifizieren und vorschlagen Sie Mitarbeiter für Kundenprojekte</span>
          </p>
        </motion.div>

        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6,
        delay: 0.2
      }} className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input type="text" placeholder="Suche nach Name, Rolle oder Fähigkeiten..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="pl-12 pr-8 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white min-w-48">
                {departments.map(dept => <option key={dept} value={dept}>
                    {dept === 'All' ? 'Alle Abteilungen' : dept}
                  </option>)}
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.6,
        delay: 0.4
      }} className="grid grid-cols-1 gap-6">
          {filteredEmployees.map((employee, index) => <motion.div key={employee.id} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          delay: index * 0.1
        }}>
              <EmployeeCard employee={employee} onToggleActive={handleToggleActive} />
            </motion.div>)}
        </motion.div>

        {filteredEmployees.length === 0 && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.4
      }} className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">
              <span>Keine Mitarbeiter gefunden</span>
            </h3>
            <p className="text-slate-500">
              <span>Versuchen Sie, Ihre Suchkriterien anzupassen</span>
            </p>
          </motion.div>}
      </div>
      
      {/* Upload Modal */}
      <EmployeeUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>;
};