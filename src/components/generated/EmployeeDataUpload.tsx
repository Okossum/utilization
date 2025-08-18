import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytes } from 'firebase/storage';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

interface UploadedFile {
  id: string;
  originalName: string;
  storagePath: string;
  sourceType: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  createdAt: Date;
  uploaderId: string;
}

const EmployeeDataUpload: React.FC = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase services werden bereits aus firebase.ts importiert und sind für Emulatoren konfiguriert

  useEffect(() => {
    const unsubscribe = loadUploadedFiles();
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const loadUploadedFiles = () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Lade die letzten 10 Mitarbeiter-Uploads des Users mit onSnapshot
      const sourceFilesQuery = query(
        collection(db, 'sourceFiles')
      );
      
      const unsubscribe = onSnapshot(sourceFilesQuery, (snapshot) => {
        const files: UploadedFile[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          files.push({
            id: doc.id,
            originalName: data.originalName || 'Unbekannte Datei',
            storagePath: data.storagePath || '',
            sourceType: data.sourceType || 'mitarbeiter',
            status: data.status || 'uploaded',
            createdAt: data.createdAt?.toDate() || new Date(),
            uploaderId: data.uploaderId || '',
          });
        });
        
        setUploadedFiles(files);
        setIsLoading(false);
      }, (error) => {
        console.error('Fehler beim Laden der hochgeladenen Dateien:', error);
        setIsLoading(false);
      });
      
      // Cleanup function
      return unsubscribe;
    } catch (error) {
      console.error('Fehler beim Laden der hochgeladenen Dateien:', error);
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setSelectedFile(file);
    } else if (file) {
      alert('Bitte wählen Sie eine Excel-Datei (.xlsx) aus.');
      event.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Erstelle einen eindeutigen Dateinamen
      const timestamp = Date.now();
      const fileName = `${timestamp}_${selectedFile.name}`;
      const storagePath = `uploads/mitarbeiter/${user.uid}/${fileName}`;

      // Upload zur Firebase Storage
      const storageRef = ref(storage, storagePath);
      
      // Simuliere Upload-Fortschritt
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await uploadBytes(storageRef, selectedFile);
      
      clearInterval(uploadInterval);
      setUploadProgress(100);

      // Speichere Metadaten in Firestore
      const fileMetadata = {
        uploaderId: user.uid,
        originalName: selectedFile.name,
        storagePath: storagePath,
        sourceType: 'mitarbeiter',
        status: 'uploaded',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'sourceFiles'), fileMetadata);

      // UI zurücksetzen
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Dateiliste wird automatisch durch onSnapshot aktualisiert

      alert('Datei erfolgreich hochgeladen! Die Verarbeitung beginnt automatisch.');

    } catch (error) {
      console.error('Fehler beim Upload:', error);
      alert('Fehler beim Upload der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'processed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'processing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status?: string): string => {
    switch (status) {
      case 'processed': return 'Verarbeitet';
      case 'error': return 'Fehler';
      case 'processing': return 'Wird verarbeitet';
      default: return 'Unbekannt';
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
        Mitarbeiter-Daten Upload
      </h1>

      {/* Upload-Bereich */}
      <div style={{ 
        border: '2px dashed #ddd', 
        borderRadius: 8, 
        padding: 24, 
        textAlign: 'center',
        marginBottom: 32,
        backgroundColor: '#fafafa'
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Excel-Datei hochladen
        </h2>
        
        <p style={{ color: '#666', marginBottom: 20 }}>
          Wählen Sie eine .xlsx-Datei mit Mitarbeiterdaten aus
        </p>

        <input
          type="file"
          accept=".xlsx"
          onChange={handleFileSelect}
          disabled={isUploading}
          style={{ marginBottom: 16 }}
        />

        {selectedFile && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 500 }}>Ausgewählte Datei:</p>
            <p style={{ color: '#666' }}>{selectedFile.name}</p>
          </div>
        )}

        {isUploading && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ 
              width: '100%', 
              height: 8, 
              backgroundColor: '#eee', 
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#007bff',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
              Upload läuft... {uploadProgress}%
            </p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          style={{
            padding: '12px 24px',
            backgroundColor: selectedFile && !isUploading ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            cursor: selectedFile && !isUploading ? 'pointer' : 'not-allowed',
            opacity: selectedFile && !isUploading ? 1 : 0.6
          }}
        >
          {isUploading ? 'Wird hochgeladen...' : 'Datei hochladen'}
        </button>
      </div>

      {/* Liste der hochgeladenen Dateien */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Meine Mitarbeiter-Uploads (letzte 10)
        </h2>

        {isLoading ? (
          <p>Lade Dateien...</p>
        ) : uploadedFiles.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Noch keine Dateien hochgeladen.
          </p>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Dateiname
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Speicherpfad
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Datum
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Status
                  </th>
                </tr>
              </thead>
                               <tbody>
                   {uploadedFiles.map((file) => (
                     <tr key={file.id} style={{ borderBottom: '1px solid #eee' }}>
                       <td style={{ padding: '12px' }}>
                         <span style={{ fontWeight: 500 }}>{file.originalName}</span>
                       </td>
                       <td style={{ padding: '12px', color: '#666' }}>
                         <code style={{ fontSize: '12px' }}>{file.storagePath}</code>
                       </td>
                       <td style={{ padding: '12px', color: '#666' }}>
                         {formatDate(file.createdAt)}
                       </td>
                       <td style={{ padding: '12px' }}>
                         <span className={getStatusColor(file.status)}>
                           {getStatusText(file.status)}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDataUpload;
