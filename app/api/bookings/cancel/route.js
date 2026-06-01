// app/api/bookings/cancel/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { deleteCalendarEvent } from '@/lib/google-calendar';

export async function POST(request) {
  try {
    const { bookingId, userId } = await request.json();

    if (!bookingId || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: bookingId y userId.' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // 1. Obtener la reserva y verificar que pertenece al usuario
    const { data: booking, error: fetchError } = await supabaseServer
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada o no tienes autorización.' },
        { status: 404 }
      );
    }

    // Si ya está cancelada, no hacer nada
    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: true, message: 'La reserva ya estaba cancelada.' });
    }

    // 2. Actualizar estado local a 'cancelled'
    const { error: updateError } = await supabaseServer
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error cancelando reserva en BD:', updateError);
      return NextResponse.json({ error: 'Error al cancelar la reserva en base de datos.' }, { status: 500 });
    }

    // 3. Si tiene google_event_id, eliminar el evento en Google Calendar
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
