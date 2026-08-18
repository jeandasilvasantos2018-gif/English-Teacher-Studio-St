import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, AuthResponse, AuthTokenResponsePassword } from '@supabase/supabase-js';

/**
 * Cadastra um novo usuário no Supabase Auth com metadata de nome completo
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResponse> {
  if (!isSupabaseConfigured) {
    return {
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        message: 'Supabase não configurado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        status: 400,
      } as any,
    };
  }

  const response = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return response;
}

/**
 * Autentica um usuário existente via e-mail e senha
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthTokenResponsePassword> {
  if (!isSupabaseConfigured) {
    return {
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        message: 'Supabase não configurado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        status: 400,
      } as any,
    };
  }

  const response = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return response;
}

/**
 * Encerra a sessão atual do usuário
 */
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Retorna o usuário atualmente autenticado
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    console.warn('Erro ao obter usuário atual:', err);
    return null;
  }
}
