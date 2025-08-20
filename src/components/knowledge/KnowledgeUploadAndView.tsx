import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Archive, 
  RotateCcw,
  X,
  Check,
  AlertCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KnowledgeCategory, 
  KnowledgeSkill, 
  ImportRow, 
  ImportResult, 
  ImportError,
  KnowledgeFilters 
} from '../../types/knowledge';
import { 
  listCategories, 
  listSkills, 
  upsertCategoryByName, 
  upsertSkill, 
  renameCategory, 
  softDeleteCategory, 
  restoreCategory,
  updateSkill,
  softDeleteSkill,
  restoreSkill,
  importKnowledgeData,
  exportToCSV
} from '../../services/knowledge';
import { parseKnowledgeFile, validateImportRows } from '../../lib/parseKnowledgeFile';

interface KnowledgeUploadAndViewProps {
  className?: string;
}

export function KnowledgeUploadAndView({ className = '' }: KnowledgeUploadAndViewProps) {
  // State
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'view'>('upload');
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [skills, setSkills] = useState<KnowledgeSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [archiveMissing, setArchiveMissing] = useState(false);

  // CRUD state
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(null);
  const [editingSkill, setEditingSkill] = useState<KnowledgeSkill | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSkill, setNewSkill] = useState({ name: '', categoryId: '', status: 'Standard' as const });

  // View state
  const [filters, setFilters] = useState<KnowledgeFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [categoriesData, skillsData] = await Promise.all([
        listCategories({ includeArchived: showArchived }),
        listSkills({ includeArchived: showArchived })
      ]);
      
      setCategories(categoriesData);
      setSkills(skillsData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // File handling
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    
    try {
      const rows = await parseKnowledgeFile(file);
      const { valid, errors } = validateImportRows(rows);
      
      if (errors.length > 0) {
        setError(`Validierungsfehler:\n${errors.join('\n')}`);
        return;
      }
      
      setPreviewRows(valid.slice(0, 10)); // Show first 10 rows
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Parsen der Datei');
    }
  };

  // Import
  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImportProgress(0);
    setError(null);
    
    try {
      const rows = await parseKnowledgeFile(selectedFile);
      const { valid, errors } = validateImportRows(rows);
      
      if (errors.length > 0) {
        setError(`Validierungsfehler:\n${errors.join('\n')}`);
        return;
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await importKnowledgeData(valid, archiveMissing);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      
      // Reload data
      await loadData();
      
      // Reset file selection
      setSelectedFile(null);
      setPreviewRows([]);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Import');
      setImportProgress(0);
    }
  };

  // Category CRUD
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      await upsertCategoryByName(newCategoryName);
      setNewCategoryName('');
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Erstellen der Kategorie');
    }
  };

  const handleRenameCategory = async (category: KnowledgeCategory, newName: string) => {
    try {
      await renameCategory(category.id, newName);
      setEditingCategory(null);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Umbenennen der Kategorie');
    }
  };

  const handleDeleteCategory = async (category: KnowledgeCategory) => {
    if (!confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen? Alle zugehörigen Skills werden archiviert.`)) {
      return;
    }
    
    try {
      await softDeleteCategory(category.id);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Löschen der Kategorie');
    }
  };

  const handleRestoreCategory = async (category: KnowledgeCategory) => {
    try {
      await restoreCategory(category.id);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Wiederherstellen der Kategorie');
    }
  };

  // Skill CRUD
  const handleCreateSkill = async () => {
    if (!newSkill.name.trim() || !newSkill.categoryId) return;
    
    try {
      const category = categories.find(c => c.id === newSkill.categoryId);
      if (!category) throw new Error('Kategorie nicht gefunden');
      
      await upsertSkill({
        name: newSkill.name,
        categoryId: newSkill.categoryId,
        categoryName: category.name,
        status: newSkill.status,
        source: 'manual'
      });
      
      setNewSkill({ name: '', categoryId: '', status: 'Standard' });
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Erstellen des Skills');
    }
  };

  const handleUpdateSkill = async (skill: KnowledgeSkill, updates: Partial<KnowledgeSkill>) => {
    try {
      await updateSkill(skill.id, updates);
      setEditingSkill(null);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Skills');
    }
  };

  const handleDeleteSkill = async (skill: KnowledgeSkill) => {
    if (!confirm(`Möchten Sie den Skill "${skill.name}" wirklich löschen?`)) {
      return;
    }
    
    try {
      await softDeleteSkill(skill.id);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Löschen des Skills');
    }
  };

  const handleRestoreSkill = async (skill: KnowledgeSkill) => {
    try {
      await restoreSkill(skill.id);
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Wiederherstellen des Skills');
    }
  };

  // Filtered skills
  const filteredSkills = useMemo(() => {
    let filtered = skills;
    
    if (filters.q) {
      const query = filters.q.toLowerCase();
      filtered = filtered.filter(skill => 
        skill.name.toLowerCase().includes(query) ||
        skill.categoryName.toLowerCase().includes(query)
      );
    }
    
    if (filters.categoryId) {
      filtered = filtered.filter(skill => skill.categoryId === filters.categoryId);
    }
    
    if (filters.status) {
      filtered = filtered.filter(skill => skill.status === filters.status);
    }
    
    return filtered;
  }, [skills, filters]);

  // Export
  const handleExport = () => {
    const csvContent = exportToCSV(filteredSkills);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `knowledge_library_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({ ...prev, q: searchQuery }));
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Library</h1>
        <p className="text-gray-600">Verwalten Sie Ihre Kategorien und Skills mit Import/Export und CRUD-Funktionalität</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { id: 'upload', label: 'Upload', icon: Upload },
          { id: 'manage', label: 'Verwalten', icon: FileText },
          { id: 'view', label: 'Anzeigen', icon: Search }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Fehler:</span>
            <span className="whitespace-pre-line">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Upload Panel */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Datei hochladen</h2>
              
              <div className="space-y-4">
                {/* File Input */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      <span className="font-medium text-blue-600">Datei auswählen</span> oder hierher ziehen
                    </p>
                    <p className="text-sm text-gray-500 mt-1">CSV, XLSX oder XLS bis 10MB</p>
                  </label>
                </div>

                {/* Selected File */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">{selectedFile.name}</span>
                      <span className="text-sm text-blue-700">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewRows([]);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Preview */}
                {previewRows.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">Vorschau (erste 10 Zeilen)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kategorie
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Auswahl
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewRows.map((row, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900">{row.kategorie}</td>
                              <td className="px-3 py-2 text-sm text-gray-900">{row.auswahl}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">{row.status || 'Standard'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import Options */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={archiveMissing}
                      onChange={(e) => setArchiveMissing(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Fehlende Skills nach Upload archivieren
                    </span>
                  </label>
                </div>

                {/* Import Button */}
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || loading}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importiere...' : 'Import starten'}
                </button>

                {/* Progress Bar */}
                {importProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Import-Fortschritt</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-3">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Import erfolgreich!</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-green-700">
                      <div>
                        <span className="font-medium">Kategorien:</span> {importResult.categoriesCreated} erstellt, {importResult.categoriesUpdated} aktualisiert
                      </div>
                      <div>
                        <span className="font-medium">Skills:</span> {importResult.skillsCreated} erstellt, {importResult.skillsUpdated} aktualisiert
                      </div>
                      {importResult.skillsArchived > 0 && (
                        <div className="col-span-2">
                          <span className="font-medium">Archiviert:</span> {importResult.skillsArchived} Skills
                        </div>
                      )}
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <span className="font-medium text-amber-700">
                          {importResult.errors.length} Fehler beim Import
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'manage' && (
          <motion.div
            key="manage"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Categories Panel */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Kategorien</h2>
                <button
                  onClick={() => setNewCategoryName('')}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* New Category Form */}
              {newCategoryName !== undefined && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Neue Kategorie..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Erstellen
                    </button>
                    <button
                      onClick={() => setNewCategoryName(undefined)}
                      className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {/* Categories List */}
              <div className="space-y-2">
                {categories.map(category => (
                  <div
                    key={category.id}
                    className={`p-3 rounded-lg border ${
                      category.isDeleted 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {editingCategory?.id === category.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRenameCategory(category, editingCategory.name)}
                            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="px-2 py-1 text-gray-600 text-xs hover:text-gray-800"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className={`font-medium ${
                            category.isDeleted ? 'text-gray-500 line-through' : 'text-gray-900'
                          }`}>
                            {category.name}
                          </span>
                          {category.isDeleted && (
                            <span className="ml-2 text-xs text-gray-500">(archiviert)</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {!category.isDeleted ? (
                            <>
                              <button
                                onClick={() => setEditingCategory(category)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRestoreCategory(category)}
                              className="p-1 text-gray-400 hover:text-green-600 rounded"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Panel */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
                <button
                  onClick={() => setNewSkill({ name: '', categoryId: '', status: 'Standard' })}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Neuer Skill
                </button>
              </div>

              {/* New Skill Form */}
              {newSkill.name !== undefined && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newSkill.name}
                      onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                      placeholder="Skill-Name..."
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      value={newSkill.categoryId}
                      onChange={(e) => setNewSkill({ ...newSkill, categoryId: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Kategorie wählen...</option>
                      {categories.filter(c => !c.isDeleted).map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newSkill.status}
                      onChange={(e) => setNewSkill({ ...newSkill, status: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Neu eingefügt">Neu eingefügt</option>
                    </select>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleCreateSkill}
                      disabled={!newSkill.name.trim() || !newSkill.categoryId}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Erstellen
                    </button>
                    <button
                      onClick={() => setNewSkill({ name: '', categoryId: '', status: 'Standard' })}
                      className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {/* Skills Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategorie
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quelle
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {skills.map(skill => (
                      <tr key={skill.id} className={skill.isDeleted ? 'bg-gray-50' : ''}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {editingSkill?.id === skill.id ? (
                            <input
                              type="text"
                              value={editingSkill.name}
                              onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className={skill.isDeleted ? 'line-through text-gray-500' : ''}>
                              {skill.name}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {editingSkill?.id === skill.id ? (
                            <select
                              value={editingSkill.categoryId}
                              onChange={(e) => {
                                const category = categories.find(c => c.id === e.target.value);
                                setEditingSkill({ 
                                  ...editingSkill, 
                                  categoryId: e.target.value,
                                  categoryName: category?.name || ''
                                });
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {categories.filter(c => !c.isDeleted).map(category => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={skill.isDeleted ? 'line-through text-gray-500' : ''}>
                              {skill.categoryName}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {editingSkill?.id === skill.id ? (
                            <select
                              value={editingSkill.status}
                              onChange={(e) => setEditingSkill({ ...editingSkill, status: e.target.value as any })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="Standard">Standard</option>
                              <option value="Neu eingefügt">Neu eingefügt</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              skill.status === 'Neu eingefügt' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {skill.status || 'Standard'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            skill.source === 'upload' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {skill.source || 'manual'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {editingSkill?.id === skill.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateSkill(skill, editingSkill)}
                                className="p-1 text-green-600 hover:text-green-800 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingSkill(null)}
                                className="p-1 text-gray-600 hover:text-gray-800 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              {!skill.isDeleted ? (
                                <>
                                  <button
                                    onClick={() => setEditingSkill(skill)}
                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSkill(skill)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleRestoreSkill(skill)}
                                  className="p-1 text-gray-400 hover:text-green-600 rounded"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'view' && (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Skills oder Kategorien suchen..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Alle Kategorien</option>
                    {categories.filter(c => !c.isDeleted).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      status: e.target.value as any || undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Alle Status</option>
                    <option value="Standard">Standard</option>
                    <option value="Neu eingefügt">Neu eingefügt</option>
                  </select>
                </div>

                {/* Archived Toggle */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Archivierte anzeigen</span>
                  </label>
                </div>
              </div>

              {/* Export Button */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {filteredSkills.length} Skills gefunden
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Als CSV exportieren
                </button>
              </div>
            </div>

            {/* Skills View */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills Übersicht</h2>
              
              {filteredSkills.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>Keine Skills gefunden</p>
                  <p className="text-sm">Passen Sie die Filter an oder laden Sie Daten hoch</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group by Category */}
                  {Array.from(new Set(filteredSkills.map(s => s.categoryName))).map(categoryName => {
                    const categorySkills = filteredSkills.filter(s => s.categoryName === categoryName);
                    return (
                      <div key={categoryName} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">{categoryName}</h3>
                        <div className="flex flex-wrap gap-2">
                          {categorySkills.map(skill => (
                            <div
                              key={skill.id}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                                skill.isDeleted 
                                  ? 'bg-gray-100 text-gray-500 line-through' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              <span>{skill.name}</span>
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                skill.status === 'Neu eingefügt' 
                                  ? 'bg-yellow-200 text-yellow-800' 
                                  : 'bg-gray-200 text-gray-800'
                              }`}>
                                {skill.status || 'Standard'}
                              </span>
                              {skill.source === 'upload' && (
                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-200 text-blue-800">
                                  Upload
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
