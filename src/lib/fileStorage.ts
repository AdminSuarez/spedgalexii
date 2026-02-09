/**
 * IndexedDB-based file storage for persisting uploaded documents
 * Survives page refreshes and browser sessions
 */

const DB_NAME = 'galexii-files';
const DB_VERSION = 1;
const STORE_NAME = 'uploads';
const SESSION_STORE = 'sessions';

export type StoredFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  studentId: string;
  uploadedAt: number;
  sessionId: string;
};

export type UploadSession = {
  id: string;
  studentId: string;
  createdAt: number;
  lastAccessedAt: number;
  fileCount: number;
  analysisComplete: boolean;
  analysisResult?: {
    summary: string;
    alertCount: number;
    criticalCount: number;
  };
};

// Session expiry: 24 hours
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for uploaded files
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('studentId', 'studentId', { unique: false });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
      
      // Store for sessions
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const sessionStore = db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        sessionStore.createIndex('studentId', 'studentId', { unique: false });
      }
    };
  });
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Save a file to IndexedDB
 */
export async function saveFile(
  file: File,
  studentId: string,
  sessionId: string
): Promise<StoredFile> {
  const db = await openDB();
  
  const arrayBuffer = await file.arrayBuffer();
  
  const storedFile: StoredFile = {
    id: `${sessionId}_${file.name}`,
    name: file.name,
    type: file.type,
    size: file.size,
    data: arrayBuffer,
    studentId,
    uploadedAt: Date.now(),
    sessionId,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(storedFile);
    
    request.onsuccess = () => resolve(storedFile);
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Save multiple files at once
 */
export async function saveFiles(
  files: File[],
  studentId: string,
  sessionId: string
): Promise<StoredFile[]> {
  const results: StoredFile[] = [];
  for (const file of files) {
    const stored = await saveFile(file, studentId, sessionId);
    results.push(stored);
  }
  return results;
}

/**
 * Get all files for a session
 */
export async function getSessionFiles(sessionId: string): Promise<StoredFile[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all files for a student
 */
export async function getStudentFiles(studentId: string): Promise<StoredFile[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('studentId');
    const request = index.getAll(studentId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove a file from storage
 */
export async function removeFile(fileId: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(fileId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear all files for a session
 */
export async function clearSession(sessionId: string): Promise<void> {
  const files = await getSessionFiles(sessionId);
  for (const file of files) {
    await removeFile(file.id);
  }
  
  // Also remove the session record
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readwrite');
    const store = tx.objectStore(SESSION_STORE);
    store.delete(sessionId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Convert stored file back to File object for API upload
 */
export function storedFileToFile(stored: StoredFile): File {
  return new File([stored.data], stored.name, { type: stored.type });
}

/**
 * Create or update a session
 */
export async function saveSession(session: UploadSession): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readwrite');
    const store = tx.objectStore(SESSION_STORE);
    const request = store.put(session);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<UploadSession | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readonly');
    const store = tx.objectStore(SESSION_STORE);
    const request = store.get(sessionId);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all active sessions
 */
export async function getAllSessions(): Promise<UploadSession[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readonly');
    const store = tx.objectStore(SESSION_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const sessions = request.result as UploadSession[];
      // Filter out expired sessions
      const now = Date.now();
      const active = sessions.filter(s => now - s.lastAccessedAt < SESSION_EXPIRY_MS);
      resolve(active);
    };
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const allSessions = await getAllSessions();
  const now = Date.now();
  let cleaned = 0;
  
  for (const session of allSessions) {
    if (now - session.lastAccessedAt >= SESSION_EXPIRY_MS) {
      await clearSession(session.id);
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Get the most recent session for a student (if exists and not expired)
 */
export async function getRecentStudentSession(studentId: string): Promise<UploadSession | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE, 'readonly');
    const store = tx.objectStore(SESSION_STORE);
    const index = store.index('studentId');
    const request = index.getAll(studentId);
    
    request.onsuccess = () => {
      const sessions = request.result as UploadSession[];
      const now = Date.now();
      // Get most recent non-expired session
      const valid = sessions
        .filter(s => now - s.lastAccessedAt < SESSION_EXPIRY_MS)
        .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
      resolve(valid[0] || null);
    };
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}
