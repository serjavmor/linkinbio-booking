// app/api/bookings/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

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
      .select('id, display_name')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario destino no encontrado.' }, { status: 404 });
    }

    // 2. Insertar reserva de forma local en Supabase con estado 'pending'
    const { data: booking, error: insertError } = await supabaseServer
      .from('bookings')
      .insert({
        user_id: profile.id,
        client_name: clientName,
        client_email: clientEmail,
        start_time: startTime,
        end_time: endTime,
        notes: notes || '',
        status: 'pending' // Por defecto entra como pendiente
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

    return NextResponse.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Excepción registrando reserva:', error);
    return NextResponse.json(
      { error: 'Error del servidor al registrar la reserva.' },
      { status: 500 }
    );
  }
}
