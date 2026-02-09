// Output Repository - stores user exports for 12 hours

export type OutputFile = {
  id: string;
  name: string;
  type: "pdf" | "xlsx" | "csv" | "md" | "json";
  createdAt: string;
  expiresAt: string;
  size: string;
  module: string;
  downloadUrl?: string;
  data?: string; // Base64 encoded data for small files
};

const STORAGE_KEY = "galexii-outputs";
const EXPIRY_HOURS = 12;

/**
 * Add a file to the output repository
 */
export function addToOutputRepository(file: {
  name: string;
  type: OutputFile["type"];
  size: string;
  module: string;
  downloadUrl?: string;
  data?: string;
}): OutputFile {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

  const newFile: OutputFile = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    type: file.type,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    size: file.size,
    module: file.module,
    ...(file.downloadUrl !== undefined && { downloadUrl: file.downloadUrl }),
    ...(file.data !== undefined && { data: file.data }),
  };

  // Get existing files
  const existing = getOutputFiles();
  
  // Add new file at the beginning
  const updated = [newFile, ...existing];
  
  // Save to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Dispatch event so the sidebar can update
    window.dispatchEvent(new CustomEvent("galexii-output-updated", { detail: newFile }));
  }

  return newFile;
}

/**
 * Get all valid (non-expired) output files
 */
export function getOutputFiles(): OutputFile[] {
  if (typeof window === "undefined") return [];

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed: OutputFile[] = JSON.parse(stored);
    const now = new Date();
    
    // Filter out expired files
    const validFiles = parsed.filter((f) => {
      const expires = new Date(f.expiresAt);
      return expires > now;
    });

    // Update storage if we filtered any out
    if (validFiles.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validFiles));
    }

    return validFiles;
  } catch {
    return [];
  }
}

/**
 * Remove a specific file from the repository
 */
export function removeFromOutputRepository(fileId: string): void {
  if (typeof window === "undefined") return;

  const files = getOutputFiles();
  const updated = files.filter((f) => f.id !== fileId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  window.dispatchEvent(new CustomEvent("galexii-output-removed", { detail: fileId }));
}

/**
 * Clear all files from the repository
 */
export function clearOutputRepository(): void {
  if (typeof window === "undefined") return;
  
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("galexii-output-cleared"));
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
