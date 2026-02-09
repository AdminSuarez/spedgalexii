"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Shared File Store — Upload once, access on every tab/module
// ──────────────────────────────────────────────────────────────────────────────
// IndexedDB database dedicated to the cross-module file store.
// Deep Space, Accommodations, Goals, PLAAFP, Services, Compliance, Assessments
// all read from the same store.
// ──────────────────────────────────────────────────────────────────────────────

const DB_NAME = "galexii-shared-files";
const DB_VERSION = 1;
const FILES_STORE = "files";
const META_STORE = "meta";

/** A single file persisted in the shared store */
export type SharedFile = {
  id: string; // unique key
  name: string;
  type: string; // MIME
  size: number;
  data: ArrayBuffer;
  addedAt: number;
  source: "deep-space" | "upload-card" | "manual"; // where it was uploaded
};

/** Lightweight version without the heavy ArrayBuffer (for listing) */
export type SharedFileMeta = Omit<SharedFile, "data">;

/** Metadata about the shared store itself */
type StoreMeta = {
  key: "state";
  studentId: string;
  lastUpdated: number;
  fileCount: number;
};

// ── BroadcastChannel event name ──
const CHANNEL_NAME = "galexii-shared-files-sync";

// ── IDB helpers ──
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
  });
}

async function idbGetAllFiles(): Promise<SharedFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readonly");
    const req = tx.objectStore(FILES_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbGetAllMeta(): Promise<SharedFileMeta[]> {
  const all = await idbGetAllFiles();
  // Strip `data` to keep memory light
  return all.map(({ data: _data, ...rest }) => rest);
}

async function idbPutFiles(files: SharedFile[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    for (const f of files) store.put(f);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbRemoveFile(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    tx.objectStore(FILES_STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    tx.objectStore(FILES_STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetMeta(): Promise<StoreMeta | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const req = tx.objectStore(META_STORE).get("state");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPutMeta(meta: StoreMeta): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(meta);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ── Convert SharedFile ↔ File ──
export function sharedFileToFile(sf: SharedFile | SharedFileMeta & { data: ArrayBuffer }): File {
  return new File([sf.data], sf.name, { type: sf.type });
}

// ── Context shape ──
type SharedFileContextType = {
  /** Lightweight list of files (no ArrayBuffer) */
  files: SharedFileMeta[];
  /** Student ID associated with the current upload set */
  studentId: string;
  /** Whether the store has been loaded from IDB */
  loaded: boolean;
  /** Total number of files */
  fileCount: number;

  /** Add files to the shared store */
  addFiles: (
    newFiles: File[],
    source: SharedFile["source"],
    studentId?: string,
  ) => Promise<void>;

  /** Remove a single file by ID */
  removeFile: (id: string) => Promise<void>;

  /** Clear entire store */
  clearAll: () => Promise<void>;

  /** Set the student ID without adding files */
  setStudentId: (id: string) => Promise<void>;

  /** Get full File objects (with ArrayBuffer) for server upload */
  getFileObjects: () => Promise<File[]>;
};

const SharedFileContext = createContext<SharedFileContextType>({
  files: [],
  studentId: "",
  loaded: false,
  fileCount: 0,
  addFiles: async () => {},
  removeFile: async () => {},
  clearAll: async () => {},
  setStudentId: async () => {},
  getFileObjects: async () => [],
});

export function useSharedFiles() {
  return useContext(SharedFileContext);
}

// ── Provider ──
export function SharedFileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<SharedFileMeta[]>([]);
  const [studentId, setStudentIdState] = useState("");
  const [loaded, setLoaded] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Refresh file list from IDB
  const refresh = useCallback(async () => {
    try {
      const [meta, fileMetas] = await Promise.all([idbGetMeta(), idbGetAllMeta()]);
      setFiles(fileMetas);
      if (meta) setStudentIdState(meta.studentId);
      setLoaded(true);
    } catch (err) {
      console.error("[SharedFiles] refresh error:", err);
      setLoaded(true);
    }
  }, []);

  // Broadcast a sync event to other tabs/components
  const broadcast = useCallback(() => {
    try {
      channelRef.current?.postMessage({ type: "sync" });
    } catch {
      // ignore
    }
    // Also dispatch a custom event for same-tab listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("galexii-shared-files-updated"));
    }
  }, []);

  // Init: load from IDB + listen for sync events
  useEffect(() => {
    void refresh();

    // BroadcastChannel for cross-tab sync
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = () => void refresh();
      channelRef.current = ch;
    } catch {
      // BroadcastChannel not supported in some environments
    }

    // Same-tab custom event
    const handler = () => void refresh();
    window.addEventListener("galexii-shared-files-updated", handler);

    return () => {
      channelRef.current?.close();
      window.removeEventListener("galexii-shared-files-updated", handler);
    };
  }, [refresh]);

  const updateMeta = useCallback(
    async (sid: string, count: number) => {
      await idbPutMeta({
        key: "state",
        studentId: sid,
        lastUpdated: Date.now(),
        fileCount: count,
      });
    },
    [],
  );

  const addFiles = useCallback(
    async (newFiles: File[], source: SharedFile["source"], sid?: string) => {
      const resolvedSid = sid || studentId;

      const sharedFiles: SharedFile[] = await Promise.all(
        newFiles.map(async (f) => {
          const data = await f.arrayBuffer();
          return {
            id: `shared_${f.name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: f.name,
            type: f.type || "application/octet-stream",
            size: f.size,
            data,
            addedAt: Date.now(),
            source,
          };
        }),
      );

      await idbPutFiles(sharedFiles);
      const allMeta = await idbGetAllMeta();
      setFiles(allMeta);

      if (resolvedSid) {
        setStudentIdState(resolvedSid);
        await updateMeta(resolvedSid, allMeta.length);
      } else {
        await updateMeta("", allMeta.length);
      }

      broadcast();
    },
    [studentId, updateMeta, broadcast],
  );

  const removeFile = useCallback(
    async (id: string) => {
      await idbRemoveFile(id);
      const allMeta = await idbGetAllMeta();
      setFiles(allMeta);
      await updateMeta(studentId, allMeta.length);
      broadcast();
    },
    [studentId, updateMeta, broadcast],
  );

  const clearAll = useCallback(async () => {
    await idbClearAll();
    setFiles([]);
    setStudentIdState("");
    await updateMeta("", 0);
    broadcast();
  }, [updateMeta, broadcast]);

  const setStudentId = useCallback(
    async (id: string) => {
      setStudentIdState(id);
      await updateMeta(id, files.length);
      broadcast();
    },
    [files.length, updateMeta, broadcast],
  );

  const getFileObjects = useCallback(async (): Promise<File[]> => {
    const allFiles = await idbGetAllFiles();
    return allFiles.map((sf) => new File([sf.data], sf.name, { type: sf.type }));
  }, []);

  const value: SharedFileContextType = {
    files,
    studentId,
    loaded,
    fileCount: files.length,
    addFiles,
    removeFile,
    clearAll,
    setStudentId,
    getFileObjects,
  };

  return (
    <SharedFileContext.Provider value={value}>{children}</SharedFileContext.Provider>
  );
}
