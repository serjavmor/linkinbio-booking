// app/api/bookings/available/route.js
import { NextResponse } from 'next/server';
import { supabase, getSupabaseServer } from '@/lib/supabase';
import { getBusySlots } from '@/lib/google-calendar';
import { 
  parseISO, 
  startOfDay, 
  endOfDay, 
  getDay, 
  format, 
  addMinutes, 
  isBefore, 
  isAfter, 
  areIntervalsOverlapping,
  parse
} from 'date-fns';

export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const dateStr = searchParams.get('date'); // Formato: 'YYYY-MM-DD'

    if (!username || !dateStr) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: username y date.' },
        { status: 400 }
      );
    }

    // 1. Buscar perfil y sus tokens de Google
    // Usamos Supabase Server por si los tokens de Google están ocultos por RLS o para seguridad.
    const supabaseServer = getSupabaseServer();
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('id, google_access_token, google_refresh_token, google_token_expiry')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    // 2. Determinar el día de la semana (0 = Domingo, 1 = Lunes, etc.)
    const targetDate = parseISO(dateStr);
    const dayOfWeek = getDay(targetDate); // 0-6

    // 3. Obtener la disponibilidad (schedules) del usuario para ese día
    const { data: schedules, error: scheduleError } = await supabaseServer
      .from('schedules')
      .select('start_time, end_time')
      .eq('user_id', profile.id)
      .eq('day_of_week', dayOfWeek);

    if (scheduleError) {
      console.error('Error obteniendo disponibilidad:', scheduleError);
      return NextResponse.json({ error: 'Error al consultar disponibilidad.' }, { status: 500 });
    }

    // Si no tiene disponibilidad configurada para ese día de la semana, no hay slots
    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 4. Generar slots de 30 minutos para cada rango de horario disponible
    // Ej. si trabaja de 09:00 a 12:00, creamos: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
    const slotDurationMinutes = 30;
    const generatedSlots = [];

    schedules.forEach(sched => {
      const [startHour, startMin] = sched.start_time.split(':').map(Number);
      const [endHour, endMin] = sched.end_time.split(':').map(Number);

      let currentSlotStart = new Date(targetDate);
      currentSlotStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(targetDate);
      dayEnd.setHours(endHour, endMin, 0, 0);

      // No permitir reservar horas que ya pasaron si el día seleccionado es HOY
      const now = new Date();

      while (isBefore(currentSlotStart, dayEnd)) {
        const currentSlotEnd = addMinutes(currentSlotStart, slotDurationMinutes);
        
        // Comprobar que no sea en el pasado
        if (isAfter(currentSlotStart, now)) {
          generatedSlots.push({
            start: currentSlotStart.toISOString(),
            end: currentSlotEnd.toISOString(),
            timeLabel: format(currentSlotStart, 'HH:mm')
          });
        }
        
        currentSlotStart = currentSlotEnd;
      }
    });

    if (generatedSlots.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // 5. Obtener reservas locales confirmadas en esa fecha
    const dayStartISO = startOfDay(targetDate).toISOString();
    const dayEndISO = endOfDay(targetDate).toISOString();

    const { data: localBookings, error: bookingsError } = await supabaseServer
      .from('bookings')
      .select('start_time, end_time')
      .eq('user_id', profile.id)
      .eq('status', 'confirmed')
      .gte('start_time', dayStartISO)
      .lte('start_time', dayEndISO);

    if (bookingsError) {
      console.error('Error obteniendo reservas locales:', bookingsError);
    }

    const localBusyIntervals = (localBookings || []).map(b => ({
      start: parseISO(b.start_time),
      end: parseISO(b.end_time)
    }));

    // 6. Obtener horas ocupadas en Google Calendar (si está configurado)
    let googleBusyIntervals = [];
    const hasGoogleCalendar = profile.google_access_token && profile.google_refresh_token;

    if (hasGoogleCalendar) {
      try {
        const tokens = {
          access_token: profile.google_access_token,
          refresh_token: profile.google_refresh_token,
          expiry_date: Number(profile.google_token_expiry)
        };

        const busyList = await getBusySlots(tokens, dayStartISO, dayEndISO);
        googleBusyIntervals = busyList.map(b => ({
          start: parseISO(b.start),
          end: parseISO(b.end)
        }));
      } catch (calError) {
        console.error('Error consultando Google Calendar:', calError);
        // Continuamos de todas formas usando las reservas locales
      }
    }

    const allBusyIntervals = [...localBusyIntervals, ...googleBusyIntervals];

    // 7. Filtrar slots generados que se solapen con algún intervalo ocupado
    const availableSlots = generatedSlots.filter(slot => {
      const slotInterval = {
        start: parseISO(slot.start),
        end: parseISO(slot.end)
      };

      // Comprobar si se solapa con algún intervalo ocupado
      const isOverlap = allBusyIntervals.some(busy => {
        return areIntervalsOverlapping(slotInterval, busy);
      });

      return !isOverlap;
    });

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    console.error('Excepción consultando slots libres:', error);
    return NextResponse.json(
      { error: 'Error del servidor al calcular slots disponibles.' },
      { status: 500 }
    );
  }
}
