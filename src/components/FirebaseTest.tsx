import React from 'react';
import { useFirebaseStorage } from '../hooks/use-firebase-storage';

export function FirebaseTest() {
  const {
    uploadedFiles,
    plannedByPerson,
    customers,
    personStatus,
    personTravelReadiness,
    isLoading,
    error,
    saveUploadedFile,
    savePlannedEngagement,
    savePersonStatus,
    savePersonTravelReadiness,
    saveCustomer
  } = useFirebaseStorage();

  const handleTestUpload = async () => {
    try {
      const testFile = {
        name: 'test.xlsx',
        data: [{ person: 'Test User', week: 'KW1', utilization: 80 }],
        isValid: true,
        uploadedAt: new Date(),
        fileSize: 1000
      };
      
      const id = await saveUploadedFile('auslastung', testFile);
      
      alert(`Test file saved successfully with ID: ${id}`);
    } catch (err) {
      
      alert(`Error: ${err}`);
    }
  };

  const handleTestCustomer = async () => {
    try {
      await saveCustomer('Test Customer GmbH');
      alert('Test customer saved successfully');
    } catch (err) {
      
      alert(`Error: ${err}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Lade Daten aus Firebase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-lg text-red-600">Firebase Fehler</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Firebase Integration Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Uploaded Files:</span> {Object.keys(uploadedFiles).length}
            </div>
            <div>
              <span className="font-medium">Customers:</span> {customers.length}
            </div>
            <div>
              <span className="font-medium">Person Status:</span> {Object.keys(personStatus).length}
            </div>
            <div>
              <span className="font-medium">Travel Readiness:</span> {Object.keys(personTravelReadiness).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleTestUpload}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test File Upload
            </button>
            <button
              onClick={handleTestCustomer}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-4"
            >
              Test Customer Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Data</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Uploaded Files:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(uploadedFiles, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">Customers:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(customers, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium">Person Status:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(personStatus, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
