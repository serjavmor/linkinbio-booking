// app/[username]/book/page.js
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookAppointmentPage() {
  const { username } = useParams();
  const router = useRouter();

  // Estados
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { start, end, timeLabel }
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Formulario
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Validar fecha mínima (hoy) para el input date
  const todayStr = new Date().toISOString().split('T')[0];

  // Cargar slots cuando cambia la fecha
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setErrorMsg('');
      try {
        const res = await fetch(`/api/bookings/available?username=${username}&date=${selectedDate}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableSlots(data.slots || []);
        } else {
          setErrorMsg(data.error || 'Error al cargar disponibilidad.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Error al conectar con el servidor.');
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [selectedDate, username]);

  // Enviar reserva
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMsg('Por favor selecciona una hora de reserva.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          clientName,
          clientEmail,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          notes
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessData(data.booking);
      } else {
        setErrorMsg(data.error || 'Hubo un error al registrar tu reserva.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div style={styles.container} className="animate-fade-in">
        <div style={styles.card} className="glass-panel">
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>¡Reserva Confirmada!</h1>
          <p style={styles.successDesc}>
            Tu cita ha sido agendada con éxito. Se ha enviado un correo con la invitación del evento.
          </p>

          <div style={styles.detailsBox}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Nombre:</span>
              <span style={styles.detailVal}>{successData.client_name}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Email:</span>
              <span style={styles.detailVal}>{successData.client_email}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Fecha:</span>
              <span style={styles.detailVal}>
                {new Date(successData.start_time).toLocaleDateString('es-ES', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Hora:</span>
              <span style={styles.detailVal}>
                {new Date(successData.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {' '}
                {new Date(successData.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <Link href={`/${username}`} className="btn btn-primary" style={{ width: '100%' }}>
            Volver al Perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        
        {/* Encabezado */}
        <div style={styles.header}>
          <Link href={`/${username}`} style={styles.backBtn}>
            ← Volver
          </Link>
          <h1 style={styles.title}>Reservar Hora</h1>
          <p style={styles.subtitle}>Selecciona un día y una hora disponible para reunirnos.</p>
        </div>

        {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleBookingSubmit} style={styles.form}>
          
          {/* Paso 1: Elegir Fecha */}
          <div className="form-group">
            <label className="form-label" htmlFor="date-input">1. Selecciona el día</label>
            <input 
              id="date-input"
              type="date" 
              min={todayStr}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              required
              style={styles.dateInput}
            />
          </div>

          {/* Paso 2: Elegir Hora */}
          {selectedDate && (
            <div className="form-group">
              <label className="form-label">2. Selecciona la hora</label>
              
              {loadingSlots ? (
                <div style={styles.loadingSpinner}>Cargando horas disponibles...</div>
              ) : availableSlots.length > 0 ? (
                <div style={styles.slotsGrid}>
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          ...styles.slotBtn,
                          ...(isSelected ? styles.slotBtnSelected : {})
                        }}
                      >
                        {slot.timeLabel}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={styles.noSlotsText}>No hay horas disponibles para este día. Intenta con otra fecha.</p>
              )}
            </div>
          )}

          {/* Paso 3: Completar Datos */}
          {selectedSlot && (
            <div className="animate-fade-in" style={styles.formFields}>
              <div className="form-group">
                <label className="form-label" htmlFor="name-input">Nombre Completo</label>
                <input 
                  id="name-input"
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email-input">Correo Electrónico</label>
                <input 
                  id="email-input"
                  type="email" 
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="notes-input">Notas / Temas a tratar (Opcional)</label>
                <textarea 
                  id="notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cuéntame brevemente sobre qué quieres conversar..."
                  className="form-input"
                  style={styles.textarea}
                  rows="3"
                />
              </div>

              {/* Botón de Confirmación */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {submitting ? 'Reservando...' : 'Confirmar Reserva'}
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}

// Estilos Vanilla
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    padding: '40px 30px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: '500',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '8px',
    marginTop: '10px',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  dateInput: {
    colorScheme: 'dark', // Hace que el calendario nativo del navegador se renderice en tema oscuro
  },
  loadingSpinner: {
    textAlign: 'center',
    padding: '20px',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginTop: '10px',
  },
  slotBtn: {
    padding: '12px 8px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid hsl(var(--border-color))',
    borderRadius: '10px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },
  slotBtnSelected: {
    background: 'hsl(var(--accent-primary))',
    borderColor: 'hsl(var(--accent-primary))',
    boxShadow: '0 0 10px var(--accent-glow)',
  },
  noSlotsText: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    textAlign: 'center',
    padding: '15px 0',
  },
  formFields: {
    marginTop: '10px',
    borderTop: '1px solid hsl(var(--border-color))',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  textarea: {
    resize: 'none',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid hsl(var(--error))',
    color: '#fc8181',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '0.9rem',
    marginBottom: '20px',
  },
  successIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'rgba(22, 163, 74, 0.1)',
    border: '3px solid hsl(var(--success))',
    color: 'hsl(var(--success))',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0 auto 24px auto',
  },
  successTitle: {
    textAlign: 'center',
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '12px',
  },
  successDesc: {
    textAlign: 'center',
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  detailsBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid hsl(var(--border-color))',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
  },
  detailLabel: {
    color: 'hsl(var(--text-muted))',
  },
  detailVal: {
    fontWeight: '500',
    color: 'white',
  }
};
