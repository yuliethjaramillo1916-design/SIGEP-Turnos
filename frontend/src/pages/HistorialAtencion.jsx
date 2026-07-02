import { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ── Helper: normaliza cualquier fecha a YYYY-MM-DD local ── */
const normF = (t) => {
  if (t.createdAt) {
    const d = new Date(t.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  if (t.fecha && /^\d{4}-\d{2}-\d{2}/.test(t.fecha)) return t.fecha.slice(0, 10);
  return 'Sin fecha';
};

const formatLabel = (fecha) => {
  if (fecha === 'Sin fecha') return 'Sin fecha';
  const [y, m, d] = fecha.split('-');
  const hoy = new Date().toISOString().split('T')[0];
  if (fecha === hoy) return `Hoy — ${d}/${m}/${y}`;
  return `${d}/${m}/${y}`;
};

const HistorialAtencion = () => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const res = await api.get('/turnos');
      const all = res.data || [];
      // OPERADOR: ve todos los finalizados/cancelados (no solo los suyos)
      // ADMINISTRADOR: ídem, con columna extra de quién atendió
      const filtrado = all.filter(t =>
        t.estado === 'FINALIZADO' || t.estado === 'CANCELADO'
      );
      setHistorial(filtrado);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) fetchHistorial();
  }, [user?._id]);

  /* Agrupar por fecha desc */
  const grupos = historial.reduce((acc, t) => {
    const f = normF(t);
    if (!acc[f]) acc[f] = [];
    acc[f].push(t);
    return acc;
  }, {});
  const fechas = Object.keys(grupos).sort((a, b) => b.localeCompare(a));

  const esAdmin = user?.rol === 'ADMINISTRADOR';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {esAdmin ? 'Historial de Turnos Atendidos' : 'Mis Turnos Atendidos'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {esAdmin
              ? 'Registro completo de todos los turnos finalizados y cancelados por operador.'
              : 'Registro de todos los turnos que has atendido, agrupados por fecha.'}
          </p>
        </div>
        <button
          onClick={fetchHistorial}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          disabled={loading}
        >
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={36} style={{ color: 'var(--primary)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: 600 }}>Cargando historial...</p>
        </div>
      ) : historial.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <CheckCircle size={48} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Sin historial aún</h3>
          <p>No hay turnos finalizados o cancelados registrados.</p>
        </div>
      ) : (
        <>
          {/* Resumen total */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span style={{
              background: 'rgba(52,211,153,0.15)', color: '#34d399',
              border: '1px solid rgba(52,211,153,0.3)',
              padding: '0.25rem 0.875rem', borderRadius: '999px',
              fontSize: '0.8rem', fontWeight: 700,
            }}>
              {historial.length} turno{historial.length !== 1 ? 's' : ''} en total
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
              {fechas.length} día{fechas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grupos por fecha */}
          {fechas.map(fecha => (
            <div key={fecha} style={{ marginBottom: '2rem' }}>

              {/* Separador de fecha */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <span style={{
                  background: fecha === new Date().toISOString().split('T')[0]
                    ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${fecha === new Date().toISOString().split('T')[0]
                    ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '20px', padding: '0.25rem 0.875rem',
                  fontSize: '0.8rem', fontWeight: 700,
                  color: fecha === new Date().toISOString().split('T')[0]
                    ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  📅 {formatLabel(fecha)}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {grupos[fecha].length} turno{grupos[fecha].length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Tabla del grupo */}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Trámite</th>
                      <th>Clasificación</th>
                      <th>Estado</th>
                      <th>Hora</th>
                      <th>Espera</th>
                      <th>Atendido Por</th>
                      {esAdmin && <th>Ventanilla</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {grupos[fecha].map(t => (
                      <tr key={t._id}>
                        <td>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{t.codigoTurno}</strong>
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>{t.tramite?.nombre || '—'}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '999px',
                            fontSize: '0.7rem', fontWeight: 700,
                            background: t.prioridad === 'PRIORITARIO' ? 'rgba(248,113,113,0.15)' : 'rgba(124,58,237,0.15)',
                            color: t.prioridad === 'PRIORITARIO' ? '#f87171' : '#a78bfa',
                            border: `1px solid ${t.prioridad === 'PRIORITARIO' ? 'rgba(248,113,113,0.3)' : 'rgba(124,58,237,0.3)'}`,
                          }}>
                            {t.prioridad}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '999px',
                            fontSize: '0.7rem', fontWeight: 700,
                            background: t.estado === 'FINALIZADO' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                            color: t.estado === 'FINALIZADO' ? '#34d399' : '#f87171',
                            border: `1px solid ${t.estado === 'FINALIZADO' ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                          }}>
                            {t.estado}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{t.hora}</td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {t.tiempoEspera ? `${Math.floor(t.tiempoEspera / 60)} min` : '—'}
                        </td>
                        {/* Atendido Por — visible para todos */}
                        <td style={{ fontSize: '0.82rem' }}>
                          {t.usuarioAtencion
                            ? <span style={{ fontWeight: 600, color: '#a78bfa' }}>{t.usuarioAtencion.nombre} {t.usuarioAtencion.apellido}</span>
                            : <span style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.25)' }}>No asignado</span>
                          }
                        </td>
                        {esAdmin && (
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {t.ventanilla || '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default HistorialAtencion;
