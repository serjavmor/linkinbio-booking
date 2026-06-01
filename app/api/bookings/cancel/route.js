// app/api/bookings/cancel/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { deleteCalendarEvent } from '@/lib/google-calendar';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado: Falta el token de acceso.' },
        { status: 401 }
      );
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Falta el parámetro requerido: bookingId.' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // 1. Validar el token JWT de forma segura en el servidor
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sesión no válida o expirada. Por favor inicia sesión de nuevo.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Obtener la reserva y verificar que pertenece al usuario autenticado
    const { data: booking, error: fetchError } = await supabaseServer
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada o no tienes autorización para gestionarla.' },
        { status: 404 }
      );
    }

    // Si ya está cancelada, no hacer nada
    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: true, message: 'La reserva ya estaba cancelada.' });
    }

    // 3. Actualizar estado local a 'cancelled'
    const { error: updateError } = await supabaseServer
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error cancelando reserva en BD:', updateError);
      return NextResponse.json({ error: 'Error al cancelar la reserva en base de datos.' }, { status: 500 });
    }

    // 4. Si tiene google_event_id, eliminar el evento en Google Calendar
    if (booking.google_event_id) {
      try {
        // Cargar tokens de Google del perfil del usuario
        const { data: profile } = await supabaseServer
          .from('profiles')
          .select('google_access_token, google_refresh_token, google_token_expiry')
          .eq('id', userId)
          .single();

        if (profile?.google_access_token && profile?.google_refresh_token) {
          const tokens = {
            access_token: profile.google_access_token,
            refresh_token: profile.google_refresh_token,
            expiry_date: Number(profile.google_token_expiry)
          };

          await deleteCalendarEvent(tokens, booking.google_event_id);
        }
      } catch (calError) {
        console.error('Error eliminando evento de Google Calendar:', calError);
        // Retornamos éxito de todas formas porque en la base de datos local ya se canceló
        return NextResponse.json({
          success: true,
          warning: 'La reserva fue cancelada localmente, pero falló la eliminación en Google Calendar.'
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Excepción cancelando reserva:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
