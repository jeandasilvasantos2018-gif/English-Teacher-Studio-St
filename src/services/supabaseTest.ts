import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SupabaseTestResult {
  success: boolean;
  data?: unknown;
  error?: unknown;
}

export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase environment variables are missing (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: err,
    };
  }
}

