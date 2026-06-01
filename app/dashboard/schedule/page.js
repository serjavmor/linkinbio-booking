// app/dashboard/schedule/page.js
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DAYS_NAME = [
  { id: 1, name: 'Lunes' },
  { id: 2, name: 'Martes' },
  { id: 3, name: 'Miércoles' },
  { id: 4, name: 'Jueves' },
  { id: 5, name: 'Viernes' },
  { id: 6, name: 'Sábado' },
  { id: 0, name: 'Domingo' }
];

// Generar opciones de horas de 30 en 30 min (de 00:00 a 23:30)
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  const hourPad = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hourPad}:00`);
  TIME_OPTIONS.push(`${hourPad}:30`);
}

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Estructura de estado: { [dayId]: { active: boolean, start: string, end: string } }
  const [scheduleState, setScheduleState] = useState({});

  useEffect(() => {
    loadSchedule();
  }, []);

  async function loadSchedule() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('schedules')
        .select('day_of_week, start_time, end_time')
        .eq('user_id', user.id);

      if (error) throw error;

      // Estructurar datos cargados
      const initialSchedule = {};
      
      // Inicializar por defecto (desactivados, de 09:00 a 17:00)
      DAYS_NAME.forEach(day => {
        initialSchedule[day.id] = {
          active: false,
          start: '09:00',
          end: '17:00'
        };
      });

      // Sobreescribir con datos de BD
      if (data && data.length > 0) {
        data.forEach(item => {
          // Remover segundos de 'HH:MM:SS' para coincidir con TIME_OPTIONS
          const formattedStart = item.start_time.substring(0, 5);
          const formattedEnd = item.end_time.substring(0, 5);
          
          initialSchedule[item.day_of_week] = {
            active: true,
            start: formattedStart,
            end: formattedEnd
          };
        });
      } else {
        // Horario por defecto sugerido si está vacío (Lunes a Viernes de 09:00 a 17:00 activo)
        for (let i = 1; i <= 5; i++) {
          initialSchedule[i].active = true;
        }
      }

      setScheduleState(initialSchedule);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Error cargando configuración de horarios.' });
    } finally {
      setLoading(false);
    }
  }

  // Activar/Desactivar día
  const handleToggleDay = (dayId) => {
    setScheduleState(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        active: !prev[dayId].active
      }
    }));
  };

  // Cambiar Hora de Inicio o Fin
  const handleTimeChange = (dayId, field, val) => {
    setScheduleState(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: val
      }
    }));
  };

  // Guardar en BD
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Eliminar horarios existentes de este usuario
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // 2. Preparar inserciones de los días activos
      const inserts = [];
      DAYS_NAME.forEach(day => {
        const config = scheduleState[day.id];
        if (config.active) {
          // Validar rango horario
          const [sh, sm] = config.start.split(':').map(Number);
          const [eh, em] = config.end.split(':').map(Number);
          
          if (sh > eh || (sh === eh && sm >= em)) {
            throw new Error(`El horario de finalización para el día ${day.name} debe ser posterior al inicio.`);
          }

          inserts.push({
            user_id: user.id,
            day_of_week: day.id,
            start_time: `${config.start}:00`,
            end_time: `${config.end}:00`
          });
        }
      });

      // 3. Insertar nuevos horarios
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('schedules')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      setFeedback({ type: 'success', message: '¡Horarios guardados y actualizados con éxito!' });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Error al guardar los horarios.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Cargando horarios...</div>;
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

      <form onSubmit={handleSave} style={styles.formCard} className="glass-panel">
        <h3 style={styles.cardTitle}>Define tu Disponibilidad Horaria Semanal</h3>
        <p style={styles.cardDesc}>Marca los días que estarás disponible y los rangos de horas en los que tus clientes podrán reservar citas.</p>

        <div style={styles.daysList}>
          {DAYS_NAME.map((day) => {
            const config = scheduleState[day.id] || { active: false, start: '09:00', end: '17:00' };
            return (
              <div key={day.id} style={styles.dayRow}>
                
                {/* Switch / Checkbox del Día */}
                <div style={styles.dayCheckboxGroup}>
                  <input 
                    id={`checkbox-${day.id}`}
                    type="checkbox" 
                    checked={config.active}
                    onChange={() => handleToggleDay(day.id)}
                    style={styles.checkbox}
                  />
                  <label htmlFor={`checkbox-${day.id}`} style={{
                    ...styles.dayLabel,
                    color: config.active ? 'white' : 'hsl(var(--text-muted))'
                  }}>
                    {day.name}
                  </label>
                </div>

                {/* Selectores de Horas */}
                <div style={{
                  ...styles.timeSelectorsGroup,
                  opacity: config.active ? 1 : 0.3,
                  pointerEvents: config.active ? 'auto' : 'none'
                }}>
                  <select 
                    aria-label={`Hora de inicio para ${day.name}`}
                    value={config.start} 
                    onChange={(e) => handleTimeChange(day.id, 'start', e.target.value)}
                    className="form-input"
                    style={styles.timeSelect}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={`start-${time}`} value={time}>{time}</option>
                    ))}
                  </select>

                  <span style={styles.timeDivider}>a</span>

                  <select 
                    aria-label={`Hora de fin para ${day.name}`}
                    value={config.end} 
                    onChange={(e) => handleTimeChange(day.id, 'end', e.target.value)}
                    className="form-input"
                    style={styles.timeSelect}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={`end-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                {/* Estado Informativo */}
                <div style={styles.statusCol}>
                  {!config.active && <span style={styles.closedBadge}>Cerrado</span>}
                </div>

              </div>
            );
          })}
        </div>

        <div style={styles.footerRow}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={styles.saveBtn}>
            {saving ? 'Guardando...' : 'Guardar Disponibilidad'}
          </button>
        </div>
      </form>

    </div>
  );
}

const styles = {
  container: {
    maxWidth: '850px',
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
  formCard: {
    padding: '35px 30px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '8px',
  },
  cardDesc: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-secondary))',
    marginBottom: '32px',
  },
  daysList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '40px',
  },
  dayRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    flexWrap: 'wrap',
    gap: '15px',
  },
  dayCheckboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    width: '160px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: 'hsl(var(--accent-primary))',
    cursor: 'pointer',
  },
  dayLabel: {
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  timeSelectorsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'opacity 0.2s ease',
  },
  timeSelect: {
    width: '100px',
    padding: '8px 12px',
    textAlign: 'center',
  },
  timeDivider: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
  },
  statusCol: {
    width: '100px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closedBadge: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'hsl(var(--text-muted))',
    background: 'rgba(255,255,255,0.02)',
    padding: '4px 10px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveBtn: {
    width: '100%',
    maxWidth: '220px',
  }
};
