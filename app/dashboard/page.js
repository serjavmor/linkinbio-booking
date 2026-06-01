// app/dashboard/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardSummaryPage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ links: 0, bookings: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Obtener perfil
        const { data: prof } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single();
        
        setProfile(prof);

        // 2. Obtener estadísticas (enlaces y reservas)
        const { count: linksCount } = await supabase
          .from('links')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        setStats({
          links: linksCount || 0,
          bookings: bookingsCount || 0
        });

      } catch (err) {
        console.error('Error cargando resumen:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCopyLink = () => {
    if (!profile) return;
    const publicUrl = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div style={styles.loading}>Cargando resumen...</div>;
  }

  const publicLink = profile ? `${window.location.origin}/${profile.username}` : '';

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Enlace Público Destacado */}
      <div style={styles.welcomeBox} className="glass-panel">
        <div>
          <h2 style={styles.welcomeTitle}>¡Hola, {profile?.display_name || 'Creador'}!</h2>
          <p style={styles.welcomeText}>Tu página de Link in Bio y reservas está activa en el siguiente enlace público:</p>
          <div style={styles.linkRow}>
            <a href={publicLink} target="_blank" rel="noopener noreferrer" style={styles.linkAnchor}>
              {publicLink}
            </a>
            <button onClick={handleCopyLink} className="btn btn-secondary" style={styles.copyBtn}>
              {copied ? '¡Copiado! ✓' : 'Copiar Enlace'}
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard} className="glass-panel">
          <span style={styles.statIcon}>🔗</span>
          <div style={styles.statContent}>
            <span style={styles.statNumber}>{stats.links}</span>
            <span style={styles.statLabel}>Enlaces Activos</span>
          </div>
        </div>

        <div style={styles.statCard} className="glass-panel">
          <span style={styles.statIcon}>📝</span>
          <div style={styles.statContent}>
            <span style={styles.statNumber}>{stats.bookings}</span>
            <span style={styles.statLabel}>Reservas Confirmadas</span>
          </div>
        </div>
      </div>

      {/* Sugerencias Rápidas */}
      <div style={styles.sugerenciasSection}>
        <h3 style={styles.secTitle}>Próximos Pasos Recomendados</h3>
        <div style={styles.secGrid}>
          <div style={styles.stepCard} className="glass-panel">
            <h4>1. Configura tus Enlaces</h4>
            <p>Agrega redes sociales, tu sitio web personal u otros canales importantes.</p>
            <Link href="/dashboard/links" className="btn btn-secondary" style={styles.stepBtn}>
              Gestionar Enlaces
            </Link>
          </div>

          <div style={styles.stepCard} className="glass-panel">
            <h4>2. Define tu Horario</h4>
            <p>Establece los días y horas de la semana en los que estás disponible para reservas.</p>
            <Link href="/dashboard/schedule" className="btn btn-secondary" style={styles.stepBtn}>
              Configurar Horarios
            </Link>
          </div>

          <div style={styles.stepCard} className="glass-panel">
            <h4>3. Conecta Google Calendar</h4>
            <p>Sincroniza tus reservas automáticamente y evita conflictos de horarios.</p>
            <Link href="/dashboard/integrations" className="btn btn-primary" style={styles.stepBtn}>
              Vincular Calendario
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  loading: {
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
  },
  welcomeBox: {
    padding: '30px',
    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
    border: '1px solid rgba(124, 58, 237, 0.15)',
  },
  welcomeTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '8px',
  },
  welcomeText: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
    marginBottom: '20px',
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
  },
  linkAnchor: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'hsl(var(--accent-hover))',
    wordBreak: 'break-all',
  },
  copyBtn: {
    padding: '10px 16px',
    fontSize: '0.85rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  statCard: {
    padding: '24px 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statIcon: {
    fontSize: '2.5rem',
  },
  statContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  statNumber: {
    fontSize: '2.25rem',
    fontWeight: '800',
    lineHeight: '1.1',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-secondary))',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sugerenciasSection: {
    marginTop: '20px',
  },
  secTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '20px',
  },
  secGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  stepCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stepBtn: {
    marginTop: 'auto',
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
  }
};
