// app/page.js
import Link from 'next/link';

export default function Home() {
  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Navbar Minimalista */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔗</span>
          <span style={styles.logoText}>LinkinBio & Booking</span>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={styles.navBtn}>
          Entrar al Panel
        </Link>
      </header>

      {/* Sección Hero */}
      <main style={styles.main}>
        <div style={styles.heroSection}>
          <div style={styles.tagLine} className="glass-panel">
            ✨ Plataforma Premium de Agendamiento
          </div>
          
          <h1 style={styles.title}>
            Tu carta de presentación y <br />
            <span className="text-accent-gradient">calendario en un solo enlace.</span>
          </h1>
          
          <p style={styles.subtitle}>
            Crea una página de perfil elegante con tus enlaces importantes y un widget interactivo de reservas. Sincroniza tus citas automáticamente con Google Calendar en tiempo real.
          </p>

          <div style={styles.ctaGroup}>
            <Link href="/dashboard" className="btn btn-primary" style={styles.ctaBtn}>
              Crear mi Perfil Gratis
            </Link>
            <a href="#features" className="btn btn-secondary" style={styles.ctaBtn}>
              Conocer más
            </a>
          </div>
        </div>

        {/* Sección de Características */}
        <section id="features" style={styles.featuresSection}>
          <h2 style={styles.featuresTitle}>Todo lo que necesitas para gestionar tu tiempo</h2>
          
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard} className="glass-panel">
              <span style={styles.featureIcon}>🔗</span>
              <h3>Link in Bio Premium</h3>
              <p>Presenta tus redes sociales, sitio web u otros canales importantes en una sola página adaptada para móviles.</p>
            </div>

            <div style={styles.featureCard} className="glass-panel">
              <span style={styles.featureIcon}>📅</span>
              <h3>Reservas Inteligentes</h3>
              <p>Tus clientes eligen entre los días y horas de disponibilidad que configures, completando sus datos de forma fluida.</p>
            </div>

            <div style={styles.featureCard} className="glass-panel">
              <span style={styles.featureIcon}>⚡</span>
              <h3>Google Calendar Sync</h3>
              <p>Conexión directa vía OAuth2. Detecta tus horas ocupadas y crea los eventos automáticamente con alertas por correo.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 LinkinBio & Booking. Desarrollado con Next.js y Supabase PostgreSQL.</p>
      </footer>

    </div>
  );
}

// Estilos de la Landing Page
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 40px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '1.5rem',
  },
  logoText: {
    fontFamily: 'var(--font-family-title)',
    fontWeight: '700',
    fontSize: '1.2rem',
    letterSpacing: '-0.02em',
  },
  navBtn: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  heroSection: {
    textAlign: 'center',
    padding: '80px 20px 100px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '850px',
  },
  tagLine: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: '600',
    borderRadius: '20px',
    color: 'hsl(var(--accent-hover))',
    marginBottom: '28px',
    border: '1px solid rgba(124, 58, 237, 0.15)',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: '800',
    lineHeight: '1.15',
    letterSpacing: '-0.03em',
    marginBottom: '24px',
  },
  subtitle: {
    fontSize: '1.15rem',
    color: 'hsl(var(--text-secondary))',
    lineHeight: '1.6',
    maxWidth: '650px',
    marginBottom: '40px',
  },
  ctaGroup: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaBtn: {
    minWidth: '180px',
    padding: '14px 28px',
  },
  featuresSection: {
    padding: '80px 20px',
    width: '100%',
    borderTop: '1px solid hsl(var(--border-color))',
    textAlign: 'center',
  },
  featuresTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '50px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '30px',
  },
  featureCard: {
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  featureIcon: {
    fontSize: '2.25rem',
  },
  footer: {
    borderTop: '1px solid hsl(var(--border-color))',
    padding: '30px 20px',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
  }
};
