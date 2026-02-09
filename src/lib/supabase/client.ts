import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These will be set via environment variables
// For development/testing, they can be undefined (falls back to local storage only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create the client if credentials are available
// Using 'any' type for flexibility - proper types can be generated with Supabase CLI
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && supabaseAnonKey && supabase !== null;
};

// Get the current user (if authenticated)
export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Check if user has cloud sync enabled (paid feature)
export const hasCloudSync = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Check user's subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  
  // Cloud sync available for yearly and bundle tiers
  return profile?.subscription_tier === 'yearly' || profile?.subscription_tier === 'bundle';
};
