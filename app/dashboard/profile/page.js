// app/dashboard/profile/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfileManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Campos de Perfil
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [services, setServices] = useState('');
  
  // Redes Sociales
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, services, social_links')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
        setServices(data.services || '');

        const socials = data.social_links || {};
        setInstagram(socials.instagram || '');
        setTwitter(socials.twitter || '');
        setLinkedin(socials.linkedin || '');
        setGithub(socials.github || '');
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      setFeedback({ type: 'error', message: 'No se pudo cargar la información del perfil.' });
    } finally {
      setLoading(false);
    }
  }

  // Guardar Perfil con validaciones de seguridad
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    // Sanitización y Validación básica
    if (displayName.trim().length > 50) {
      setFeedback({ type: 'error', message: 'El nombre para mostrar es demasiado largo (máximo 50 caracteres).' });
      setSaving(false);
      return;
    }

    if (bio.trim().length > 300) {
      setFeedback({ type: 'error', message: 'La biografía es demasiado larga (máximo 300 caracteres).' });
      setSaving(false);
      return;
    }

    // Estructurar enlaces sociales
    const socialLinks = {
      instagram: instagram.trim(),
      twitter: twitter.trim(),
      linkedin: linkedin.trim(),
      github: github.trim()
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl.trim(),
          services: services.trim(),
          social_links: socialLinks
        })
        .eq('id', userId);

      if (error) throw error;

      setFeedback({ type: 'success', message: '¡Perfil actualizado con éxito!' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Error al guardar los cambios del perfil.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando configuración de perfil...</div>;
  }

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

      <form onSubmit={handleSaveProfile} style={styles.formGrid}>
        
        {/* Columna Izquierda: Información de Perfil */}
        <div style={styles.card} className="glass-panel">
          <h3 style={styles.sectionTitle}>Información del Perfil</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="profile-display-name">Nombre para Mostrar</label>
            <input 
              id="profile-display-name"
              type="text" 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="Tu Nombre Profesional"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-avatar-url">URL de tu Foto de Perfil</label>
            <input 
              id="profile-avatar-url"
              type="url" 
              value={avatarUrl} 
              onChange={(e) => setAvatarUrl(e.target.value)} 
              placeholder="https://ejemplo.com/mi-foto.jpg"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-bio">Biografía / Presentación Corta</label>
            <textarea 
              id="profile-bio"
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="Cuéntale a tu público sobre ti en un par de frases..."
              className="form-input"
              style={styles.textarea}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-services">Descripción de tus Servicios</label>
            <textarea 
              id="profile-services"
              value={services} 
              onChange={(e) => setServices(e.target.value)} 
              placeholder="Describe detalladamente qué servicios profesionales ofreces..."
              className="form-input"
              style={styles.textarea}
              rows="6"
            />
          </div>
        </div>

        {/* Columna Derecha: Redes Sociales */}
        <div style={styles.card} className="glass-panel">
          <h3 style={styles.sectionTitle}>Enlaces a Redes Sociales</h3>
          <p style={styles.sectionDesc}>Introduce el enlace completo a tus perfiles para habilitar los botones públicos.</p>
          
          <div className="form-group">
            <label className="form-label" htmlFor="social-instagram">URL de Instagram</label>
            <input 
              id="social-instagram"
              type="url" 
              value={instagram} 
              onChange={(e) => setInstagram(e.target.value)} 
              placeholder="https://instagram.com/tu_usuario"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="social-twitter">URL de Twitter / X</label>
            <input 
              id="social-twitter"
              type="url" 
              value={twitter} 
              onChange={(e) => setTwitter(e.target.value)} 
              placeholder="https://x.com/tu_usuario"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="social-linkedin">URL de LinkedIn</label>
            <input 
              id="social-linkedin"
              type="url" 
              value={linkedin} 
              onChange={(e) => setLinkedin(e.target.value)} 
              placeholder="https://linkedin.com/in/tu_nombre"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="social-github">URL de GitHub</label>
            <input 
              id="social-github"
              type="url" 
              value={github} 
              onChange={(e) => setGithub(e.target.value)} 
              placeholder="https://github.com/tu_usuario"
              className="form-input"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={styles.saveBtn}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>

      </form>

    </div>
  );
}

const styles = {
  container: {},
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '30px',
    alignItems: 'start',
  },
  card: {
    padding: '30px',
  },
  sectionTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    marginBottom: '20px',
    color: 'white',
  },
  sectionDesc: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  textarea: {
    resize: 'none',
  },
  saveBtn: {
    width: '100%',
    marginTop: '20px',
  }
};
