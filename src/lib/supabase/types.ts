/**
 * Supabase Database Types
 * 
 * This defines the schema for cloud storage.
 * Run the SQL below in your Supabase dashboard to create the tables.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          subscription_tier: 'free' | 'monthly' | 'yearly' | 'bundle' | null;
          subscription_status: 'active' | 'canceled' | 'past_due' | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          subscription_tier?: 'free' | 'monthly' | 'yearly' | 'bundle' | null;
          subscription_status?: 'active' | 'canceled' | 'past_due' | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          subscription_tier?: 'free' | 'monthly' | 'yearly' | 'bundle' | null;
          subscription_status?: 'active' | 'canceled' | 'past_due' | null;
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
      };
      deep_dive_sessions: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          student_name: string | null;
          file_count: number;
          analysis_complete: boolean;
          alert_count: number | null;
          critical_count: number | null;
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          student_name?: string | null;
          file_count?: number;
          analysis_complete?: boolean;
          alert_count?: number | null;
          critical_count?: number | null;
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: {
          student_id?: string;
          student_name?: string | null;
          file_count?: number;
          analysis_complete?: boolean;
          alert_count?: number | null;
          critical_count?: number | null;
          updated_at?: string;
          expires_at?: string;
        };
      };
      deep_dive_files: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          file_name: string;
          file_size: number;
          file_type: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          file_name?: string;
          storage_path?: string;
        };
      };
      output_files: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          name: string;
          type: 'pdf' | 'xlsx' | 'csv' | 'md' | 'json';
          size: string;
          module: string;
          storage_path: string | null;
          data: string | null; // Base64 for small files
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          name: string;
          type: 'pdf' | 'xlsx' | 'csv' | 'md' | 'json';
          size: string;
          module: string;
          storage_path?: string | null;
          data?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          name?: string;
          storage_path?: string | null;
          data?: string | null;
          expires_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DeepDiveSession = Database['public']['Tables']['deep_dive_sessions']['Row'];
export type DeepDiveFile = Database['public']['Tables']['deep_dive_files']['Row'];
export type OutputFile = Database['public']['Tables']['output_files']['Row'];
