import { supabase } from '../lib/supabase';

export interface SupabaseTestResult {
  success: boolean;
  data?: unknown;
  error?: unknown;
}

export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
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
