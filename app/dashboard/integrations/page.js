// app/dashboard/integrations/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

export default function IntegrationsPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Procesar feedback de la URL
    const status = searchParams.get('status');
    const error = searchParams.get('error');

    if (status === 'google_connected') {
      setFeedback({ type: 'success', message: '¡Tu Google Calendar se ha vinculado con éxito!' });
    } else if (error) {
      let msg = 'Hubo un error al conectar con Google.';
      if (error === 'google_denied') msg = 'Cancelaste el acceso a Google Calendar.';
      else if (error === 'db_save_failed') msg = 'No se pudieron guardar los tokens en la base de datos.';
      setFeedback({ type: 'error', message: msg });
    }

    // 2. Cargar perfil
    loadProfile();
  }, [searchParams]);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, google_access_token, google_refresh_token')
        .eq('id', user.id)
        .single();

      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Iniciar flujo de conexión con Google
  const handleConnectGoogle = () => {
    if (!profile) return;
    // Redirigir al endpoint de backend
    window.location.href = `/api/auth/google?userId=${profile.id}`;
  };

  // Desconectar Google
  const handleDisconnectGoogle = async () => {
    if (!profile) return;
    setUpdating(true);
    setFeedback({ type: '', message: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expiry: null
        })
        .eq('id', profile.id);

      if (error) throw error;

      setFeedback({ type: 'success', message: 'Google Calendar se ha desconectado con éxito.' });
      loadProfile();
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Error al desconectar Google Calendar.' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando integraciones...</div>;
  }

  const isConnected = profile?.google_access_token && profile?.google_refresh_token;

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {feedback.message && (
        <div style={{
          ...styles.feedbackAlert,
          background: feedback.type === 'success' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: feedback.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--error))',
          color: feedback.type === 'success' ? '#a3e635' : '#fc8181',
        }}>
          {feedback.message}
        </div>
      )}

      <div style={styles.integrationCard} className="glass-panel">
        <div style={styles.cardHeader}>
          <div style={styles.brandGroup}>
            <span style={styles.googleIcon}>📅</span>
            <div>
              <h3 style={styles.brandTitle}>Google Calendar</h3>
              <p style={styles.brandDesc}>Sincroniza tus citas reservadas directamente con tu calendario personal de Google.</p>
            </div>
          </div>
          <span style={{
            ...styles.statusBadge,
            background: isConnected ? 'rgba(22, 163, 74, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            color: isConnected ? 'lightgreen' : 'hsl(var(--text-muted))',
            borderColor: isConnected ? 'rgba(22, 163, 74, 0.3)' : 'rgba(255, 255, 255, 0.1)',
          }}>
            {isConnected ? 'Vinculado' : 'No Conectado'}
          </span>
        </div>

        <div style={styles.cardBody}>
          <p style={styles.featuresText}>Al activar esta integración:</p>
          <ul style={styles.featuresList}>
            <li>Las reservas nuevas se agendan automáticamente en tu calendario principal de Google.</li>
            <li>Se envían invitaciones por correo automáticamente a tus clientes.</li>
            <li>El sistema consulta tu Google Calendar para bloquear horas ocupadas y evitar reservas duplicadas.</li>
          </ul>
        </div>

        <div style={styles.cardFooter}>
          {isConnected ? (
            <button 
              onClick={handleDisconnectGoogle} 
              className="btn btn-secondary" 
              disabled={updating}
              style={styles.actionBtn}
            >
              {updating ? 'Desconectando...' : 'Desconectar Cuenta'}
            </button>
          ) : (
            <button 
              onClick={handleConnectGoogle} 
              className="btn btn-primary"
              style={styles.actionBtn}
            >
              Vincular Google Calendar
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
  },
  loading: {
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
  },
  feedbackAlert: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '16px 20px',
    fontSize: '0.95rem',
    marginBottom: '30px',
    lineHeight: '1.4',
  },
  integrationCard: {
    padding: '30px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '24px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  brandGroup: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  googleIcon: {
    fontSize: '3rem',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
  brandDesc: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    maxWidth: '450px',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    border: '1px solid',
  },
  cardBody: {
    marginBottom: '32px',
  },
  featuresText: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'white',
    marginBottom: '12px',
  },
  featuresList: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
  },
  actionBtn: {
    width: '100%',
    maxWidth: '250px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-start',
  }
};
