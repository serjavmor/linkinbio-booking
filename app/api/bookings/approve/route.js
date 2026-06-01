// app/api/bookings/approve/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { createCalendarEvent } from '@/lib/google-calendar';

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

    // 2. Obtener la reserva y verificar que pertenece al administrador autenticado
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

    // Si ya está confirmada, no hacer nada
    if (booking.status === 'confirmed') {
      return NextResponse.json({ success: true, message: 'La reserva ya estaba aprobada.' });
    }

    // 3. Actualizar estado local a 'confirmed'
    const { error: updateError } = await supabaseServer
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error aprobando reserva en BD:', updateError);
      return NextResponse.json({ error: 'Error al actualizar la reserva en la base de datos.' }, { status: 500 });
    }

    // 4. Sincronizar con Google Calendar (si está configurado)
    let googleEventId = null;
    let syncError = null;

    // Cargar tokens de Google del perfil del usuario
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('username, display_name, google_access_token, google_refresh_token, google_token_expiry')
      .eq('id', userId)
      .single();

    if (profile?.google_access_token && profile?.google_refresh_token) {
      try {
        const tokens = {
          access_token: profile.google_access_token,
          refresh_token: profile.google_refresh_token,
          expiry_date: Number(profile.google_token_expiry)
        };

        const summary = `Cita: ${booking.client_name} <> ${profile.display_name || profile.username}`;
        const description = `Reserva aprobada desde tu Link in Bio.\n\nCliente: ${booking.client_name}\nEmail: ${booking.client_email}\nNotas: ${booking.notes || 'Ninguna'}\n\nReserva ID: ${booking.id}`;

        // Crear evento
        googleEventId = await createCalendarEvent(tokens, {
          summary,
          description,
          startTime: booking.start_time,
          endTime: booking.end_time,
          clientEmail: booking.client_email,
          clientName: booking.client_name,
          notes: booking.notes
        });

        // 5. Guardar el ID del evento de Google
        if (googleEventId) {
          const { error: updateEventError } = await supabaseServer
            .from('bookings')
            .update({ google_event_id: googleEventId })
            .eq('id', booking.id);

          if (updateEventError) {
            console.error('Error guardando google_event_id en la reserva aprobada:', updateEventError);
          }
        }
      } catch (calError) {
        console.error('Error de sincronización de Google Calendar en aprobación:', calError);
        syncError = 'La reserva fue aprobada, pero no se pudo sincronizar el evento en Google Calendar.';
      }
    }

    return NextResponse.json({
      success: true,
      googleEventId,
      warning: syncError
    });
  } catch (error) {
    console.error('Excepción aprobando reserva:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
