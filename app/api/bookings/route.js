// app/api/bookings/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { createCalendarEvent } from '@/lib/google-calendar';
import { parseISO, format } from 'date-fns';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, clientName, clientEmail, startTime, endTime, notes } = body;

    // Validación básica
    if (!username || !clientName || !clientEmail || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios en la solicitud de reserva.' },
        { status: 400 }
      );
    }

    const supabaseServer = getSupabaseServer();

    // 1. Obtener perfil del usuario por username
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, display_name, google_access_token, google_refresh_token, google_token_expiry')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario destino no encontrado.' }, { status: 404 });
    }

    // 2. Insertar reserva de forma local en Supabase
    const { data: booking, error: insertError } = await supabaseServer
      .from('bookings')
      .insert({
        user_id: profile.id,
        client_name: clientName,
        client_email: clientEmail,
        start_time: startTime,
        end_time: endTime,
        notes: notes || '',
        status: 'confirmed'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando la reserva en base de datos:', insertError);
      return NextResponse.json(
        { error: 'Error interno al registrar la reserva en la base de datos.' },
        { status: 500 }
      );
    }

    // 3. Sincronizar con Google Calendar (si está configurado)
    let googleEventId = null;
    let syncError = null;

    if (profile.google_access_token && profile.google_refresh_token) {
      try {
        const tokens = {
          access_token: profile.google_access_token,
          refresh_token: profile.google_refresh_token,
          expiry_date: Number(profile.google_token_expiry)
        };

        // Formatear textos del evento
        const summary = `Cita: ${clientName} <> ${profile.display_name || username}`;
        const description = `Reserva creada desde tu Link in Bio.\n\nCliente: ${clientName}\nEmail: ${clientEmail}\nNotas: ${notes || 'Ninguna'}\n\nReserva ID: ${booking.id}`;

        // Crear evento
        googleEventId = await createCalendarEvent(tokens, {
          summary,
          description,
          startTime,
          endTime,
          clientEmail,
          clientName,
          notes
        });

        // 4. Si se creó con éxito en Google Calendar, guardar el ID del evento en la reserva local
        if (googleEventId) {
          const { error: updateError } = await supabaseServer
            .from('bookings')
            .update({ google_event_id: googleEventId })
            .eq('id', booking.id);

          if (updateError) {
            console.error('Error guardando google_event_id en la reserva:', updateError);
          }
        }
      } catch (calError) {
        console.error('Error de sincronización con Google Calendar:', calError);
        syncError = 'No se pudo sincronizar el evento en Google Calendar, pero la reserva local se guardó correctamente.';
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        google_event_id: googleEventId
      },
      warning: syncError
    });
  } catch (error) {
    console.error('Excepción registrando reserva:', error);
    return NextResponse.json(
      { error: 'Error del servidor al registrar la reserva.' },
      { status: 500 }
    );
  }
}
