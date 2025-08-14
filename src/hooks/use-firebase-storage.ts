import { useState, useEffect, useCallback } from 'react';
import { 
  uploadFileService, 
  plannedEngagementService, 
  personStatusService, 
  personTravelReadinessService, 
  customerService 
} from '../lib/firebase-services';
import { 
  UploadedFile, 
  PlannedEngagement, 
  PersonStatus, 
  PersonTravelReadiness, 
  Customer 
} from '../lib/types';

// Hook für Firebase-basierte Datenspeicherung
export const useFirebaseStorage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Uploaded Files
  const [uploadedFiles, setUploadedFiles] = useState<{
    auslastung?: UploadedFile;
    einsatzplan?: UploadedFile;
  }>({});

  // Planned Engagements
  const [plannedByPerson, setPlannedByPerson] = useState<Record<string, PlannedEngagement>>({});
  
  // Customers
  const [customers, setCustomers] = useState<string[]>([]);
  
  // Person Status
  const [personStatus, setPersonStatus] = useState<Record<string, string | undefined>>({});
  
  // Person Travel Readiness
  const [personTravelReadiness, setPersonTravelReadiness] = useState<Record<string, number | undefined>>({});

  // Error Handler
  const handleError = useCallback((err: any, operation: string) => {
    console.error(`Firebase ${operation} error:`, err);
    setError(`Fehler bei ${operation}: ${err.message || err}`);
    setIsLoading(false);
  }, []);

  // Uploaded Files Operations
  const saveUploadedFile = useCallback(async (type: 'auslastung' | 'einsatzplan', file: UploadedFile) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fileId = await uploadFileService.save({
        ...file,
        fileSize: file.data.length,
        uploadedAt: new Date()
      });
      
      setUploadedFiles(prev => ({
        ...prev,
        [type]: { ...file, id: fileId }
      }));
      
      setIsLoading(false);
      return fileId;
    } catch (err) {
      handleError(err, 'Datei-Upload');
    }
  }, [handleError]);

  const loadUploadedFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const files = await uploadFileService.getAll();
      
      // Gruppiere nach Typ (auslastung/einsatzplan)
      const grouped = files.reduce((acc, file) => {
        if (file.name.toLowerCase().includes('auslastung')) {
          acc.auslastung = file;
        } else if (file.name.toLowerCase().includes('einsatzplan')) {
          acc.einsatzplan = file;
        }
        return acc;
      }, {} as { auslastung?: UploadedFile; einsatzplan?: UploadedFile });
      
      setUploadedFiles(grouped);
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Dateien laden');
    }
  }, [handleError]);

  // Planned Engagements Operations
  const savePlannedEngagement = useCallback(async (engagement: PlannedEngagement) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const engagementId = await plannedEngagementService.save(engagement);
      
      setPlannedByPerson(prev => ({
        ...prev,
        [engagement.person]: { ...engagement, id: engagementId }
      }));
      
      setIsLoading(false);
      return engagementId;
    } catch (err) {
      handleError(err, 'Engagement speichern');
    }
  }, [handleError]);

  const loadPlannedEngagements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const engagements = await plannedEngagementService.getAll();
      
      const grouped = engagements.reduce((acc, engagement) => {
        acc[engagement.person] = engagement;
        return acc;
      }, {} as Record<string, PlannedEngagement>);
      
      setPlannedByPerson(grouped);
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Engagements laden');
    }
  }, [handleError]);

  // Person Status Operations
  const savePersonStatus = useCallback(async (person: string, status: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await personStatusService.update(person, status);
      
      setPersonStatus(prev => ({
        ...prev,
        [person]: status
      }));
      
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Person-Status speichern');
    }
  }, [handleError]);

  const loadPersonStatuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const statuses = await personStatusService.getAll();
      
      const grouped = statuses.reduce((acc, status) => {
        acc[status.person] = status.status;
        return acc;
      }, {} as Record<string, string>);
      
      setPersonStatus(grouped);
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Person-Status laden');
    }
  }, [handleError]);

  // Person Travel Readiness Operations
  const savePersonTravelReadiness = useCallback(async (person: string, readiness: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await personTravelReadinessService.update(person, readiness);
      
      setPersonTravelReadiness(prev => ({
        ...prev,
        [person]: readiness
      }));
      
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Reisebereitschaft speichern');
    }
  }, [handleError]);

  const loadPersonTravelReadiness = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const readiness = await personTravelReadinessService.getAll();
      
      const grouped = readiness.reduce((acc, r) => {
        acc[r.person] = r.readiness;
        return acc;
      }, {} as Record<string, number>);
      
      setPersonTravelReadiness(grouped);
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Reisebereitschaft laden');
    }
  }, [handleError]);

  // Customers Operations
  const saveCustomer = useCallback(async (customerName: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await customerService.save({ 
        name: customerName, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      });
      
      setCustomers(prev => {
        if (!prev.includes(customerName)) {
          return [...prev, customerName];
        }
        return prev;
      });
      
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Kunde speichern');
    }
  }, [handleError]);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const customersList = await customerService.getAll();
      const customerNames = customersList.map(c => c.name);
      setCustomers(customerNames);
      setIsLoading(false);
    } catch (err) {
      handleError(err, 'Kunden laden');
    }
  }, [handleError]);

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadUploadedFiles(),
        loadPlannedEngagements(),
        loadPersonStatuses(),
        loadPersonTravelReadiness(),
        loadCustomers()
      ]);
    };
    
    loadAllData();
  }, [loadUploadedFiles, loadPlannedEngagements, loadPersonStatuses, loadPersonTravelReadiness, loadCustomers]);

  return {
    // State
    uploadedFiles,
    plannedByPerson,
    customers,
    personStatus,
    personTravelReadiness,
    isLoading,
    error,
    
    // Operations
    saveUploadedFile,
    savePlannedEngagement,
    savePersonStatus,
    savePersonTravelReadiness,
    saveCustomer,
    
    // Load operations
    loadUploadedFiles,
    loadPlannedEngagements,
    loadPersonStatuses,
    loadPersonTravelReadiness,
    loadCustomers,
    
    // Utility
    clearError: () => setError(null)
  };
};
