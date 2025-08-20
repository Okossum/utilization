import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  COLLECTIONS,
  FirestoreUploadedFile,
  FirestorePlannedEngagement,
  FirestorePersonStatus,
  FirestorePersonTravelReadiness,
  FirestoreCustomer,
  FirestoreAssignment,
  UploadedFile,
  PlannedEngagement,
  PersonStatus,
  PersonTravelReadiness,
  Customer,
  AssignmentDoc
} from './types';
import { FirestoreSkill, SkillDoc, FirestoreEmployeeSkill, EmployeeSkillDoc } from './types';

// Helper-Funktion für Timestamp-Konvertierung
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date();
};

// Helper-Funktion für Firestore-Dokumente
const addFirestoreFields = <T>(data: T): T & { createdAt: Date; updatedAt: Date } => ({
  ...data,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Uploaded Files Services
export const uploadFileService = {
  async save(file: UploadedFile): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.UPLOADED_FILES), {
      ...addFirestoreFields(file),
      uploadedAt: new Date()
    });
    return docRef.id;
  },

  async getById(id: string): Promise<FirestoreUploadedFile | null> {
    const docRef = doc(db, COLLECTIONS.UPLOADED_FILES, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        uploadedAt: convertTimestamp(data.uploadedAt)
      } as FirestoreUploadedFile;
    }
    return null;
  },

  async getAll(): Promise<FirestoreUploadedFile[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.UPLOADED_FILES));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt),
      uploadedAt: convertTimestamp(doc.data().uploadedAt)
    })) as FirestoreUploadedFile[];
  },

  async update(id: string, updates: Partial<UploadedFile>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.UPLOADED_FILES, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.UPLOADED_FILES, id);
    await deleteDoc(docRef);
  }
};

// Planned Engagements Services
export const plannedEngagementService = {
  async save(engagement: PlannedEngagement): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PLANNED_ENGAGEMENTS), {
      ...addFirestoreFields(engagement)
    });
    return docRef.id;
  },

  async getById(id: string): Promise<FirestorePlannedEngagement | null> {
    const docRef = doc(db, COLLECTIONS.PLANNED_ENGAGEMENTS, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as FirestorePlannedEngagement;
    }
    return null;
  },

  async getByPerson(person: string): Promise<FirestorePlannedEngagement[]> {
    const q = query(
      collection(db, COLLECTIONS.PLANNED_ENGAGEMENTS),
      where('person', '==', person),
      orderBy('startDate')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestorePlannedEngagement[];
  },

  async getAll(): Promise<FirestorePlannedEngagement[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PLANNED_ENGAGEMENTS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestorePlannedEngagement[];
  },

  async update(id: string, updates: Partial<PlannedEngagement>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLANNED_ENGAGEMENTS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLANNED_ENGAGEMENTS, id);
    await deleteDoc(docRef);
  }
};

// Person Status Services
export const personStatusService = {
  async save(status: PersonStatus): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PERSON_STATUS), {
      ...addFirestoreFields(status)
    });
    return docRef.id;
  },

  async getByPerson(person: string): Promise<FirestorePersonStatus | null> {
    const q = query(
      collection(db, COLLECTIONS.PERSON_STATUS),
      where('person', '==', person)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as FirestorePersonStatus;
    }
    return null;
  },

  async getAll(): Promise<FirestorePersonStatus[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PERSON_STATUS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestorePersonStatus[];
  },

    async update(person: string, status: string, source: 'manual' | 'rule' | 'default' = 'manual'): Promise<void> {
    const existing = await this.getByPerson(person);
    if (existing) {
      const docRef = doc(db, COLLECTIONS.PERSON_STATUS, existing.id);
      await updateDoc(docRef, { 
        status, 
        source,
        updatedAt: new Date() 
      });
    } else {
      await this.save({ person, status, source, updatedAt: new Date() });
    }
  }
};

export const personActionItemService = {
  async save(actionItem: PersonActionItem): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PERSON_ACTION_ITEMS), {
      ...addFirestoreFields(actionItem),
      updatedAt: new Date(),
      updatedBy: actionItem.updatedBy || null
    });
    return docRef.id;
  },

  async getByPerson(person: string): Promise<FirestorePersonActionItem | null> {
    const q = query(
      collection(db, COLLECTIONS.PERSON_ACTION_ITEMS), 
      where('person', '==', person)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    } as FirestorePersonActionItem;
  },

  async getAll(): Promise<FirestorePersonActionItem[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PERSON_ACTION_ITEMS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestorePersonActionItem[];
  },

  async update(person: string, actionItem: boolean, source: 'manual' | 'rule' | 'default' = 'manual', updatedBy?: string): Promise<void> {
    const existing = await this.getByPerson(person);
    if (existing) {
      const docRef = doc(db, COLLECTIONS.PERSON_ACTION_ITEMS, existing.id);
      await updateDoc(docRef, { 
        actionItem, 
        source,
        updatedAt: new Date(),
        updatedBy: updatedBy || null
      });
    } else {
      await this.save({ person, actionItem, source, updatedAt: new Date(), updatedBy: updatedBy || null });
    }
  }
};

// Person Travel Readiness Services
export const personTravelReadinessService = {
  async save(readiness: PersonTravelReadiness): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PERSON_TRAVEL_READINESS), {
      ...addFirestoreFields(readiness)
    });
    return docRef.id;
  },

  async getByPerson(person: string): Promise<FirestorePersonTravelReadiness | null> {
    const q = query(
      collection(db, COLLECTIONS.PERSON_TRAVEL_READINESS),
      where('person', '==', person)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as FirestorePersonTravelReadiness;
    }
    return null;
  },

  async getAll(): Promise<FirestorePersonTravelReadiness[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PERSON_TRAVEL_READINESS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestorePersonTravelReadiness[];
  },

  async update(person: string, readiness: number): Promise<void> {
    const existing = await this.getByPerson(person);
    if (existing) {
      const docRef = doc(db, COLLECTIONS.PERSON_TRAVEL_READINESS, existing.id);
      await updateDoc(docRef, {
        readiness,
        updatedAt: new Date()
      });
    } else {
      await this.save({ person, readiness, updatedAt: new Date() });
    }
  }
};

// Customers Services
export const customerService = {
  async save(customer: Customer): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), {
      ...addFirestoreFields(customer)
    });
    return docRef.id;
  },

  async getAll(): Promise<FirestoreCustomer[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.CUSTOMERS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestoreCustomer[];
  },

  async update(id: string, updates: Partial<Customer>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    await deleteDoc(docRef);
  }
};

// Projects Services
export const projectService = {
  async save(project: { name: string; customer: string }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PROJECTS), {
      name: project.name,
      customer: project.customer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  async getAll(): Promise<{ id: string; name: string; customer: string; createdAt: Date; updatedAt: Date }[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PROJECTS));
    return querySnapshot.docs.map(d => ({
      id: d.id,
      name: String(d.data().name || ''),
      customer: String(d.data().customer || ''),
      createdAt: convertTimestamp(d.data().createdAt),
      updatedAt: convertTimestamp(d.data().updatedAt),
    }));
  },

  async getByCustomer(customer: string) {
    const q = query(collection(db, COLLECTIONS.PROJECTS), where('customer', '==', customer));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: convertTimestamp(d.data().createdAt), updatedAt: convertTimestamp(d.data().updatedAt) })) as any[];
  },

  async update(id: string, updates: Partial<{ name: string; customer: string }>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROJECTS, id);
    await updateDoc(docRef, { ...updates, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROJECTS, id);
    await deleteDoc(docRef);
  }
};

// Assignments Services (Mitarbeiter ↔ Projekt Verknüpfungen)
export const assignmentService = {
  async create(docIn: Omit<AssignmentDoc, 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Entferne alle undefined Werte vor dem Speichern
      const cleanDoc = Object.fromEntries(
        Object.entries(docIn).filter(([_, value]) => value !== undefined)
      );
      
      // Wenn projectId vorhanden ist, lade Projekt-Informationen
      if (cleanDoc.projectId) {
        try {
          const projectQuery = query(
            collection(db, COLLECTIONS.PROJECTS),
            where('__name__', '==', cleanDoc.projectId)
          );
          const projectSnap = await getDocs(projectQuery);
          
          if (!projectSnap.empty) {
            const projectData = projectSnap.docs[0].data();
            cleanDoc.projectName = projectData.name;
            cleanDoc.customer = projectData.customer;
          }
        } catch (error) {
          console.warn('Fehler beim Laden der Projekt-Informationen:', error);
        }
      }
      
      const docRef = await addDoc(collection(db, COLLECTIONS.ASSIGNMENTS), {
        ...cleanDoc,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Assignment erfolgreich erstellt:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Assignments:', error);
      throw error;
    }
  },

  async getByEmployee(employeeName: string): Promise<FirestoreAssignment[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ASSIGNMENTS),
        where('employeeName', '==', employeeName)
        // orderBy entfernt, da es einen Index benötigt
      );
      const snap = await getDocs(q);
      const assignments = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
        createdAt: convertTimestamp(d.data().createdAt),
        updatedAt: convertTimestamp(d.data().updatedAt),
      })) as FirestoreAssignment[];
      
      // Lade Projekt- und Kundeninformationen für alle Assignments
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          try {
            // Lade Projekt-Informationen
            const projectQuery = query(
              collection(db, COLLECTIONS.PROJECTS),
              where('__name__', '==', assignment.projectId)
            );
            const projectSnap = await getDocs(projectQuery);
            
            if (!projectSnap.empty) {
              const projectData = projectSnap.docs[0].data();
              return {
                ...assignment,
                projectName: projectData.name,
                customer: projectData.customer
              };
            }
            
            return assignment;
          } catch (error) {
            console.warn('Fehler beim Laden der Projekt-Informationen:', error);
            return assignment;
          }
        })
      );
      
      // Sortiere clientseitig nach createdAt
      return enrichedAssignments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      console.warn('Fehler beim Laden der Assignments für Mitarbeiter:', error);
      // Wenn Collection nicht existiert, gebe leeres Array zurück
      return [];
    }
  },

  async getByProject(projectId: string): Promise<FirestoreAssignment[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.ASSIGNMENTS),
        where('projectId', '==', projectId),
        orderBy('createdAt')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
        createdAt: convertTimestamp(d.data().createdAt),
        updatedAt: convertTimestamp(d.data().updatedAt),
      })) as FirestoreAssignment[];
    } catch (error) {
      console.warn('Fehler beim Laden der Assignments für Projekt:', error);
      // Wenn Collection nicht existiert, gebe leeres Array zurück
      return [];
    }
  },

  async update(id: string, updates: Partial<AssignmentDoc>): Promise<void> {
    try {
      // Entferne alle undefined Werte vor dem Speichern
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, id);
      await updateDoc(docRef, { ...cleanUpdates, updatedAt: new Date() });
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Assignments:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ASSIGNMENTS, id);
    await deleteDoc(docRef);
  },

  async getAll(): Promise<FirestoreAssignment[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.ASSIGNMENTS));
      return snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any),
        createdAt: convertTimestamp(d.data().createdAt),
        updatedAt: convertTimestamp(d.data().updatedAt),
      })) as FirestoreAssignment[];
    } catch (error) {
      console.warn('Fehler beim Laden aller Assignments:', error);
      // Wenn Collection nicht existiert, gebe leeres Array zurück
      return [];
    }
  },
};

// Skills Services
export const skillService = {
  async save(skill: { name: string }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.SKILLS), {
      name: skill.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  async getAll(): Promise<FirestoreSkill[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.SKILLS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: String(doc.data().name || ''),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestoreSkill[];
  },

  async update(id: string, updates: Partial<SkillDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SKILLS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    } as any);
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SKILLS, id);
    await deleteDoc(docRef);
  }
};

// Employee Skills Services
export const employeeSkillService = {
  async save(employeeSkill: { employeeName: string; skillId: string; skillName: string; level: number }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEE_SKILLS), {
      employeeName: employeeSkill.employeeName,
      skillId: employeeSkill.skillId,
      skillName: employeeSkill.skillName,
      level: employeeSkill.level,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  },

  async getByEmployee(employeeName: string): Promise<FirestoreEmployeeSkill[]> {
    const q = query(
      collection(db, COLLECTIONS.EMPLOYEE_SKILLS),
      where('employeeName', '==', employeeName),
      orderBy('skillName')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      employeeName: String(doc.data().employeeName || ''),
      skillId: String(doc.data().skillId || ''),
      skillName: String(doc.data().skillName || ''),
      level: Number(doc.data().level || 0),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestoreEmployeeSkill[];
  },

  async getAll(): Promise<FirestoreEmployeeSkill[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEE_SKILLS));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      employeeName: String(doc.data().employeeName || ''),
      skillId: String(doc.data().skillId || ''),
      skillName: String(doc.data().skillName || ''),
      level: Number(doc.data().level || 0),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as FirestoreEmployeeSkill[];
  },

  async update(id: string, updates: Partial<EmployeeSkillDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.EMPLOYEE_SKILLS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async updateLevel(employeeName: string, skillId: string, level: number): Promise<void> {
    const q = query(
      collection(db, COLLECTIONS.EMPLOYEE_SKILLS),
      where('employeeName', '==', employeeName),
      where('skillId', '==', skillId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docRef = doc(db, COLLECTIONS.EMPLOYEE_SKILLS, querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        level,
        updatedAt: new Date()
      });
    }
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.EMPLOYEE_SKILLS, id);
    await deleteDoc(docRef);
  },

  async deleteByEmployeeAndSkill(employeeName: string, skillId: string): Promise<void> {
    const q = query(
      collection(db, COLLECTIONS.EMPLOYEE_SKILLS),
      where('employeeName', '==', employeeName),
      where('skillId', '==', skillId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(async (docSnapshot) => {
      await deleteDoc(docSnapshot.ref);
    });
  },

  async saveOrUpdate(employeeName: string, skillId: string, skillName: string, level: number): Promise<string> {
    // Prüfe ob bereits vorhanden
    const q = query(
      collection(db, COLLECTIONS.EMPLOYEE_SKILLS),
      where('employeeName', '==', employeeName),
      where('skillId', '==', skillId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // Update existing
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        level,
        skillName, // Update name in case it changed
        updatedAt: new Date()
      });
      return querySnapshot.docs[0].id;
    } else {
      // Create new
      return await this.save({ employeeName, skillId, skillName, level });
    }
  }
};

// ✅ NEU: Standardstatus Service
export const standardStatusService = {
  async save(status: { name: string }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.STANDARD_STATUSES), {
      ...addFirestoreFields(status),
      updatedAt: new Date()
    });
    return docRef.id;
  },

  async getAll(): Promise<{ id: string; name: string; createdAt: Date; updatedAt: Date }[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.STANDARD_STATUSES));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    }));
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.STANDARD_STATUSES, id);
    await deleteDoc(docRef);
  }
};

// ✅ NEU: Person Standardstatus Service
export const personStandardStatusService = {
  async save(status: { person: string; standardStatus: string }): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.PERSON_STANDARD_STATUSES), {
      ...addFirestoreFields(status),
      updatedAt: new Date()
    });
    return docRef.id;
  },

  async getByPerson(person: string): Promise<{ id: string; person: string; standardStatus: string; createdAt: Date; updatedAt: Date } | null> {
    const q = query(
      collection(db, COLLECTIONS.PERSON_STANDARD_STATUSES),
      where('person', '==', person)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      person: data.person,
      standardStatus: data.standardStatus,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt)
    };
  },

  async getAll(): Promise<{ id: string; person: string; standardStatus: string; createdAt: Date; updatedAt: Date }[]> {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PERSON_STANDARD_STATUSES));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      person: doc.data().person,
      standardStatus: doc.data().standardStatus,
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    }));
  },

  async update(person: string, standardStatus: string): Promise<void> {
    const existing = await this.getByPerson(person);
    if (existing) {
      const docRef = doc(db, COLLECTIONS.PERSON_STANDARD_STATUSES, existing.id);
      await updateDoc(docRef, {
        standardStatus,
        updatedAt: new Date()
      });
    } else {
      await this.save({ person, standardStatus });
    }
  }
};
