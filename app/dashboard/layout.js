// app/dashboard/layout.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth Form State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Manejar Login o Registro con medidas de seguridad reforzadas
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isSignUp) {
        // 1. Validaciones de Registro
        if (!username) {
          setAuthError('El nombre de usuario es obligatorio.');
          setAuthLoading(false);
          return;
        }

        // Sanitización estricta del username (alfanumérico, puntos y guiones, sin espacios)
        const usernameRegex = /^[a-z0-9._-]+$/;
        const cleanUsername = username.toLowerCase().trim();
        if (!usernameRegex.test(cleanUsername)) {
          setAuthError('El nombre de usuario solo puede contener letras minúsculas, números, puntos, guiones y guiones bajos (sin espacios ni acentos).');
          setAuthLoading(false);
          return;
        }

        // Contraseñas Fuertes: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-\/\\#+,:;=<>])[A-Za-z\d@$!%*?&._\-\/\\#+,:;=<>]{8,}$/;
        if (!passwordRegex.test(password)) {
          setAuthError('La contraseña debe tener al menos 8 caracteres, incluir al menos una mayúscula, una minúscula, un número y un carácter especial.');
          setAuthLoading(false);
          return;
        }

        // 2. Verificación preventiva de duplicados en Supabase
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          setAuthError('El nombre de usuario ya está en uso. Por favor, elige otro.');
          setAuthLoading(false);
          return;
        }

        // 3. Crear usuario
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: displayName.trim() || cleanUsername,
            }
          }
        });

        if (error) throw error;
        setAuthError('Registro exitoso. Revisa tu correo para verificar tu cuenta.');
      } else {
        // Login estándar seguro
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Error en la autenticación.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner}></div>
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  // Si no está autenticado, renderizar la pantalla de Login/Registro con diseño ultra estético
  if (!session) {
    return (
      <div style={styles.authContainer} className="animate-fade-in">
        <div style={styles.authCard} className="glass-panel">
          <h2 style={styles.authTitle}>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
          <p style={styles.authSubtitle}>
            {isSignUp ? 'Regístrate para gestionar tu Link in Bio y calendario.' : 'Accede a tu panel de control privado.'}
          </p>

          {authError && <div style={{
            ...styles.errorAlert,
            background: authError.includes('exitoso') ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: authError.includes('exitoso') ? 'hsl(var(--success))' : 'hsl(var(--error))',
            color: authError.includes('exitoso') ? '#a3e635' : '#fc8181',
          }}>{authError}</div>}

          <form onSubmit={handleAuth} style={styles.authForm}>
            {isSignUp && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-username">Nombre de usuario (único)</label>
                  <input 
                    id="reg-username"
                    type="text" 
                    placeholder="ej. minombre" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-name">Nombre para mostrar</label>
                  <input 
                    id="reg-name"
                    type="text" 
                    placeholder="ej. Juan Pérez" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="form-input"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Correo Electrónico</label>
              <input 
                id="reg-email"
                type="email" 
                placeholder="correo@ejemplo.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Contraseña</label>
              <input 
                id="reg-password"
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ width: '100%', marginTop: '10px' }}>
              {authLoading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Entrar'}
            </button>
          </form>

          <p style={styles.authToggle}>
            {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta todavía?'} {' '}
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} style={styles.toggleBtn}>
              {isSignUp ? 'Inicia Sesión' : 'Regístrate aquí'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Dashboard Navegación
  const navItems = [
    { name: 'Resumen', path: '/dashboard', icon: '📊' },
    { name: 'Perfil', path: '/dashboard/profile', icon: '👤' },
    { name: 'Enlaces', path: '/dashboard/links', icon: '🔗' },
    { name: 'Disponibilidad', path: '/dashboard/schedule', icon: '📅' },
    { name: 'Reservas', path: '/dashboard/bookings', icon: '📝' },
    { name: 'Integraciones', path: '/dashboard/integrations', icon: '⚙️' }
  ];

  return (
    <div style={styles.dashboardContainer}>
      
      {/* Sidebar de Navegación Lateral */}
      <aside style={styles.sidebar} className="glass-panel">
        <div style={styles.sidebarBrand}>
          <h2>LinkinBio Admin</h2>
        </div>

        <nav style={styles.sidebarNav}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {})
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userEmail}>{session.user.email}</div>
          <button onClick={handleSignOut} className="btn btn-secondary" style={styles.signOutBtn}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <div style={styles.mainWrapper}>
        <header style={styles.dashboardHeader}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            {navItems.find(item => item.path === pathname)?.name || 'Administración'}
          </h1>
        </header>

        <main style={styles.dashboardContent}>
          {children}
        </main>
      </div>

    </div>
  );
}

// Estilos del Dashboard Layout
const styles = {
  loadingScreen: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    color: 'hsl(var(--text-secondary))',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.05)',
    borderTopColor: 'hsl(var(--accent-primary))',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  authCard: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px 30px',
  },
  authTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '8px',
  },
  authSubtitle: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    textAlign: 'center',
    marginBottom: '32px',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  authToggle: {
    marginTop: '24px',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    textAlign: 'center',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--accent-hover))',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    font: 'inherit',
  },
  errorAlert: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  dashboardContainer: {
    display: 'flex',
    minHeight: '100vh',
    background: 'hsl(var(--bg-primary))',
  },
  sidebar: {
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 0,
    borderWidth: '0 1px 0 0',
    background: 'hsl(var(--bg-secondary))',
    padding: '30px 20px',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  sidebarBrand: {
    marginBottom: '40px',
    paddingLeft: '10px',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '0.95rem',
    color: 'hsl(var(--text-secondary))',
    fontWeight: '500',
  },
  navLinkActive: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'white',
    borderLeft: '3px solid hsl(var(--accent-primary))',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  navIcon: {
    fontSize: '1.1rem',
  },
  sidebarFooter: {
    borderTop: '1px solid hsl(var(--border-color))',
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userEmail: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
    paddingLeft: '10px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  signOutBtn: {
    padding: '10px',
    fontSize: '0.85rem',
  },
  mainWrapper: {
    flex: 1,
    marginLeft: '260px', // Desplazar contenido por el ancho del sidebar fijo
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  dashboardHeader: {
    padding: '24px 40px',
    borderBottom: '1px solid hsl(var(--border-color))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(9, 9, 11, 0.5)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 9,
  },
  dashboardContent: {
    padding: '40px',
    flex: 1,
  }
};
