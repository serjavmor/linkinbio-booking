// app/api/auth/google/route.js
import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Falta el parámetro userId necesario para vincular la cuenta.' },
        { status: 400 }
      );
    }

    // Generar la URL de autenticación de Google con el ID de usuario como state
    const authUrl = getAuthUrl(userId);

    // Redirigir al usuario a Google Consent Screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error al iniciar el flujo OAuth de Google:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al iniciar el flujo de autenticación.' },
      { status: 500 }
    );
  }
}
