// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Faltan variables de entorno para Supabase. Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Cliente estándar para uso general (respeta RLS)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Obtiene un cliente de Supabase con privilegios de administrador (Service Role Key).
 * ¡ATENCIÓN!: Esto SOLO debe ejecutarse en el servidor (API routes o Server Components)
 * ya que SUPABASE_SERVICE_ROLE_KEY es un secreto.
 */
export function getSupabaseServer() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en el servidor.'
    );
  }
  return createClient(supabaseUrl || '', serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
