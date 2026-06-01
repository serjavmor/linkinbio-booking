// app/dashboard/links/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function LinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Nuevo Enlace Form State
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (err) {
      console.error('Error cargando enlaces:', err);
    } finally {
      setLoading(false);
    }
  }

  // Agregar Enlace
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!title || !url) return;
    setAdding(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Definir sort_order al final
      const nextSortOrder = links.length > 0 ? Math.max(...links.map(l => l.sort_order)) + 1 : 0;

      // Validar URL básica
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const { data, error } = await supabase
        .from('links')
        .insert({
          user_id: user.id,
          title: title.trim(),
          url: formattedUrl,
          sort_order: nextSortOrder,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setTitle('');
      setUrl('');
      setLinks([...links, data]);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al agregar enlace.');
    } finally {
      setAdding(false);
    }
  };

  // Cambiar Visibilidad
  const handleToggleActive = async (linkId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('links')
        .update({ is_active: !currentStatus })
        .eq('id', linkId);

      if (error) throw error;

      setLinks(links.map(link => 
        link.id === linkId ? { ...link, is_active: !currentStatus } : link
      ));
    } catch (err) {
      console.error(err);
    }
  };

  // Eliminar Enlace
  const handleDeleteLink = async (linkId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este enlace?')) return;

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      setLinks(links.filter(link => link.id !== linkId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando enlaces...</div>;
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      
      <div style={styles.layoutGrid}>
        
        {/* Formulario Crear Enlace */}
        <div style={styles.formCard} className="glass-panel">
          <h3 style={styles.sectionTitle}>Agregar Nuevo Enlace</h3>
          
          {errorMsg && <div style={styles.errorAlert}>{errorMsg}</div>}

          <form onSubmit={handleAddLink} style={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="link-title">Título del Enlace</label>
              <input 
                id="link-title"
                type="text" 
                placeholder="ej. Visita mi Web Personal" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="link-url">URL de destino</label>
              <input 
                id="link-url"
                type="text" 
                placeholder="ej. www.misitio.com" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={adding} style={{ width: '100%' }}>
              {adding ? 'Guardando...' : 'Agregar Enlace'}
            </button>
          </form>
        </div>

        {/* Lista de Enlaces */}
        <div style={styles.listSection}>
          <h3 style={styles.sectionTitle}>Mis Enlaces Activos ({links.length})</h3>
          
          {links.length > 0 ? (
            <div style={styles.listContainer}>
              {links.map((link) => (
                <div key={link.id} style={styles.linkRow} className="glass-panel">
                  <div style={styles.linkInfo}>
                    <h4 style={styles.linkTitleText}>{link.title}</h4>
                    <p style={styles.linkUrlText}>{link.url}</p>
                  </div>
                  
                  <div style={styles.linkActions}>
                    <button 
                      onClick={() => handleToggleActive(link.id, link.is_active)}
                      style={{
                        ...styles.badgeBtn,
                        background: link.is_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        color: link.is_active ? 'lightgreen' : 'hsl(var(--text-muted))',
                        borderColor: link.is_active ? 'rgba(22, 163, 74, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {link.is_active ? 'Activo' : 'Oculto'}
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteLink(link.id)} 
                      style={styles.deleteBtn}
                      title="Eliminar Enlace"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState} className="glass-panel">
              <p>No tienes enlaces creados. ¡Agrega el primero a la izquierda!</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

const styles = {
  container: {},
  loading: {
    color: 'hsl(var(--text-muted))',
    fontStyle: 'italic',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '30px',
    alignItems: 'start',
  },
  formCard: {
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  listSection: {},
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  linkRow: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
  },
  linkInfo: {
    minWidth: 0,
    flex: 1,
  },
  linkTitleText: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  linkUrlText: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  linkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badgeBtn: {
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid',
    transition: 'all 0.2s ease',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s ease',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: 'hsl(var(--text-muted))',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid hsl(var(--error))',
    color: '#fc8181',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '0.9rem',
    marginBottom: '20px',
  }
};
