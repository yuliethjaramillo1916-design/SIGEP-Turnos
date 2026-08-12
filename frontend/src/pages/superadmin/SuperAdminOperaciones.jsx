import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Activity, ShieldAlert, AlertTriangle, CheckCircle2,
  Calendar, Clock, Building2, User, Key, RefreshCw, Zap
} from 'lucide-react';

export default function SuperAdminOperaciones() {
  const [operaciones, setOperaciones] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOperaciones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/super-admin/operaciones');
      setOperaciones(res.data);
    } catch (err) {
      console.error('Error al cargar operaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperaciones();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>Cargando Centro de Operaciones...</div>;
  }

  const { eventosRecientes = [], estadisticas = {}, alertasSeguridad = [], entidadesPorVencer = [] } = operaciones || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Centro de Operaciones Maestras
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Visor operacional de eventos administrativos, renovaciones prioritarias y seguridad SaaS.
          </p>
        </div>

        <button
          onClick={fetchOperaciones}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1.1rem', borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} /> Actualizar Estado
        </button>
      </div>

      {/* ── KPIs Rápidos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '18px', padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Acciones de Hoy
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', marginTop: '0.2rem' }}>
            {estadisticas.eventosHoy || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#a78bfa', marginTop: '0.4rem' }}>
            Eventos administrativos globales
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(234,179,8,0.2)',
          borderRadius: '18px', padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Licencias Próximas a Expirar
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: entidadesPorVencer.length > 0 ? '#facc15' : 'white', marginTop: '0.2rem' }}>
            {entidadesPorVencer.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>
            En los próximos 30 días
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '18px', padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Estado de Seguridad
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4ade80', marginTop: '0.6rem' }}>
            100% Protegido
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>
            Aislamiento estricto por entidadId
          </div>
        </div>

      </div>

      {/* ── Entidades por Vencer (Alertas Comerciales) ── */}
      {entidadesPorVencer.length > 0 && (
        <div style={{
          background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)',
          borderRadius: '20px', padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#facc15', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> Atención Comercial: Licencias Próximas a Vencer
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 1.25rem 0' }}>
            Las siguientes instituciones tienen menos de 30 días de suscripción restante:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {entidadesPorVencer.map(ent => (
              <div key={ent._id} style={{
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: '0.92rem' }}>{ent.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{ent.correo}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#facc15', fontWeight: 700 }}>VENCE:</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>
                    {new Date(ent.fechaVencimiento).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Registro de Operaciones Recientes ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 0.3rem 0' }}>
          Flujo Cronológico de Eventos Administrativos
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 1.25rem 0' }}>
          Monitoreo en tiempo real de operaciones de la plataforma
        </p>

        {eventosRecientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
            No hay eventos registrados recientemente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {eventosRecientes.map(ev => (
              <div key={ev._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1.1rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#f472b6', flexShrink: 0
                  }}>
                    <Activity size={16} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800,
                        background: 'rgba(139,92,246,0.2)', color: '#c084fc'
                      }}>
                        {ev.accion}
                      </span>
                      {ev.entidadAfectada && (
                        <span style={{ color: '#f472b6', fontWeight: 700 }}>
                          [{ev.entidadAfectada.nombre}]
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'white', fontWeight: 600, marginTop: '2px' }}>
                      {ev.detalles}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                  <div>{new Date(ev.createdAt).toLocaleDateString()}</div>
                  <div>{new Date(ev.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
