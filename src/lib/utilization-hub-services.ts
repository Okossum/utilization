// Services für utilizationData Hub - Skills & Rollen Management
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS, AssignedRole, AssignedTechnicalSkill, AssignedSoftSkill, UtilizationDataHub } from './types';

// ===== HELPER FUNCTIONS =====

/**
 * Findet utilizationData Dokument für eine Person
 */
export const findUtilizationDataDoc = async (personName: string) => {
  const utilizationQuery = query(
    collection(db, COLLECTIONS.UTILIZATION_DATA),
    where('person', '==', personName)
  );
  
  const snapshot = await getDocs(utilizationQuery);
  
  if (snapshot.empty) {
    throw new Error(`Kein utilizationData Eintrag für Person gefunden: ${personName}`);
  }
  
  return {
    doc: snapshot.docs[0],
    data: snapshot.docs[0].data() as UtilizationDataHub
  };
};

/**
 * Aktualisiert utilizationData Dokument
 */
export const updateUtilizationDataDoc = async (docId: string, updates: Partial<UtilizationDataHub>) => {
  await updateDoc(doc(db, COLLECTIONS.UTILIZATION_DATA, docId), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

// ===== ROLLEN MANAGEMENT =====

/**
 * Fügt eine Rolle zu einer Person hinzu
 */
export const addRoleToUtilizationData = async (
  personName: string, 
  role: Omit<AssignedRole, 'assignedAt' | 'updatedAt'>
) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const newRole: AssignedRole = {
    ...role,
    assignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const existingRoles = data.assignedRoles || [];
  const updatedRoles = [...existingRoles, newRole];
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    assignedRoles: updatedRoles
  });
  
  console.log('✅ Rolle hinzugefügt zu utilizationData Hub:', { personName, role: newRole });
  return newRole;
};

/**
 * Aktualisiert eine Rolle einer Person
 */
export const updateRoleInUtilizationData = async (
  personName: string,
  roleId: string,
  updates: Partial<AssignedRole>
) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const existingRoles = data.assignedRoles || [];
  const roleIndex = existingRoles.findIndex(r => r.roleId === roleId);
  
  if (roleIndex === -1) {
    throw new Error(`Rolle ${roleId} nicht gefunden für Person ${personName}`);
  }
  
  const updatedRoles = [...existingRoles];
  updatedRoles[roleIndex] = {
    ...updatedRoles[roleIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    assignedRoles: updatedRoles
  });
  
  console.log('✅ Rolle aktualisiert in utilizationData Hub:', { personName, roleId, updates });
  return updatedRoles[roleIndex];
};

/**
 * Entfernt eine Rolle von einer Person
 */
export const removeRoleFromUtilizationData = async (personName: string, roleId: string) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const existingRoles = data.assignedRoles || [];
  const updatedRoles = existingRoles.filter(r => r.roleId !== roleId);
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    assignedRoles: updatedRoles
  });
  
  console.log('✅ Rolle entfernt aus utilizationData Hub:', { personName, roleId });
};

// ===== TECHNICAL SKILLS MANAGEMENT =====

/**
 * Fügt einen Technical Skill zu einer Person hinzu
 */
export const addTechnicalSkillToUtilizationData = async (
  personName: string,
  skill: Omit<AssignedTechnicalSkill, 'assessedAt' | 'updatedAt'>
) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const newSkill: AssignedTechnicalSkill = {
    ...skill,
    assessedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const existingSkills = data.technicalSkills || [];
  const updatedSkills = [...existingSkills, newSkill];
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    technicalSkills: updatedSkills
  });
  
  console.log('✅ Technical Skill hinzugefügt zu utilizationData Hub:', { personName, skill: newSkill });
  return newSkill;
};

/**
 * Aktualisiert einen Technical Skill einer Person
 */
export const updateTechnicalSkillInUtilizationData = async (
  personName: string,
  skillId: string,
  updates: Partial<AssignedTechnicalSkill>
) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const existingSkills = data.technicalSkills || [];
  const skillIndex = existingSkills.findIndex(s => s.skillId === skillId);
  
  if (skillIndex === -1) {
    throw new Error(`Technical Skill ${skillId} nicht gefunden für Person ${personName}`);
  }
  
  const updatedSkills = [...existingSkills];
  updatedSkills[skillIndex] = {
    ...updatedSkills[skillIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    technicalSkills: updatedSkills
  });
  
  console.log('✅ Technical Skill aktualisiert in utilizationData Hub:', { personName, skillId, updates });
  return updatedSkills[skillIndex];
};

/**
 * Entfernt einen Technical Skill von einer Person
 */
export const removeTechnicalSkillFromUtilizationData = async (personName: string, skillId: string) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const existingSkills = data.technicalSkills || [];
  const updatedSkills = existingSkills.filter(s => s.skillId !== skillId);
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    technicalSkills: updatedSkills
  });
  
  console.log('✅ Technical Skill entfernt aus utilizationData Hub:', { personName, skillId });
};

// ===== DOSSIER DATA MANAGEMENT =====

/**
 * Speichert Dossier-Daten (Stärken, Schwächen, etc.) in utilizationData Hub
 */
export const saveDossierDataToUtilizationHub = async (
  personName: string, 
  dossierData: {
    strengths?: string;
    weaknesses?: string;
    comments?: string;
    phone?: string;
    location?: string;
    position?: string;
    email?: string;
  }
) => {
  try {
    console.log('💾 Speichere Dossier-Daten in utilizationData Hub für:', personName);
    
    const { doc: utilizationDoc } = await findUtilizationDataDoc(personName);
    
    const updateData = {
      ...dossierData,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(utilizationDoc.ref, updateData);
    
    console.log('✅ Dossier-Daten erfolgreich in utilizationData Hub gespeichert');
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Dossier-Daten:', error);
    throw error;
  }
};

/**
 * Lädt Dossier-Daten aus utilizationData Hub
 */
export const getDossierDataFromUtilizationHub = async (personName: string) => {
  try {
    console.log('🔄 Lade Dossier-Daten aus utilizationData Hub für:', personName);
    
    const { data } = await findUtilizationDataDoc(personName);
    
    const dossierData = {
      strengths: data.strengths || '',
      weaknesses: data.weaknesses || '',
      comments: data.comments || '',
      phone: data.phone || '',
      location: data.location || '',
      position: data.position || '',
      email: data.email || ''
    };
    
    console.log('✅ Dossier-Daten aus utilizationData Hub geladen:', dossierData);
    
    return dossierData;
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Dossier-Daten:', error);
    throw error;
  }
};

// ===== SOFT SKILLS MANAGEMENT =====

/**
 * Fügt einen Soft Skill zu einer Person hinzu
 */
export const addSoftSkillToUtilizationData = async (
  personName: string,
  skill: Omit<AssignedSoftSkill, 'assessedAt' | 'updatedAt'>
) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const newSkill: AssignedSoftSkill = {
    ...skill,
    assessedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const existingSkills = data.softSkills || [];
  const updatedSkills = [...existingSkills, newSkill];
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    softSkills: updatedSkills
  });
  
  console.log('✅ Soft Skill hinzugefügt zu utilizationData Hub:', { personName, skill: newSkill });
  return newSkill;
};

/**
 * Aktualisiert einen Soft Skill einer Person
 */
export const updateSoftSkillInUtilizationData = async (
  personName: string,
  skillId: string,
  updates: Partial<AssignedSoftSkill>
) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const existingSkills = data.softSkills || [];
  const skillIndex = existingSkills.findIndex(s => s.skillId === skillId);
  
  if (skillIndex === -1) {
    throw new Error(`Soft Skill ${skillId} nicht gefunden für Person ${personName}`);
  }
  
  const updatedSkills = [...existingSkills];
  updatedSkills[skillIndex] = {
    ...updatedSkills[skillIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    softSkills: updatedSkills
  });
  
  console.log('✅ Soft Skill aktualisiert in utilizationData Hub:', { personName, skillId, updates });
  return updatedSkills[skillIndex];
};

/**
 * Entfernt einen Soft Skill von einer Person
 */
export const removeSoftSkillFromUtilizationData = async (personName: string, skillId: string) => {
  const { doc: utilizationDoc, data } = await findUtilizationDataDoc(personName);
  
  const existingSkills = data.softSkills || [];
  const updatedSkills = existingSkills.filter(s => s.skillId !== skillId);
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    softSkills: updatedSkills
  });
  
  console.log('✅ Soft Skill entfernt aus utilizationData Hub:', { personName, skillId });
};

// ===== BULK OPERATIONS =====

/**
 * Migriert bestehende Skills/Rollen einer Person in den utilizationData Hub
 */
export const migratePersonSkillsRolesToHub = async (
  personName: string,
  roles: AssignedRole[],
  technicalSkills: AssignedTechnicalSkill[],
  softSkills: AssignedSoftSkill[]
) => {
  const { doc: utilizationDoc } = await findUtilizationDataDoc(personName);
  
  await updateUtilizationDataDoc(utilizationDoc.id, {
    assignedRoles: roles,
    technicalSkills: technicalSkills,
    softSkills: softSkills
  });
  
  console.log('✅ Skills/Rollen migriert zu utilizationData Hub:', { 
    personName, 
    rolesCount: roles.length,
    technicalSkillsCount: technicalSkills.length,
    softSkillsCount: softSkills.length
  });
};

// ===== GETTER FUNCTIONS =====

/**
 * Lädt alle Skills/Rollen einer Person aus dem utilizationData Hub
 */
export const getPersonSkillsRolesFromHub = async (personName: string) => {
  const { data } = await findUtilizationDataDoc(personName);
  
  return {
    assignedRoles: data.assignedRoles || [],
    technicalSkills: data.technicalSkills || [],
    softSkills: data.softSkills || []
  };
};
