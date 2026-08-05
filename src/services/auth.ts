import { supabase } from '../lib/supabase';
import { User, Session, AuthResponse, AuthTokenResponsePassword } from '@supabase/supabase-js';

/**
 * Cadastra um novo usuário no Supabase Auth com metadata de nome completo
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResponse> {
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
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Retorna o usuário atualmente autenticado
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    console.error('Erro ao obter usuário atual:', err);
    return null;
  }
}
