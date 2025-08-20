import { render, screen } from '@testing-library/react';
import { KnowledgeUploadAndView } from './KnowledgeUploadAndView';

// Mock Firebase
jest.mock('../../lib/firebase', () => ({
  db: {}
}));

// Mock services
jest.mock('../../services/knowledge', () => ({
  listCategories: jest.fn().mockResolvedValue([]),
  listSkills: jest.fn().mockResolvedValue([]),
  upsertCategoryByName: jest.fn(),
  upsertSkill: jest.fn(),
  renameCategory: jest.fn(),
  softDeleteCategory: jest.fn(),
  restoreCategory: jest.fn(),
  updateSkill: jest.fn(),
  softDeleteSkill: jest.fn(),
  restoreSkill: jest.fn(),
  importKnowledgeData: jest.fn(),
  exportToCSV: jest.fn()
}));

// Mock parser
jest.mock('../../lib/parseKnowledgeFile', () => ({
  parseKnowledgeFile: jest.fn(),
  validateImportRows: jest.fn()
}));

describe('KnowledgeUploadAndView', () => {
  it('renders without crashing', () => {
    render(<KnowledgeUploadAndView />);
    expect(screen.getByText('Knowledge Library')).toBeInTheDocument();
  });

  it('shows upload tab by default', () => {
    render(<KnowledgeUploadAndView />);
    expect(screen.getByText('Datei hochladen')).toBeInTheDocument();
  });

  it('shows all three tabs', () => {
    render(<KnowledgeUploadAndView />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Verwalten')).toBeInTheDocument();
    expect(screen.getByText('Anzeigen')).toBeInTheDocument();
  });
});
