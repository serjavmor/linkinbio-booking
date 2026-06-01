// app/[username]/page.js
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 0; // Evitar el cacheo para reflejar cambios al instante

export default async function LinkInBioPage({ params }) {
  const { username } = params;

  // 1. Obtener perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    notFound(); // Redirige automáticamente al 404 si el usuario no existe
  }

  // 2. Obtener enlaces activos del usuario ordenados
  const { data: links, error: linksError } = await supabase
    .from('links')
    .select('id, title, url, icon_name')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const activeLinks = links || [];

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card} className="glass-panel">
        
        {/* Avatar y Datos del Perfil */}
        <div style={styles.profileHeader}>
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
          <h1 style={styles.displayName}>{profile.display_name}</h1>
          <p style={styles.username}>@{profile.username}</p>
          {profile.bio && <p style={styles.bio}>{profile.bio}</p>}
        </div>

        {/* Sección de Reserva Destacada */}
        <div style={styles.bookingBox}>
          <p style={styles.bookingText}>¿Quieres agendar una reunión o asesoría conmigo?</p>
          <Link href={`/${username}/book`} className="btn btn-primary" style={styles.bookingBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Reservar una Cita
          </Link>
        </div>

        {/* Lista de Enlaces */}
        <div style={styles.linksContainer}>
          {activeLinks.length > 0 ? (
            activeLinks.map((link) => (
              <a 
                key={link.id} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={styles.linkCard}
                className="btn btn-secondary"
              >
                {link.icon_name && (
                  <span style={styles.linkIcon}>
                    {/* Icono simple o inicial del título */}
                    📁
                  </span>
                )}
                <span style={styles.linkTitle}>{link.title}</span>
              </a>
            ))
          ) : (
            <p style={styles.noLinks}>No hay enlaces configurados aún.</p>
          )}
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <p>Potenciado por <span style={styles.brandName}>LinkInBio & Reservas</span></p>
        </footer>

      </div>
    </div>
  );
}

// Estilos Vanilla en JS para aislamiento y renderizado limpio
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
    textAlign: 'center',
  },
  profileHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '16px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
  },
  avatarPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '16px',
    boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)',
  },
  displayName: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '4px',
    letterSpacing: '-0.02em',
  },
  username: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-muted))',
    marginBottom: '14px',
  },
  bio: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.6',
    maxWidth: '400px',
  },
  bookingBox: {
    background: 'rgba(124, 58, 237, 0.04)',
    border: '1px solid rgba(124, 58, 237, 0.15)',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  },
  bookingText: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    fontWeight: '500',
  },
  bookingBtn: {
    width: '100%',
    maxWidth: '280px',
  },
  linksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '40px',
  },
  linkCard: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px 20px',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '500',
    position: 'relative',
    textAlign: 'center',
  },
  linkIcon: {
    position: 'absolute',
    left: '20px',
    fontSize: '1.2rem',
  },
  linkTitle: {
    flex: 1,
  },
  noLinks: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: '20px',
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
  },
  brandName: {
    fontWeight: '600',
    color: 'hsl(var(--text-secondary))',
  }
};
