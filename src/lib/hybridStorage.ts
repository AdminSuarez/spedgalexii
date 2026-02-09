/**
 * Hybrid Storage Service
 * 
 * Combines browser-based IndexedDB storage with optional Supabase cloud sync.
 * - Free tier: Local storage only (24hr TTL)
 * - Paid tier: Local + Cloud sync (30 day TTL)
 * 
 * Data flows: Local first, then syncs to cloud in background for paid users.
 */

import { supabase, isSupabaseConfigured, getCurrentUser, hasCloudSync } from './supabase/client';
import {
  saveFiles as saveFilesLocal,
  getSessionFiles as getSessionFilesLocal,
  getAllSessions as getAllSessionsLocal,
  saveSession as saveSessionLocal,
  clearSession as clearSessionLocal,
  generateSessionId,
  storedFileToFile,
  type StoredFile,
  type UploadSession,
} from './fileStorage';

export type SyncStatus = 'local-only' | 'syncing' | 'synced' | 'error';

export interface HybridSession extends UploadSession {
  syncStatus: SyncStatus;
  cloudId?: string;
}

export interface HybridStoredFile extends StoredFile {
  syncStatus: SyncStatus;
  cloudId?: string;
  cloudPath?: string;
}

/**
 * Check if cloud sync is currently available
 */
export async function checkCloudSyncStatus(): Promise<{ 
  isConfigured: boolean; 
  isAuthenticated: boolean;
  hasSubscription: boolean;
}> {
  const isConfigured = isSupabaseConfigured();
  
  if (!isConfigured || !supabase) {
    return { isConfigured: false, isAuthenticated: false, hasSubscription: false };
  }
  
  const user = await getCurrentUser();
  if (!user) {
    return { isConfigured: true, isAuthenticated: false, hasSubscription: false };
  }
  
  const hasSubscription = await hasCloudSync();
  return { isConfigured: true, isAuthenticated: true, hasSubscription };
}

// Type for Supabase tables (simplified for flexibility)
type AnyRecord = Record<string, unknown>;

/**
 * Save files with hybrid storage
 * Saves locally first, then syncs to cloud if available
 */
export async function saveFilesHybrid(
  files: File[],
  studentId: string,
  sessionId: string
): Promise<{ files: StoredFile[]; syncStatus: SyncStatus }> {
  // Always save locally first (instant feedback)
  const localFiles = await saveFilesLocal(files, studentId, sessionId);
  
  // Check if cloud sync is available
  const cloudEnabled = await hasCloudSync();
  
  if (!cloudEnabled || !supabase) {
    return { files: localFiles, syncStatus: 'local-only' };
  }
  
  // Sync to cloud in background
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { files: localFiles, syncStatus: 'local-only' };
    }
    
    // Ensure session exists in cloud
    const { data: cloudSession, error: sessionError } = await supabase
      .from('deep_dive_sessions')
      .upsert({
        id: sessionId,
        user_id: user.id,
        student_id: studentId,
        file_count: localFiles.length,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('Cloud session sync failed:', sessionError);
      return { files: localFiles, syncStatus: 'error' };
    }
    
    // Upload files to Supabase Storage
    for (const file of files) {
      const storagePath = `${user.id}/${sessionId}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('iep-documents')
        .upload(storagePath, file, { upsert: true });
      
      if (uploadError) {
        console.error('File upload failed:', uploadError);
        continue;
      }
      
      // Record file in database
      await supabase.from('deep_dive_files').upsert({
        session_id: sessionId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: storagePath,
      });
    }
    
    return { files: localFiles, syncStatus: 'synced' };
  } catch (error) {
    console.error('Cloud sync error:', error);
    return { files: localFiles, syncStatus: 'error' };
  }
}

/**
 * Get all sessions (local + cloud merged)
 */
export async function getAllSessionsHybrid(): Promise<HybridSession[]> {
  // Get local sessions
  const localSessions = await getAllSessionsLocal();
  const localMap = new Map(localSessions.map(s => [s.id, s]));
  
  // Check if cloud is available
  const cloudEnabled = await hasCloudSync();
  
  if (!cloudEnabled || !supabase) {
    return localSessions.map(s => ({
      ...s,
      syncStatus: 'local-only' as SyncStatus,
    }));
  }
  
  try {
    const user = await getCurrentUser();
    if (!user) {
      return localSessions.map(s => ({
        ...s,
        syncStatus: 'local-only' as SyncStatus,
      }));
    }
    
    // Get cloud sessions
    const { data: cloudSessions, error } = await supabase
      .from('deep_dive_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch cloud sessions:', error);
      return localSessions.map(s => ({
        ...s,
        syncStatus: 'local-only' as SyncStatus,
      }));
    }
    
    // Merge local and cloud sessions
    const merged: HybridSession[] = [];
    const seenIds = new Set<string>();
    
    // Add cloud sessions first
    for (const cloud of cloudSessions || []) {
      const local = localMap.get(cloud.id);
      seenIds.add(cloud.id);
      
      const session: HybridSession = {
        id: cloud.id,
        studentId: cloud.student_id,
        createdAt: new Date(cloud.created_at).getTime(),
        lastAccessedAt: new Date(cloud.updated_at).getTime(),
        fileCount: cloud.file_count,
        analysisComplete: cloud.analysis_complete,
        syncStatus: local ? 'synced' : 'synced',
        cloudId: cloud.id,
      };
      
      // Only add analysisResult if it exists
      if (cloud.alert_count !== null) {
        session.analysisResult = {
          summary: `${cloud.file_count} documents analyzed`,
          alertCount: cloud.alert_count,
          criticalCount: cloud.critical_count || 0,
        };
      }
      
      merged.push(session);
    }
    
    // Add local-only sessions
    for (const local of localSessions) {
      if (!seenIds.has(local.id)) {
        merged.push({
          ...local,
          syncStatus: 'local-only',
        });
      }
    }
    
    return merged;
  } catch (error) {
    console.error('Error fetching hybrid sessions:', error);
    return localSessions.map(s => ({
      ...s,
      syncStatus: 'local-only' as SyncStatus,
    }));
  }
}

/**
 * Get session files (local + cloud)
 */
export async function getSessionFilesHybrid(sessionId: string): Promise<StoredFile[]> {
  // Try local first
  const localFiles = await getSessionFilesLocal(sessionId);
  
  if (localFiles.length > 0) {
    return localFiles;
  }
  
  // If no local files, try to restore from cloud
  const cloudEnabled = await hasCloudSync();
  
  if (!cloudEnabled || !supabase) {
    return [];
  }
  
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    
    // Get file records from database
    const { data: cloudFiles, error } = await supabase
      .from('deep_dive_files')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id);
    
    if (error || !cloudFiles) {
      return [];
    }
    
    // Download files from storage and save locally
    const restoredFiles: StoredFile[] = [];
    
    for (const cloudFile of cloudFiles) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('iep-documents')
        .download(cloudFile.storage_path);
      
      if (downloadError || !fileData) {
        console.error('Failed to download file:', downloadError);
        continue;
      }
      
      // Convert to File and save locally
      const file = new File([fileData], cloudFile.file_name, { type: cloudFile.file_type });
      const studentId = cloudFile.storage_path.split('/')[1]; // Extract from path
      const saved = await saveFilesLocal([file], studentId, sessionId);
      restoredFiles.push(...saved);
    }
    
    return restoredFiles;
  } catch (error) {
    console.error('Error restoring from cloud:', error);
    return [];
  }
}

/**
 * Save analysis results to cloud
 */
export async function saveAnalysisResultsHybrid(
  sessionId: string,
  studentId: string,
  studentName: string | null,
  analysis: {
    documentCount: number;
    alertCount: number;
    criticalCount: number;
  },
  jsonData: string,
  reportData: string
): Promise<SyncStatus> {
  const cloudEnabled = await hasCloudSync();
  
  if (!cloudEnabled || !supabase) {
    return 'local-only';
  }
  
  try {
    const user = await getCurrentUser();
    if (!user) return 'local-only';
    
    // Update session with analysis results
    await supabase
      .from('deep_dive_sessions')
      .update({
        student_name: studentName,
        analysis_complete: true,
        alert_count: analysis.alertCount,
        critical_count: analysis.criticalCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);
    
    // Save output files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeName = studentName?.replace(/\s+/g, '_') || `Student_${studentId}`;
    
    // JSON analysis
    await supabase.from('output_files').insert({
      user_id: user.id,
      session_id: sessionId,
      name: `DEEP_DIVE_${safeName}_${timestamp}.json`,
      type: 'json',
      size: `${Math.round(jsonData.length / 1024)} KB`,
      module: 'Deep Space',
      data: btoa(unescape(encodeURIComponent(jsonData))),
    });
    
    // Markdown report
    await supabase.from('output_files').insert({
      user_id: user.id,
      session_id: sessionId,
      name: `DEEP_DIVE_${safeName}_${timestamp}.md`,
      type: 'md',
      size: `${Math.round(reportData.length / 1024)} KB`,
      module: 'Deep Space',
      data: btoa(unescape(encodeURIComponent(reportData))),
    });
    
    return 'synced';
  } catch (error) {
    console.error('Failed to sync analysis results:', error);
    return 'error';
  }
}

/**
 * Clear session (local + cloud)
 */
export async function clearSessionHybrid(sessionId: string): Promise<void> {
  // Clear local
  await clearSessionLocal(sessionId);
  
  // Clear cloud if available
  const cloudEnabled = await hasCloudSync();
  
  if (cloudEnabled && supabase) {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      
      // Delete files from storage
      const { data: files } = await supabase
        .from('deep_dive_files')
        .select('storage_path')
        .eq('session_id', sessionId);
      
      if (files) {
        const paths = files.map(f => f.storage_path);
        await supabase.storage.from('iep-documents').remove(paths);
      }
      
      // Delete session (cascade deletes file records)
      await supabase
        .from('deep_dive_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Failed to clear cloud session:', error);
    }
  }
}

// Re-export utilities
export { generateSessionId, storedFileToFile };
export type { StoredFile, UploadSession };
