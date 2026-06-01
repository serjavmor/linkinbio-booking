// app/dashboard/bookings/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' o 'history'
  const [cancellingId, setCancellingId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error cargando reservas:', err);
    } finally {
      setLoading(false);
    }
  }

  // Cancelar Reserva de forma segura enviando JWT
  const handleCancelBooking = async (bookingId) => {
    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva? Se enviará una notificación de cancelación al cliente.')) return;
    setCancellingId(bookingId);

    try {
      // Obtener el token de acceso de la sesión activa
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Sesión no válida o expirada. Por favor inicia sesión de nuevo.');
        setCancellingId(null);
        return;
      }

      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId })
      });

      const data = await res.json();

      if (res.ok) {
        // Actualizar estado localmente
        setBookings(bookings.map(b => 
          b.id === bookingId ? { ...b, status: 'cancelled' } : b
        ));
      } else {
        alert(data.error || 'No se pudo cancelar la reserva.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al cancelar la reserva.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando reservas...</div>;
  }

  const now = new Date();

  // Filtrar reservas por pestaña
  const upcomingBookings = bookings.filter(b => {
    const isFuture = new Date(b.start_time) >= now;
    return isFuture && b.status === 'confirmed';
  });

  const historyBookings = bookings.filter(b => {
    const isPast = new Date(b.start_time) < now;
    return isPast || b.status === 'cancelled';
  });

  const activeBookingsList = activeTab === 'upcoming' ? upcomingBookings : historyBookings;

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Pestañas (Tabs) */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('upcoming')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'upcoming' ? styles.tabBtnActive : {})
          }}
        >
          Próximas Reservas ({upcomingBookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'history' ? styles.tabBtnActive : {})
          }}
        >
          Historial / Canceladas ({historyBookings.length})
        </button>
      </div>

      {/* Lista de Reservas */}
      {activeBookingsList.length > 0 ? (
        <div style={styles.bookingsGrid}>
          {activeBookingsList.map((booking) => {
            const startDate = new Date(booking.start_time);
            const endDate = new Date(booking.end_time);
            const isCancelled = booking.status === 'cancelled';

            return (
              <div key={booking.id} style={{
                ...styles.bookingCard,
                ...(isCancelled ? styles.bookingCardCancelled : {})
              }} className="glass-panel">
                
                {/* Cabecera Tarjeta */}
                <div style={styles.cardHeader}>
                  <div>
                    <h4 style={styles.clientName}>{booking.client_name}</h4>
                    <p style={styles.clientEmail}>{booking.client_email}</p>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    background: isCancelled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                    color: isCancelled ? '#ef4444' : '#22c55e',
                    borderColor: isCancelled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(22, 163, 74, 0.2)',
                  }}>
                    {isCancelled ? 'Cancelado' : 'Confirmado'}
                  </span>
                </div>

                {/* Detalles Fecha/Hora */}
                <div style={styles.cardDetails}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>📅</span>
                    <span>
                      {startDate.toLocaleDateString('es-ES', { 
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>⏰</span>
                    <span>
                      {startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {' '}
                      {endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Notas */}
                {booking.notes && (
                  <div style={styles.notesBox}>
                    <h5 style={styles.notesTitle}>Notas del Cliente:</h5>
                    <p style={styles.notesText}>{booking.notes}</p>
                  </div>
                )}

                {/* Acciones */}
                {!isCancelled && (
                  <div style={styles.cardActions}>
                    <button 
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="btn btn-secondary"
                      style={styles.cancelBtn}
                    >
                      {cancellingId === booking.id ? 'Cancelando...' : 'Cancelar Cita'}
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyState} className="glass-panel">
          <p>
            {activeTab === 'upcoming' 
              ? 'No tienes próximas reservas agendadas.' 
              : 'No hay historial de reservas ni cancelaciones.'}
          </p>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: {},
  loading: {
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '16px',
    marginBottom: '30px',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--text-secondary))',
    fontSize: '0.95rem',
    fontWeight: '600',
    padding: '8px 16px',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  tabBtnActive: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'white',
    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
  },
  bookingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '20px',
  },
  bookingCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  bookingCardCancelled: {
    opacity: 0.6,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  clientName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
  clientEmail: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid',
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  detailIcon: {
    fontSize: '1.1rem',
  },
  notesBox: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.03)',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
  },
  notesTitle: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  notesText: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.4',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: '0.8rem',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fc8181',
  },
  emptyState: {
    padding: '60px',
    textAlign: 'center',
    color: 'hsl(var(--text-muted))',
  }
};
