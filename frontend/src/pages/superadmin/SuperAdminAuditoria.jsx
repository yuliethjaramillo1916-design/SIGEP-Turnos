import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  ShieldAlert, Filter, Search, Calendar, User, Building2,
  ChevronLeft, ChevronRight, RefreshCw, FileText
} from 'lucide-react';

export default function SuperAdminAuditoria() {
  const [eventos, setEventos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [filtroAccion, setFiltroAccion] = useState('todas');
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [loading, setLoading] = useState(true);

  const acciones = [
    { id: 'todas', label: 'Todas las acciones' },
    { id: 'CREAR_ENTIDAD', label: 'Crear Entidad' },
    { id: 'EDITAR_ENTIDAD', label: 'Editar Entidad' },
    { id: 'CAMBIAR_ESTADO_ENTIDAD', label: 'Cambiar Estado Entidad' },
    { id: 'ARCHIVAR_ENTIDAD', label: 'Archivar Entidad' },
    { id: 'REACTIVAR_ENTIDAD', label: 'Reactivar Entidad' },
    { id: 'CREAR_ADMIN_ENTIDAD', label: 'Crear Admin Entidad' },
    { id: 'CREAR_PLAN', label: 'Crear Plan' },
    { id: 'EDITAR_PLAN', label: 'Editar Plan' },
    { id: 'CREAR_LICENCIA', label: 'Crear Licencia' },
    { id: 'RENOVAR_LICENCIA', label: 'Renovar Licencia' },
    { id: 'SUSPENDER_LICENCIA', label: 'Suspender Licencia' },
    { id: 'CONFIGURACION_GLOBAL_MODIFICADA', label: 'Configuración Global' },
    { id: 'LOGIN_SUPER_ADMIN', label: 'Login SuperAdmin' }
  ];

  const fetchAuditoria = async () => {
    try {
      setLoading(true);
      const params = { page: pagina, limit: 25 };
      if (filtroAccion !== 'todas') params.accion = filtroAccion;
      if (filtroEntidad) params.entidadId = filtroEntidad;

      const [resAud, resEnt] = await Promise.all([
        api.get('/super-admin/auditoria', { params }),
        api.get('/super-admin/entidades')
      ]);

      setEventos(resAud.data.eventos || []);
      setTotal(resAud.data.total || 0);
      setPaginas(resAud.data.pages || 1);
      setEntidades(resEnt.data || []);
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditoria();
  }, [pagina, filtroAccion, filtroEntidad]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Bitácora de Auditoría Global
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Registro cronológico inmutable de seguridad, cambios de configuración y acciones maestras.
          </p>
        </div>

        <button
          onClick={fetchAuditoria}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1.1rem', borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* ── Filtros ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center',
        background: 'rgba(255,255,255,0.03)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)'
      }}>
        {/* Filtro Acción */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
            TIPO DE ACCIÓN
          </label>
          <select
            value={filtroAccion} onChange={e => { setFiltroAccion(e.target.value); setPagina(1); }}
            style={{
              width: '100%', height: '40px', padding: '0 0.8rem', background: '#1a1830',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none'
            }}
          >
            {acciones.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* Filtro Entidad */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
            ENTIDAD AFECTADA
          </label>
          <select
            value={filtroEntidad} onChange={e => { setFiltroEntidad(e.target.value); setPagina(1); }}
            style={{
              width: '100%', height: '40px', padding: '0 0.8rem', background: '#1a1830',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none'
            }}
          >
            <option value="">Todas las entidades</option>
            {entidades.map(ent => (
              <option key={ent._id} value={ent._id}>{ent.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Tabla de Auditoría ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>Cargando registros...</div>
      ) : eventos.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)',
          borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <ShieldAlert size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Sin registros de auditoría</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>
            No hay eventos que coincidan con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>Acción</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Detalles del Evento</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Entidad</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Autor</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Fecha & Hora</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                  
                  {/* Acción */}
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                      background: ev.accion?.includes('CREAR') ? 'rgba(34,197,94,0.15)' :
                                  ev.accion?.includes('ARCHIVAR') || ev.accion?.includes('SUSPENDER') ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)',
                      color: ev.accion?.includes('CREAR') ? '#4ade80' :
                             ev.accion?.includes('ARCHIVAR') || ev.accion?.includes('SUSPENDER') ? '#f87171' : '#c084fc'
                    }}>
                      {ev.accion}
                    </span>
                  </td>

                  {/* Detalles */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: 'white', fontWeight: 600 }}>{ev.detalles}</div>
                    {ev.ip && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        IP: {ev.ip}
                      </div>
                    )}
                  </td>

                  {/* Entidad */}
                  <td style={{ padding: '1rem' }}>
                    {ev.entidadAfectada ? (
                      <span style={{ color: '#f472b6', fontWeight: 700 }}>
                        {ev.entidadAfectada.nombre}
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>Global (Plataforma)</span>
                    )}
                  </td>

                  {/* Autor */}
                  <td style={{ padding: '1rem' }}>
                    <div style={{ color: 'white', fontWeight: 600 }}>
                      {ev.autor?.nombre ? `${ev.autor.nombre} ${ev.autor.apellido || ''}` : 'SUPER_ADMIN'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                      {ev.autor?.email}
                    </div>
                  </td>

                  {/* Fecha */}
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ color: 'white', fontWeight: 600 }}>
                      {new Date(ev.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          {paginas > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)'
            }}>
              <div>Total de eventos: <strong>{total}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: pagina === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Página {pagina} de {paginas}</span>
                <button
                  onClick={() => setPagina(p => Math.min(paginas, p + 1))}
                  disabled={pagina === paginas}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: pagina === paginas ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
