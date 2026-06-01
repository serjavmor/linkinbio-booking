// app/dashboard/bookings/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'upcoming' o 'history'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de carga por ID de cita
  const [actioningId, setActioningId] = useState(null);
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

  // Obtener Token JWT activo
  async function getActiveToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  // Aprobar Reserva
  const handleApproveBooking = async (bookingId) => {
    setActioningId(bookingId);

    try {
      const token = await getActiveToken();
      if (!token) {
        alert('Sesión no válida. Por favor inicia sesión de nuevo.');
        setActioningId(null);
        return;
      }

      const res = await fetch('/api/bookings/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookingId })
      });

      const data = await res.json();

      if (res.ok) {
        // Actualizar el estado de la reserva localmente a confirmado
        setBookings(bookings.map(b => 
          b.id === bookingId ? { 
            ...b, 
            status: 'confirmed', 
            google_event_id: data.googleEventId 
          } : b
        ));
      } else {
        alert(data.error || 'No se pudo aprobar la reserva.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al aprobar la reserva.');
    } finally {
      setActioningId(null);
    }
  };

  // Cancelar / Rechazar Reserva
  const handleCancelBooking = async (bookingId, isRejection = false) => {
    const confirmMessage = isRejection 
      ? '¿Estás seguro de que deseas rechazar esta reserva? Se notificará al cliente.'
      : '¿Estás seguro de que deseas cancelar esta reserva? Se notificará al cliente.';
      
    if (!confirm(confirmMessage)) return;
    setActioningId(bookingId);

    try {
      const token = await getActiveToken();
      if (!token) {
        alert('Sesión no válida. Por favor inicia sesión de nuevo.');
        setActioningId(null);
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
        // Actualizar estado localmente a cancelado
        setBookings(bookings.map(b => 
          b.id === bookingId ? { ...b, status: 'cancelled' } : b
        ));
      } else {
        alert(data.error || 'No se pudo procesar la cancelación.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al procesar la cancelación.');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando reservas...</div>;
  }

  const now = new Date();

  // Filtrar reservas por pestaña y término de búsqueda
  const filteredBookings = bookings.filter(b => {
    // 1. Filtro por búsqueda de texto (Nombre o Email)
    const matchesSearch = 
      b.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.client_email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Filtro por pestaña de estado
    const isFuture = new Date(b.start_time) >= now;

    if (activeTab === 'pending') {
      return b.status === 'pending';
    } else if (activeTab === 'upcoming') {
      return b.status === 'confirmed' && isFuture;
    } else if (activeTab === 'history') {
      return b.status === 'cancelled' || (b.status === 'confirmed' && !isFuture);
    }

    return true;
  });

  // Conteos para los badges de las pestañas
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && new Date(b.start_time) >= now).length;
  const historyCount = bookings.filter(b => b.status === 'cancelled' || (b.status === 'confirmed' && new Date(b.start_time) < now)).length;

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Controles de Búsqueda y Filtros */}
      <div style={styles.searchBarContainer} className="glass-panel">
        <input 
          id="search-input"
          type="text" 
          placeholder="Buscar reservas por nombre o correo de cliente..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={styles.searchInput}
        />
      </div>

      {/* Pestañas (Tabs) */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'pending' ? styles.tabBtnActive : {})
          }}
        >
          Pendientes ({pendingCount})
        </button>
        <button 
          onClick={() => setActiveTab('upcoming')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'upcoming' ? styles.tabBtnActive : {})
          }}
        >
          Confirmadas / Próximas ({upcomingCount})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'history' ? styles.tabBtnActive : {})
          }}
        >
          Historial / Canceladas ({historyCount})
        </button>
      </div>

      {/* Lista de Reservas Filtradas */}
      {filteredBookings.length > 0 ? (
        <div style={styles.bookingsGrid}>
          {filteredBookings.map((booking) => {
            const startDate = new Date(booking.start_time);
            const endDate = new Date(booking.end_time);
            
            const isPending = booking.status === 'pending';
            const isConfirmed = booking.status === 'confirmed';
            const isCancelled = booking.status === 'cancelled';
            const hasGoogleCalendar = !!booking.google_event_id;

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
                  
                  <div style={styles.badgeGroup}>
                    {/* Badge Estado */}
                    <span style={{
                      ...styles.statusBadge,
                      background: isCancelled 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : isPending 
                          ? 'rgba(249, 115, 22, 0.1)' 
                          : 'rgba(22, 163, 74, 0.1)',
                      color: isCancelled ? '#ef4444' : isPending ? '#f97316' : '#22c55e',
                      borderColor: isCancelled 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : isPending 
                          ? 'rgba(249, 115, 22, 0.2)' 
                          : 'rgba(22, 163, 74, 0.2)',
                    }}>
                      {isCancelled ? 'Cancelada' : isPending ? 'Pendiente' : 'Aprobada'}
                    </span>

                    {/* Badge Google Calendar */}
                    {isConfirmed && hasGoogleCalendar && (
                      <span style={styles.googleSyncBadge} title="Sincronizado con Google Calendar">
                        Google Sync ✓
                      </span>
                    )}
                  </div>
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

                {/* Acciones del Administrador */}
                <div style={styles.cardActions}>
                  {actioningId === booking.id ? (
                    <span style={styles.actioningText}>Procesando...</span>
                  ) : (
                    <>
                      {isPending && (
                        <div style={styles.actionsBtnGroup}>
                          <button 
                            onClick={() => handleCancelBooking(booking.id, true)}
                            className="btn btn-secondary"
                            style={styles.actionBtnSmall}
                          >
                            Rechazar
                          </button>
                          <button 
                            onClick={() => handleApproveBooking(booking.id)}
                            className="btn btn-primary"
                            style={styles.actionBtnSmall}
                          >
                            Aprobar Cita
                          </button>
                        </div>
                      )}

                      {isConfirmed && new Date(booking.start_time) >= now && (
                        <button 
                          onClick={() => handleCancelBooking(booking.id)}
                          className="btn btn-secondary"
                          style={styles.cancelBtn}
                        >
                          Cancelar Cita
                        </button>
                      )}
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.emptyState} className="glass-panel">
          <p>
            {searchTerm 
              ? 'No se encontraron reservas que coincidan con la búsqueda.' 
              : activeTab === 'pending' 
                ? 'No tienes reservas pendientes de aprobación.'
                : activeTab === 'upcoming'
                  ? 'No tienes próximas reservas confirmadas.'
                  : 'No hay historial de reservas registradas.'}
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
  searchBarContainer: {
    padding: '16px 20px',
    marginBottom: '24px',
    borderRadius: '12px',
  },
  searchInput: {
    background: 'rgba(255, 255, 255, 0.01)',
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '16px',
    marginBottom: '30px',
    flexWrap: 'wrap',
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
    minHeight: '260px',
  },
  bookingCardCancelled: {
    opacity: 0.6,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '10px',
  },
  clientName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
  clientEmail: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    wordBreak: 'break-all',
  },
  badgeGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '6px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  googleSyncBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '0.7rem',
    fontWeight: '600',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    whiteSpace: 'nowrap',
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
    marginTop: 'auto',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.02)',
  },
  actionsBtnGroup: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    justifyContent: 'flex-end',
  },
  actionBtnSmall: {
    padding: '8px 16px',
    fontSize: '0.8rem',
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: '0.8rem',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fc8181',
  },
  actioningText: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
  },
  emptyState: {
    padding: '60px',
    textAlign: 'center',
    color: 'hsl(var(--text-muted))',
  }
};
