/**
 * Debug: Teste die Berechtigungslogik
 */

// Simuliere die permissions.ts Logik
const ROLE_PERMISSIONS = {
  admin: {
    views: ['utilization', 'employees', 'sales'],
    settings: ['all'],
    canManageUsers: true,
    canUploadData: true,
    canViewAllEmployees: true
  },
  führungskraft: {
    views: ['utilization', 'employees', 'sales'],
    settings: ['excel-upload', 'help'],
    canManageUsers: false,
    canUploadData: true,
    canViewAllEmployees: true
  },
  sales: {
    views: ['sales'],
    settings: ['help'],
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  },
  user: {
    views: ['utilization'],
    settings: ['help'],
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  },
  unknown: {
    views: [],
    settings: [],
    canManageUsers: false,
    canUploadData: false,
    canViewAllEmployees: false
  }
};

const canAccessView = (role, view) => {
  return ROLE_PERMISSIONS[role].views.includes(view);
};

console.log('🔍 BERECHTIGUNGSTEST');
console.log('=' .repeat(40));

const testRole = 'admin';
const testView = 'utilization';

console.log(`👤 Rolle: ${testRole}`);
console.log(`🎯 View: ${testView}`);
console.log(`📋 Verfügbare Views für ${testRole}:`, ROLE_PERMISSIONS[testRole].views);
console.log(`✅ Zugriff auf ${testView}:`, canAccessView(testRole, testView));

console.log('\n🔍 Alle Rollen testen:');
['admin', 'führungskraft', 'sales', 'user', 'unknown'].forEach(role => {
  const hasAccess = canAccessView(role, 'utilization');
  console.log(`${role}: ${hasAccess ? '✅' : '❌'} utilization`);
});
