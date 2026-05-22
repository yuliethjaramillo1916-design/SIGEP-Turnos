import { useState, useEffect, useRef } from 'react';
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, XCircle,
  Filter, Search, Download, RefreshCw, CalendarRange,
  FileText, ChevronDown, Users, AlertTriangle, Printer
} from 'lucide-react';
import api from '../services/api';

const formatSegundos = (seg) => {
  if (!seg || seg <= 0) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const estadoBadge = {
  ESPERA:      { cls: 'badge-primary',  label: 'ESPERA' },
  ATENDIENDO:  { cls: 'badge-warning',  label: 'ATENDIENDO' },
  FINALIZADO:  { cls: 'badge-success',  label: 'FINALIZADO' },
  CANCELADO:   { cls: 'badge-danger',   label: 'CANCELADO' },
  PAUSADO:     { cls: 'badge-warning',  label: 'PAUSADO' },
};

const Reportes = () => {
  const today = new Date().toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [buscar, setBuscar] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [tramites, setTramites] = useState([]);
  const [filterTramite, setFilterTramite] = useState('');

  const [resumen, setResumen] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    // Cargar trámites para el filtro
    api.get('/tramites').then(res => setTramites(res.data || [])).catch(() => {});
    // Auto-cargar con hoy
    handleBuscar();
  }, []);

  const handleBuscar = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin)    params.append('fechaFin', fechaFin);
      if (filterTramite) params.append('tramiteId', filterTramite);

      const res = await api.get(`/reportes/historico?${params.toString()}`);
      setResumen(res.data.resumen || null);
      setDetalles(res.data.detalles || []);
    } catch (err) {
      alert('Error al generar el reporte: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Filtro local por búsqueda y estado
  const filteredDetalles = detalles.filter(t => {
    const matchBuscar = !buscar || t.codigoTurno?.toLowerCase().includes(buscar.toLowerCase());
    const matchEstado = !filterEstado || t.estado === filterEstado;
    return matchBuscar && matchEstado;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Reportes Históricos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Consulta y filtra el historial completo de turnos por rango de fechas y trámite.
          </p>
        </div>
        {resumen && (
          <button
            className="btn btn-outline"
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <Printer size={18} /> Imprimir Reporte
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Filter size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Filtros de Búsqueda</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.83rem' }}>Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{ marginTop: '0.35rem', borderRadius: '8px' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.83rem' }}>Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{ marginTop: '0.35rem', borderRadius: '8px' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.83rem' }}>Trámite</label>
            <select
              value={filterTramite}
              onChange={(e) => setFilterTramite(e.target.value)}
              style={{ marginTop: '0.35rem', borderRadius: '8px', height: '38px' }}
            >
              <option value="">Todos los trámites</option>
              {tramites.map(t => (
                <option key={t._id} value={t._id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 0 }}>
            <button
              className="btn btn-primary"
              onClick={handleBuscar}
              disabled={loading}
              style={{ width: '100%', fontWeight: 700, borderRadius: '8px', justifyContent: 'center' }}
            >
              {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              {loading ? ' Consultando...' : ' Generar Reporte'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && !loading && resumen && (
        <div ref={printRef}>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderTop: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>TOTAL TURNOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.total}</div>
                </div>
                <div style={{ background: 'rgba(37,99,235,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                  <BarChart3 size={22} style={{ color: 'var(--primary)' }} />
                </div>
              </div>
            </div>
            <div className="card" style={{ borderTop: '3px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>FINALIZADOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.finalizados}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                    {resumen.total > 0 ? Math.round(resumen.finalizados / resumen.total * 100) : 0}% completados
                  </p>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                </div>
              </div>
            </div>
            <div className="card" style={{ borderTop: '3px solid var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>CANCELADOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.cancelados}</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                  <XCircle size={22} style={{ color: 'var(--danger)' }} />
                </div>
              </div>
            </div>
            <div className="card" style={{ borderTop: '3px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>T. ESPERA PROMEDIO</p>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {formatSegundos(resumen.tiempoEsperaPromedio)}
                  </div>
                </div>
                <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                  <Clock size={22} style={{ color: 'var(--warning)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Second-level filter (local) */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por código de turno..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                style={{ paddingLeft: '2.25rem', borderRadius: '8px' }}
              />
            </div>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              style={{ borderRadius: '8px', height: '38px', minWidth: '170px', border: '1px solid var(--border)', padding: '0 0.75rem', fontSize: '0.875rem' }}
            >
              <option value="">Todos los estados</option>
              <option value="ESPERA">En Espera</option>
              <option value="ATENDIENDO">Atendiendo</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="PAUSADO">Pausado</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, gap: '0.35rem' }}>
              <FileText size={15} />
              {filteredDetalles.length} registro(s) mostrados
            </div>
          </div>

          {/* Detail Table */}
          <div className="table-container" style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Trámite</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Atendido por</th>
                  <th>Ventanilla</th>
                  <th>Fecha / Hora</th>
                  <th>T. Espera</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetalles.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <AlertTriangle size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem', display: 'block', margin: '0 auto' }} />
                      <span>No se encontraron registros con los filtros seleccionados.</span>
                    </td>
                  </tr>
                ) : (
                  filteredDetalles.map((t) => (
                    <tr key={t._id}>
                      <td>
                        <code style={{
                          background: 'rgba(37,99,235,0.1)',
                          color: 'var(--primary)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        }}>
                          {t.codigoTurno}
                        </code>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.9rem' }}>{t.tramite?.nombre || '—'}</strong>
                      </td>
                      <td>
                        <span className={`badge ${t.prioridad === 'PRIORITARIO' ? 'badge-danger' : 'badge-primary'}`}>
                          {t.prioridad}
                        </span>
                        {t.motivoPrioridad && (
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {t.motivoPrioridad}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${estadoBadge[t.estado]?.cls || 'badge-primary'}`}>
                          {estadoBadge[t.estado]?.label || t.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {t.usuarioAtencion
                          ? `${t.usuarioAtencion.nombre} ${t.usuarioAtencion.apellido}`
                          : <span style={{ fontStyle: 'italic' }}>No asignado</span>
                        }
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {t.ventanilla
                          ? <span style={{ fontWeight: 600 }}>Vent. {t.ventanilla}</span>
                          : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div>{t.fecha}</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.hora}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {formatSegundos(t.tiempoEspera)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state before search */}
      {!searched && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <CalendarRange size={52} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Genera tu primer reporte</h3>
          <p>Selecciona un rango de fechas y presiona <strong>"Generar Reporte"</strong> para ver el historial de turnos.</p>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={40} style={{ color: 'var(--primary)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: 600 }}>Consultando datos del servidor...</p>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .sidebar, .modal-overlay, button, .filter-panel { display: none !important; }
          .main-content { padding: 0 !important; }
          body { background: white; }
          .card { box-shadow: none; border: 1px solid #e2e8f0; }
          @keyframes spin { to { transform: rotate(360deg); } }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Reportes;
