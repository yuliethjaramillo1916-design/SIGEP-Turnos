import { useState, useEffect, useRef } from 'react';
import { Search, Printer, Ticket, Clock, Heart, AlertCircle, Check, Calendar, Trash2 } from 'lucide-react';
import api from '../services/api';
import DarkSelect from '../components/DarkSelect';
import { useAuth } from '../context/AuthContext';

/* ─── Opciones de los selects ───────────────────────── */
const ESTADO_OPTS = [
  { value: '', label: 'Todos los Estados' },
  { value: 'ESPERA', label: 'ESPERA' },
  { value: 'ATENDIENDO', label: 'ATENDIENDO' },
  { value: 'FINALIZADO', label: 'FINALIZADO' },
  { value: 'PAUSADO', label: 'PAUSADO' },
  { value: 'CANCELADO', label: 'CANCELADO' },
];

const PRIORIDAD_OPTS = [
  { value: '', label: 'Clasificación' },
  { value: 'NORMAL', label: 'NORMAL' },
  { value: 'PRIORITARIO', label: 'PRIORITARIO' },
];

/* ─── Helpers ───────────────────────────────────────── */
const hoy = () => new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

// Normaliza cualquier formato de fecha a "YYYY-MM-DD" en hora local Colombia
const normalizarFecha = (turno) => {
  // Fuentes candidatas en orden de prioridad
  const fuentes = [turno.fecha, turno.createdAt].filter(Boolean);

  for (const f of fuentes) {
    // 1. Ya es YYYY-MM-DD (o empieza con eso)
    if (/^\d{4}-\d{2}-\d{2}/.test(String(f))) {
      return String(f).slice(0, 10);
    }
    // 2. DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(f))) {
      const [dd, mm, yyyy] = String(f).split('/');
      return `${yyyy}-${mm}-${dd}`;
    }
    // 3. Cualquier otro string (ej: "Fri May 08 2026 13:30:01 GMT-0500...")
    const parsed = new Date(f);
    if (!isNaN(parsed.getTime())) {
      // Usar hora local (Colombia = UTC-5), ajustando manualmente
      const local = new Date(parsed.getTime() - (5 * 60 * 60 * 1000));
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return '';
};

const formatearFechaLabel = (fechaISO) => {
  if (!fechaISO) return 'Sin fecha';
  const [y, m, d] = fechaISO.split('-');
  const todayISO = hoy();
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (fechaISO === todayISO) return `Hoy — ${d}/${m}/${y}`;
  if (fechaISO === yesterdayISO) return `Ayer — ${d}/${m}/${y}`;
  return `${d}/${m}/${y}`;
};

/* ─── Componente principal ──────────────────────────── */
const Turnos = () => {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');   // '' = todas las fechas

  const [newTurno, setNewTurno] = useState({
    tramite: '', nombreOtro: '', prioridad: 'NORMAL', motivoPrioridad: ''
  });

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);

  const fetchData = async () => {
    try {
      const [turnosRes, tramitesRes] = await Promise.all([
        api.get('/turnos'), api.get('/tramites')
      ]);
      setTurnos(turnosRes.data || []);
      setTramites(tramitesRes.data?.filter(t => t.estado) || []);
      setLoading(false);
    } catch (error) { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTurno = async (e) => {
    e.preventDefault();
    if (!newTurno.tramite) return alert('Por favor, seleccione un trámite');
    if (newTurno.tramite === 'OTRO' && !newTurno.nombreOtro?.trim())
      return alert('Por favor, especifique el nombre del trámite');
    try {
      const payload = {
        tramite: newTurno.tramite,
        nombreTramitePersonalizado: newTurno.tramite === 'OTRO' ? newTurno.nombreOtro : null,
        prioridad: newTurno.prioridad,
        motivoPrioridad: newTurno.prioridad === 'PRIORITARIO' ? newTurno.motivoPrioridad : null
      };
      const res = await api.post('/turnos', payload);
      setGeneratedTicket(res.data);
      setShowTicketModal(true);
      setNewTurno({ tramite: '', nombreOtro: '', prioridad: 'NORMAL', motivoPrioridad: '' });
      fetchData();
    } catch { alert('Error al generar turno. Intente nuevamente.'); }
  };

  const printTicket = () => {
    const printContent = document.getElementById('thermal-ticket-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write(`<html><head><title>Imprimir Ticket</title><style>
      body{font-family:'Courier New',monospace;padding:20px;width:280px;margin:0 auto;text-align:center;color:#000;}
      .header{font-size:18px;font-weight:bold;margin-bottom:10px;border-bottom:1px dashed #000;padding-bottom:10px;}
      .ticket-code{font-size:44px;font-weight:bold;margin:15px 0;}
      .details{font-size:12px;text-align:left;margin-bottom:15px;}
      .footer{border-top:1px dashed #000;padding-top:10px;font-size:10px;margin-top:15px;}
    </style></head><body>${printContent}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    printWindow.document.close();
  };

  const tramiteOpts = [
    { value: '', label: 'Seleccione el trámite...' },
    ...tramites.map(t => ({ value: t._id, label: t.nombre })),
    { value: 'OTRO', label: 'Otro Trámite (Diligenciar...)' },
  ];

  // Filtrado base
  const filteredTurnos = turnos.filter(t => {
    const matchesSearch = t.codigoTurno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tramite?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus   = statusFilter   ? t.estado    === statusFilter   : true;
    const matchesPriority = priorityFilter ? t.prioridad === priorityFilter : true;
    const matchesDate     = dateFilter     ? normalizarFecha(t) === dateFilter : true;
    return matchesSearch && matchesStatus && matchesPriority && matchesDate;
  });

  // Opciones de fecha para el selector (fechas únicas ordenadas desc)
  const fechasUnicas = [...new Set(turnos.map(t => normalizarFecha(t)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a));
  const FECHA_OPTS = [
    { value: '', label: 'Todas las fechas' },
    ...fechasUnicas.map(f => ({ value: f, label: formatearFechaLabel(f) })),
  ];

  // Agrupar por fecha (desc)
  const gruposPorFecha = filteredTurnos.reduce((acc, t) => {
    const fecha = normalizarFecha(t);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(t);
    return acc;
  }, {});
  const fechasOrdenadas = Object.keys(gruposPorFecha).sort((a, b) => b.localeCompare(a));

  // Eliminar todos los turnos de una fecha (solo ADMINISTRADOR)
  const handleEliminarPorFecha = async (fecha) => {
    const label = formatearFechaLabel(fecha);
    if (!confirm(`¿Eliminar TODOS los turnos de "${label}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/turnos/por-fecha/${fecha}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar los turnos');
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Dispensador y Gestión de Turnos
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Emisión de tickets de atención e historial general de turnos.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="turnos-layout">

        {/* ── Dispensador — oculto para ADMINISTRADOR y VIGILANTE ── */}
        {user?.rol !== 'VIGILANTE' && user?.rol !== 'ADMINISTRADOR' && (
          <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Ticket size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Emitir Nuevo Ticket</h3>
          </div>

          <form onSubmit={handleCreateTurno}>
            {/* Select Trámite — usa DarkSelect con portal */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.5rem' }}>
                Seleccionar Trámite
              </label>
              <DarkSelect
                value={newTurno.tramite}
                onChange={(val) => setNewTurno({ ...newTurno, tramite: val, nombreOtro: '' })}
                options={tramiteOpts.filter(o => o.value !== '')}
                placeholder="Seleccione el trámite..."
                height="42px"
                style={{ width: '100%' }}
              />
            </div>

            {/* Trámite personalizado */}
            {newTurno.tramite === 'OTRO' && (
              <div className="form-group" style={{ marginBottom: '1.25rem', animation: 'slideDown 0.25s ease-out' }}>
                <label style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Especificar Trámite</label>
                <input
                  type="text" required
                  placeholder="¿Por qué trámite viene el usuario?"
                  value={newTurno.nombreOtro || ''}
                  onChange={(e) => setNewTurno({ ...newTurno, nombreOtro: e.target.value })}
                  style={{ marginTop: '0.5rem', height: '42px', borderRadius: '8px' }}
                />
              </div>
            )}

            {/* Clasificación */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem', display: 'block' }}>
                Clasificación del Usuario
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button"
                  onClick={() => setNewTurno({ ...newTurno, prioridad: 'NORMAL', motivoPrioridad: '' })}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px', border: '2px solid',
                    borderColor: newTurno.prioridad === 'NORMAL' ? '#a78bfa' : 'rgba(255,255,255,0.08)',
                    background: newTurno.prioridad === 'NORMAL' ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                    color: newTurno.prioridad === 'NORMAL' ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >Atención Normal</button>

                <button type="button"
                  onClick={() => setNewTurno({ ...newTurno, prioridad: 'PRIORITARIO', motivoPrioridad: 'Adulto Mayor' })}
                  style={{
                    flex: 1, padding: '0.75rem', borderRadius: '10px', border: '2px solid',
                    borderColor: newTurno.prioridad === 'PRIORITARIO' ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                    background: newTurno.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)',
                    color: newTurno.prioridad === 'PRIORITARIO' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >⭐ Preferencial</button>
              </div>
            </div>

            {/* Motivo preferencial */}
            {newTurno.prioridad === 'PRIORITARIO' && (
              <div className="form-group" style={{
                marginBottom: '1.5rem',
                background: 'rgba(251,191,36,0.07)',
                padding: '1rem', borderRadius: '10px',
                border: '1px solid rgba(251,191,36,0.18)',
                animation: 'slideDown 0.25s ease-out'
              }}>
                <label style={{ fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <Heart size={16} /> Condición Especial
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {['Adulto Mayor', 'Embarazo', 'Discapacidad', 'Urgencias'].map(motivo => (
                    <button key={motivo} type="button"
                      onClick={() => setNewTurno({ ...newTurno, motivoPrioridad: motivo })}
                      style={{
                        padding: '0.5rem', borderRadius: '8px', border: '1px solid',
                        borderColor: newTurno.motivoPrioridad === motivo ? '#fbbf24' : 'rgba(251,191,36,0.18)',
                        background: newTurno.motivoPrioridad === motivo ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.03)',
                        color: newTurno.motivoPrioridad === motivo ? '#fde047' : 'rgba(255,255,255,0.45)',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >{motivo}</button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', height: '45px', borderRadius: '10px', display: 'flex', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}
            >
              Generar Ticket
            </button>
          </form>
        </div>
        )}

        {/* ── Tabla ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Filtros */}
          <div className="card" style={{ padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text" placeholder="Buscar por código o trámite..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem', height: '40px', borderRadius: '8px' }}
                />
              </div>
              <DarkSelect value={dateFilter}     onChange={setDateFilter}     options={FECHA_OPTS}    placeholder="Todas las fechas" style={{ width: '175px', flexShrink: 0 }} height="40px" />
              <DarkSelect value={statusFilter}   onChange={setStatusFilter}   options={ESTADO_OPTS}   placeholder="Todos los Estados" style={{ width: '160px', flexShrink: 0 }} height="40px" />
              <DarkSelect value={priorityFilter} onChange={setPriorityFilter} options={PRIORIDAD_OPTS} placeholder="Clasificación" style={{ width: '150px', flexShrink: 0 }} height="40px" />
            </div>
          </div>

          {/* Tabla agrupada por fecha */}
          {fechasOrdenadas.length === 0 ? (
            <div className="table-container">
              <table><tbody>
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 0.5rem', color: 'rgba(255,255,255,0.15)' }} />
                    No se encontraron turnos.
                  </td>
                </tr>
              </tbody></table>
            </div>
          ) : (
            fechasOrdenadas.map(fecha => (
              <div key={fecha}>
                {/* ── Separador de fecha ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '0.75rem', marginTop: '0.25rem',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: fecha === hoy() ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${fecha === hoy() ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '20px', padding: '0.3rem 0.9rem',
                    fontSize: '0.8rem', fontWeight: 700,
                    color: fecha === hoy() ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                  }}>
                    <Calendar size={13} />
                    {formatearFechaLabel(fecha)}
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {gruposPorFecha[fecha].length} turno{gruposPorFecha[fecha].length !== 1 ? 's' : ''}
                  </span>
                  {/* Botón eliminar — solo ADMINISTRADOR */}
                  {user?.rol === 'ADMINISTRADOR' && (
                    <button
                      onClick={() => handleEliminarPorFecha(fecha)}
                      title={`Eliminar todos los turnos de ${formatearFechaLabel(fecha)}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.25rem 0.7rem', borderRadius: '20px',
                        background: 'rgba(248,113,113,0.1)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        color: '#f87171', fontSize: '0.75rem', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.2)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.45)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
                    >
                      <Trash2 size={12} /> Eliminar fecha
                    </button>
                  )}
                </div>

                {/* ── Tabla del grupo ── */}
                <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th><th>Trámite</th><th>Clasificación</th>
                        <th>Motivo</th><th>Estado</th><th>Emisión</th><th>Espera</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gruposPorFecha[fecha].map((turno) => (
                        <tr key={turno._id}>
                          <td><strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{turno.codigoTurno}</strong></td>
                          <td>{turno.tramite?.nombre || 'N/A'}</td>
                          <td>
                            <span className={`badge ${turno.prioridad === 'PRIORITARIO' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                              {turno.prioridad}
                            </span>
                          </td>
                          <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{turno.motivoPrioridad || '-'}</span></td>
                          <td>
                            <span className={`badge ${
                              turno.estado === 'ESPERA'      ? 'badge-warning' :
                              turno.estado === 'ATENDIENDO'  ? 'badge-primary' :
                              turno.estado === 'FINALIZADO'  ? 'badge-success' : 'badge-danger'
                            }`}>{turno.estado}</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{turno.hora}</td>
                          <td>
                            <strong style={{ fontSize: '0.8rem' }}>
                              {turno.estado === 'ESPERA'
                                ? <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12} /> En cola</span>
                                : `${Math.floor(turno.tiempoEspera / 60)} min`
                              }
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Ticket Térmico */}
      {showTicketModal && generatedTicket && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="modal-content" style={{ maxWidth: '380px', padding: '1.5rem', borderRadius: '16px' }}>

            {/* Ticket en blanco — simulación de papel para imprimir */}
            <div id="thermal-ticket-content" style={{
              background: '#f8fafc', border: '2px solid #cbd5e1',
              padding: '2rem 1.5rem', borderRadius: '10px',
              fontFamily: "'Courier New', Courier, monospace",
              textAlign: 'center', color: '#0f172a',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ borderBottom: '2px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>SIGEP-TURNOS</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Servicio Gubernamental</span>
              </div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Turno de Atención</span>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0.5rem 0', color: '#7c3aed' }}>
                {generatedTicket.codigoTurno}
              </div>
              <div style={{ textAlign: 'left', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '2px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div><strong>Trámite:</strong> {generatedTicket.tramite?.nombre}</div>
                <div><strong>Clase:</strong> {generatedTicket.prioridad}</div>
                {generatedTicket.prioridad === 'PRIORITARIO' && <div><strong>Motivo:</strong> {generatedTicket.motivoPrioridad}</div>}
                <div><strong>Fecha:</strong> {generatedTicket.fecha}</div>
                <div><strong>Hora Emisión:</strong> {generatedTicket.hora}</div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Por favor espere su llamado en la pantalla pública.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowTicketModal(false)}>Cerrar</button>
              <button className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }} onClick={printTicket}>
                <Printer size={18} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width:900px) { .turnos-layout { grid-template-columns:1fr !important; } }
      `}</style>
    </div>
  );
};

export default Turnos;
