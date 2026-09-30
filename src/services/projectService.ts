import { db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from '../firebase/config';
import { ProjectData } from '../types';

export const getUserProjects = async (uid: string): Promise<ProjectData[]> => {
  try {
    const q = query(collection(db, 'users', uid, 'projects'), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const projects: ProjectData[] = [];
    snapshot.forEach((docSnap) => {
      projects.push(docSnap.data() as ProjectData);
    });
    return projects;
  } catch (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }
};

const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      return obj;
    }
    const cleaned: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = removeUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
};

export const saveUserProject = async (uid: string, project: ProjectData): Promise<void> => {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', project.id);
    const projectToSave: ProjectData = {
      ...project,
      ownerUid: uid,
      updatedAt: Date.now(),
    };
    const cleanedProject = removeUndefined(projectToSave);
    await setDoc(projectRef, cleanedProject, { merge: true });
  } catch (error) {
    console.error('Error saving user project:', error);
    throw error;
  }
};

export const deleteUserProject = async (uid: string, projectId: string): Promise<void> => {
  try {
    const projectRef = doc(db, 'users', uid, 'projects', projectId);
    await deleteDoc(projectRef);
  } catch (error) {
    console.error('Error deleting user project:', error);
    throw error;
  }
};
