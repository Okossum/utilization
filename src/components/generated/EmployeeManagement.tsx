import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const EmployeeManagement: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Employee Management</h1>
      <p>Firestore-only Basis ist eingerichtet. Upload & CRUD folgen im nächsten Schritt.</p>
      {user && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>Angemeldet als: {user.email}</div>
          <button onClick={logout} style={{ padding: '6px 10px' }}>Abmelden</button>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
