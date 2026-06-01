// lib/google-calendar.js
import { google } from 'googleapis';

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

/**
 * Obtiene una instancia del cliente OAuth2 de Google.
 */
export function getOAuth2Client() {
  if (!clientID || !clientSecret || !redirectUri) {
    throw new Error('Faltan variables de entorno para la configuración de Google OAuth.');
  }
  return new google.auth.OAuth2(clientID, clientSecret, redirectUri);
}

/**
 * Genera la URL de autorización para conectar Google Calendar.
 * @param {string} userId ID de usuario de Supabase para rastrear la sesión en el callback.
 */
export function getAuthUrl(userId) {
  const oauth2Client = getOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Muy importante para recibir el refresh_token
    prompt: 'consent',      // Forza a Google a mostrar la pantalla de consentimiento para asegurar el refresh_token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state: userId // Pasamos el ID del usuario en el state para asociarlo en el callback
  });
}

/**
 * Intercambia el código de autorización temporal por los tokens permanentes.
 * @param {string} code Código recibido de Google en la redirección.
 */
export async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Configura un cliente OAuth2 con los tokens del usuario. Si el access_token expiró,
 * se refresca automáticamente usando el refresh_token.
 * @param {object} tokens Objeto con access_token, refresh_token y expiry_date.
 * @returns {Promise<object>} Cliente OAuth2 listo y tokens actualizados (si hubo refresh).
 */
export async function getClientWithTokens(tokens) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Si tiene refresh_token, googleapis refresca automáticamente cuando sea necesario.
  // Pero podemos forzar u obtener los tokens actualizados si es necesario.
  oauth2Client.on('tokens', (newTokens) => {
    // Evento útil para detectar cuando se refrescó el token en segundo plano y guardarlo
    // Esto se puede manejar en las llamadas de base de datos si es necesario.
  });

  // Verificar si el token ya expiró o expirará pronto (menos de 5 minutos) y forzar refresco
  const isExpired = tokens.expiry_date ? Date.now() >= tokens.expiry_date - 300000 : true;
  
  if (isExpired && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      return {
        oauth2Client,
        updatedTokens: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refresh_token, // A veces no devuelve un nuevo refresh_token
          expiry_date: credentials.expiry_date
        },
        refreshed: true
      };
    } catch (error) {
      console.error('Error refrescando token de Google:', error);
      throw error;
    }
  }

  return {
    oauth2Client,
    updatedTokens: tokens,
    refreshed: false
  };
}

/**
 * Consulta la disponibilidad (horas ocupadas) de un usuario en su Google Calendar.
 * @param {object} tokens Tokens del usuario (`access_token`, `refresh_token`, etc.).
 * @param {string} timeMin Fecha/Hora de inicio ISO string (ej. '2026-06-01T00:00:00Z').
 * @param {string} timeMax Fecha/Hora de fin ISO string (ej. '2026-06-01T23:59:59Z').
 * @returns {Promise<Array<{start: string, end: string}>>} Lista de intervalos ocupados.
 */
export async function getBusySlots(tokens, timeMin, timeMax) {
  const { oauth2Client } = await getClientWithTokens(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: 'primary' }]
    }
  });

  const primaryCalendar = response.data.calendars?.primary;
  return primaryCalendar?.busy || [];
}

/**
 * Crea un evento en el Google Calendar principal de un usuario.
 * @param {object} tokens Tokens del usuario.
 * @param {object} eventDetails Detalles del evento (summary, description, startTime, endTime, clientEmail, clientName).
 * @returns {Promise<string>} ID del evento creado en Google Calendar.
 */
export async function createCalendarEvent(tokens, eventDetails) {
  const { oauth2Client } = await getClientWithTokens(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const { summary, description, startTime, endTime, clientEmail, clientName } = eventDetails;

  const event = {
    summary: summary || `Cita con ${clientName}`,
    description: description || `Reserva gestionada vía Link in Bio.\nCliente: ${clientName} (${clientEmail})\nNotas: ${eventDetails.notes || 'Ninguna'}`,
    start: {
      dateTime: startTime, // ISO String (ej. '2026-06-01T10:00:00-04:00')
    },
    end: {
      dateTime: endTime, // ISO String
    },
    attendees: [
      { email: clientEmail, displayName: clientName }
    ],
    reminders: {
      useDefault: true
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all' // Envía invitaciones por correo al cliente y dueño del calendario
  });

  return response.data.id;
}

/**
 * Cancela/Elimina un evento de Google Calendar.
 * @param {object} tokens Tokens del usuario.
 * @param {string} eventId ID del evento en Google Calendar.
 */
export async function deleteCalendarEvent(tokens, eventId) {
  const { oauth2Client } = await getClientWithTokens(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all'
  });
}
