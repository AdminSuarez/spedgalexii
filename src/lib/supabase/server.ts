/**
 * Server-side Supabase client — uses the SERVICE ROLE key.
 * Never import this in client components or pages!
 * Only use in API routes (runtime = "nodejs").
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _server: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (_server) return _server;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  _server = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _server;
}

export const CANON_BUCKET = "galexii-uploads";

/**
 * Upload a file buffer to Supabase Storage under a given path.
 * Creates the bucket if it does not exist (requires service role).
 */
export async function uploadToSupabase(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const sb = getServerSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };

  // Ensure bucket exists
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === CANON_BUCKET) ?? false;
  if (!exists) {
    const { error: createErr } = await sb.storage.createBucket(CANON_BUCKET, {
      public: false,
    });
    if (createErr && !createErr.message.includes("already exists")) {
      return { ok: false, error: `Bucket create failed: ${createErr.message}` };
    }
  }

  const { error } = await sb.storage
    .from(CANON_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, path: storagePath };
}

/**
 * Download a file from Supabase Storage as a Buffer.
 */
export async function downloadFromSupabase(
  storagePath: string,
): Promise<Buffer | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  const { data, error } = await sb.storage
    .from(CANON_BUCKET)
    .download(storagePath);

  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/**
 * List all files under a given prefix in the canon bucket.
 */
export async function listSupabaseFiles(
  prefix: string,
): Promise<string[]> {
  const sb = getServerSupabase();
  if (!sb) return [];

  const { data, error } = await sb.storage
    .from(CANON_BUCKET)
    .list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error || !data) return [];
  return data.map((f) => `${prefix}/${f.name}`);
}
