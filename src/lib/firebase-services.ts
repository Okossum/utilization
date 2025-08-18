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
  UploadedFile,
  PlannedEngagement,
  PersonStatus,
  PersonTravelReadiness,
  Customer
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

  async update(person: string, status: string): Promise<void> {
    const existing = await this.getByPerson(person);
    if (existing) {
      const docRef = doc(db, COLLECTIONS.PERSON_STATUS, existing.id);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date()
      });
    } else {
      await this.save({ person, status, updatedAt: new Date() });
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
