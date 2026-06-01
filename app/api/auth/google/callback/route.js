// app/api/auth/google/callback/route.js
import { NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-calendar';
import { getSupabaseServer } from '@/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // El state contiene el userId enviado en la llamada original
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    console.error('Error de autorización recibido de Google:', error);
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=google_denied`);
  }

  if (!code || !userId) {
    console.error('Parámetros de callback de Google faltantes. Code:', !!code, 'UserId:', !!userId);
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=missing_params`);
  }

  try {
    // Intercambiar el código por tokens
    const tokens = await getTokensFromCode(code);

    // Obtener cliente de Supabase seguro para el servidor (by-pass RLS)
    const supabaseServer = getSupabaseServer();

    // Actualizar los tokens en el perfil del usuario
    const { data, error: updateError } = await supabaseServer
      .from('profiles')
      .update({
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token, // Este solo se recibe la primera vez que da consentimiento
        google_token_expiry: tokens.expiry_date
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error actualizando tokens de Google en Supabase:', updateError);
      return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=db_save_failed`);
    }

    // Redirigir con éxito al panel de integraciones del dashboard
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?status=google_connected`);
  } catch (err) {
    console.error('Excepción atrapada durante el callback de Google OAuth:', err);
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?error=server_error`);
  }
}
