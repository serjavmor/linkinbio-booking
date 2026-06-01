// app/[username]/page.js
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 0; // Evitar cacheo

const DAYS_MAP = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo'
};

// Orden de los días de Lunes a Domingo para el despliegue público
const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function LinkInBioPage({ params }) {
  const { username } = params;

  // 1. Obtener perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, services, social_links')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // 2. Obtener enlaces activos del usuario ordenados
  const { data: links } = await supabase
    .from('links')
    .select('id, title, url, icon_name')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const activeLinks = links || [];

  // 3. Obtener disponibilidad semanal de schedules
  const { data: schedules } = await supabase
    .from('schedules')
    .select('day_of_week, start_time, end_time')
    .eq('user_id', profile.id);

  const activeSchedules = schedules || [];

  // Agrupar horarios por día de la semana
  const scheduleByDay = {};
  activeSchedules.forEach(item => {
    scheduleByDay[item.day_of_week] = `${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}`;
  });

  const socialLinksObj = profile.social_links || {};

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        
        {/* Banner Superior con Gradiente */}
        <div style={styles.banner}>
          <div style={styles.bannerOverlay}></div>
        </div>

        {/* Foto de Perfil Solapada */}
        <div style={styles.avatarWrapper}>
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.display_name} 
              style={styles.avatar} 
            />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>

        {/* Nombre y Nombre de Usuario */}
        <div style={styles.profileInfo}>
          <h1 style={styles.displayName}>{profile.display_name}</h1>
          <p style={styles.username}>@{profile.username}</p>
          {profile.bio && <p style={styles.bio}>{profile.bio}</p>}
        </div>

        {/* Enlaces a Redes Sociales */}
        {Object.keys(socialLinksObj).some(key => socialLinksObj[key]) && (
          <div style={styles.socialContainer}>
            {socialLinksObj.instagram && (
              <a href={socialLinksObj.instagram} target="_blank" rel="noopener noreferrer" style={styles.socialIcon} title="Instagram">
                📸
              </a>
            )}
            {socialLinksObj.twitter && (
              <a href={socialLinksObj.twitter} target="_blank" rel="noopener noreferrer" style={styles.socialIcon} title="Twitter/X">
                🐦
              </a>
            )}
            {socialLinksObj.linkedin && (
              <a href={socialLinksObj.linkedin} target="_blank" rel="noopener noreferrer" style={styles.socialIcon} title="LinkedIn">
                💼
              </a>
            )}
            {socialLinksObj.github && (
              <a href={socialLinksObj.github} target="_blank" rel="noopener noreferrer" style={styles.socialIcon} title="GitHub">
                🐙
              </a>
            )}
          </div>
        )}

        {/* Sección de Servicios */}
        {profile.services && (
          <div style={styles.section} className="glass-panel">
            <h3 style={styles.sectionTitle}>Servicios</h3>
            <p style={styles.servicesText}>{profile.services}</p>
          </div>
        )}

        {/* Sección de Reservas y Agenda */}
        <div style={styles.bookingBox}>
          <p style={styles.bookingText}>¿Quieres agendar una reunión o asesoría conmigo?</p>
          <Link href={`/${username}/book`} className="btn btn-primary" style={styles.bookingBtn}>
            📅 Reservar una Cita
          </Link>
        </div>

        {/* Disponibilidad Semanal */}
        {activeSchedules.length > 0 && (
          <div style={styles.section} className="glass-panel">
            <h3 style={styles.sectionTitle}>Horario de Atención</h3>
            <div style={styles.scheduleGrid}>
              {DAYS_ORDER.map(dayId => {
                const isAvailable = scheduleByDay[dayId] !== undefined;
                return (
                  <div key={dayId} style={styles.scheduleRow}>
                    <span style={{
                      ...styles.scheduleDayName,
                      color: isAvailable ? 'white' : 'hsl(var(--text-muted))'
                    }}>
                      {DAYS_MAP[dayId]}
                    </span>
                    <span style={{
                      ...styles.scheduleHours,
                      color: isAvailable ? 'hsl(var(--accent-hover))' : 'hsl(var(--text-muted))'
                    }}>
                      {isAvailable ? scheduleByDay[dayId] : 'No disponible'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Enlaces del Perfil */}
        {activeLinks.length > 0 && (
          <div style={styles.linksContainer}>
            <h3 style={styles.linksHeader}>Enlaces de interés</h3>
            {activeLinks.map((link) => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.linkCard}
                className="btn btn-secondary"
              >
                📁 {link.title}
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer style={styles.footer}>
          <p>Potenciado por <span style={styles.brandName}>LinkInBio & Reservas</span></p>
        </footer>

      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '40px 20px 100px 20px', // Padding inferior generoso para móviles e Instagram
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    textAlign: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderRadius: '24px',
  },
  banner: {
    height: '140px',
    background: 'linear-gradient(135deg, hsl(var(--accent-primary)) 0%, #030303 100%)',
    position: 'relative',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 100%)',
  },
  avatarWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '-55px', // Solapa el avatar un 50% con el banner
    position: 'relative',
    zIndex: 2,
    marginBottom: '16px',
  },
  avatar: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid hsl(var(--bg-primary))',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    background: 'hsl(var(--bg-primary))',
  },
  avatarPlaceholder: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2.8rem',
    fontWeight: '700',
    color: 'white',
    border: '4px solid hsl(var(--bg-primary))',
    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
  },
  profileInfo: {
    padding: '0 24px',
    marginBottom: '20px',
  },
  displayName: {
    fontSize: '1.6rem',
    fontWeight: '700',
    marginBottom: '4px',
    letterSpacing: '-0.02em',
  },
  username: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-muted))',
    marginBottom: '14px',
  },
  bio: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.5',
    maxWidth: '420px',
    margin: '0 auto',
  },
  socialContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  socialIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.2rem',
    transition: 'all 0.2s ease',
  },
  section: {
    margin: '0 24px 24px 24px',
    padding: '20px',
    textAlign: 'left',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: '8px',
  },
  servicesText: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
  },
  bookingBox: {
    background: 'rgba(124, 58, 237, 0.04)',
    border: '1px solid rgba(124, 58, 237, 0.15)',
    borderRadius: '16px',
    padding: '24px',
    margin: '0 24px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    alignItems: 'center',
  },
  bookingText: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    fontWeight: '500',
  },
  bookingBtn: {
    width: '100%',
    padding: '14px 20px',
  },
  scheduleGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  scheduleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  scheduleDayName: {
    fontWeight: '500',
  },
  scheduleHours: {
    fontWeight: '600',
  },
  linksContainer: {
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  linksHeader: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  linkCard: {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '500',
    textAlign: 'left',
    gap: '12px',
  },
  footer: {
    marginTop: '20px',
    paddingBottom: '24px',
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
  },
  brandName: {
    fontWeight: '600',
    color: 'hsl(var(--text-secondary))',
  }
};
