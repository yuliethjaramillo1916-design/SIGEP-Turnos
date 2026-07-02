import { useState, useEffect } from 'react';
import { Ticket, Heart, Printer, Clock, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import DarkSelect from '../components/DarkSelect';

/* ── Helpers de fecha ── */
const HOY_ISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const normFecha = (t) => {
  if (t.createdAt) {
    const d = new Date(t.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  if (t.fecha && /^\d{4}-\d{2}-\d{2}/.test(t.fecha)) return t.fecha.slice(0,10);
  return '';
};

const CrearTicket = () => {
  const [tramites, setTramites]       = useState([]);
  const [newTurno, setNewTurno]       = useState({ tramite: '', nombreOtro: '', prioridad: 'NORMAL', motivoPrioridad: '' });
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [ticketsHoy, setTicketsHoy]   = useState([]);

  /* Cargar trámites y tickets de hoy desde el backend */
  useEffect(() => {
    api.get('/tramites')
      .then(res => setTramites(res.data?.filter(t => t.estado) || []))
      .catch(() => {});

    fetchTicketsHoy();
  }, []);

  const fetchTicketsHoy = async () => {
    try {
      const res = await api.get('/turnos');
      const hoy = HOY_ISO();
      const deHoy = (res.data || []).filter(t => normFecha(t) === hoy);
      // Ordenar más reciente primero
      deHoy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTicketsHoy(deHoy.map(t => ({
        id: t._id,
        codigo: t.codigoTurno,
        tramite: t.tramite?.nombre || '—',
        prioridad: t.prioridad,
        hora: t.hora,
      })));
    } catch {}
  };

  const tramiteOpts = [
    ...tramites.map(t => ({ value: t._id, label: t.nombre })),
    { value: 'OTRO', label: 'Otro Trámite (Diligenciar...)' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTurno.tramite) return alert('Por favor, seleccione un trámite');
    if (newTurno.tramite === 'OTRO' && !newTurno.nombreOtro?.trim())
      return alert('Por favor, especifique el nombre del trámite');
    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        tramite: newTurno.tramite,
        nombreTramitePersonalizado: newTurno.tramite === 'OTRO' ? newTurno.nombreOtro : null,
        prioridad: newTurno.prioridad,
        motivoPrioridad: newTurno.prioridad === 'PRIORITARIO' ? newTurno.motivoPrioridad : null
      };
      const res = await api.post('/turnos', payload);
      const ticket = res.data;

      // Recargar lista completa del día desde el backend
      await fetchTicketsHoy();

      setGeneratedTicket(ticket);
      setShowTicketModal(true);
      setNewTurno({ tramite: '', nombreOtro: '', prioridad: 'NORMAL', motivoPrioridad: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al generar turno. Intente nuevamente.';
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 6000);
    } finally {
      setLoading(false);
    }
  };

  const printTicket = () => {
    const printContent = document.getElementById('ticket-print-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write(`<html><head><title>Ticket</title><style>
      body{font-family:'Courier New',monospace;padding:20px;width:280px;margin:0 auto;text-align:center;color:#000;}
      .header{font-size:18px;font-weight:bold;margin-bottom:10px;border-bottom:1px dashed #000;padding-bottom:10px;}
      .ticket-code{font-size:44px;font-weight:bold;margin:15px 0;}
      .details{font-size:12px;text-align:left;margin-bottom:15px;}
      .footer{border-top:1px dashed #000;padding-top:10px;font-size:10px;margin-top:15px;}
    </style></head><body>${printContent}<script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", paddingBottom: '2rem' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Crear Ticket
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Emite un nuevo ticket de atención para el ciudadano.
        </p>
      </div>

      {/* Layout: formulario izquierda + lista derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }} className="crear-ticket-grid">

        {/* ── Formulario ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={20} style={{ color: '#a78bfa' }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Emitir Nuevo Ticket</h3>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Trámite */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.5rem' }}>
                Seleccionar Trámite
              </label>
              <DarkSelect
                value={newTurno.tramite}
                onChange={(val) => setNewTurno({ ...newTurno, tramite: val, nombreOtro: '' })}
                options={tramiteOpts}
                placeholder="Seleccione el trámite..."
                height="44px"
                style={{ width: '100%' }}
              />
            </div>

            {/* Trámite personalizado */}
            {newTurno.tramite === 'OTRO' && (
              <div className="form-group" style={{ marginBottom: '1.5rem', animation: 'slideDown 0.25s ease-out' }}>
                <label style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Especificar Trámite</label>
                <input type="text" required
                  placeholder="¿Por qué trámite viene el usuario?"
                  value={newTurno.nombreOtro || ''}
                  onChange={(e) => setNewTurno({ ...newTurno, nombreOtro: e.target.value })}
                  style={{ marginTop: '0.5rem', height: '44px', borderRadius: '8px' }}
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
                    flex: 1, padding: '0.85rem', borderRadius: '10px', border: '2px solid',
                    borderColor: newTurno.prioridad === 'NORMAL' ? '#a78bfa' : 'rgba(255,255,255,0.08)',
                    background: newTurno.prioridad === 'NORMAL' ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                    color: newTurno.prioridad === 'NORMAL' ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >Atención Normal</button>
                <button type="button"
                  onClick={() => setNewTurno({ ...newTurno, prioridad: 'PRIORITARIO', motivoPrioridad: 'Adulto Mayor' })}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: '10px', border: '2px solid',
                    borderColor: newTurno.prioridad === 'PRIORITARIO' ? '#fbbf24' : 'rgba(255,255,255,0.08)',
                    background: newTurno.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)',
                    color: newTurno.prioridad === 'PRIORITARIO' ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                  }}
                >⭐ Preferencial</button>
              </div>
            </div>

            {/* Motivo preferencial */}
            {newTurno.prioridad === 'PRIORITARIO' && (
              <div className="form-group" style={{
                marginBottom: '1.5rem', background: 'rgba(251,191,36,0.07)',
                padding: '1rem', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.18)',
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
                        padding: '0.6rem', borderRadius: '8px', border: '1px solid',
                        borderColor: newTurno.motivoPrioridad === motivo ? '#fbbf24' : 'rgba(251,191,36,0.18)',
                        background: newTurno.motivoPrioridad === motivo ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.03)',
                        color: newTurno.motivoPrioridad === motivo ? '#fde047' : 'rgba(255,255,255,0.45)',
                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                      }}
                    >{motivo}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div style={{
                marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171', fontSize: '0.875rem', fontWeight: 600,
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              }}>
                <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠</span>{errorMsg}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', height: '48px', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', justifyContent: 'center' }}
            >
              {loading
                ? <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : <><Ticket size={18} /> Generar Ticket</>
              }
            </button>
          </form>
        </div>

        {/* ── Panel lateral: tickets del día ── */}
        <div className="card" style={{ border: '1px solid rgba(124,58,237,0.2)', maxHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} style={{ color: '#34d399' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Tickets de Hoy</h3>
            </div>
            {ticketsHoy.length > 0 && (
              <span style={{
                background: 'rgba(124,58,237,0.2)', color: '#c4b5fd',
                border: '1px solid rgba(124,58,237,0.35)',
                padding: '0.1rem 0.55rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 700,
              }}>{ticketsHoy.length}</span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {ticketsHoy.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', gap: '0.5rem' }}>
                <Ticket size={32} />
                <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>Sin tickets emitidos hoy</span>
              </div>
            ) : (
              ticketsHoy.map((t, i) => (
                <div key={t.id || i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem', borderRadius: '10px',
                  background: t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)'}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                      {t.codigo}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
                      {t.tramite}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    {t.prioridad === 'PRIORITARIO' && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24' }}>⭐ PREF.</span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                      <Clock size={11} />{t.hora}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {ticketsHoy.length > 0 && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                Se borra automáticamente al cambiar de día
              </p>
            </div>
          )}
        </div>

      </div>{/* fin grid */}

      {/* Modal Ticket */}
      {showTicketModal && generatedTicket && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="modal-content" style={{ maxWidth: '380px', padding: '1.5rem', borderRadius: '16px' }}>
            <div id="ticket-print-content" style={{
              background: '#f8fafc', border: '2px solid #cbd5e1',
              padding: '2rem 1.5rem', borderRadius: '10px',
              fontFamily: "'Courier New', Courier, monospace",
              textAlign: 'center', color: '#0f172a',
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
                <div><strong>Hora:</strong> {generatedTicket.hora}</div>
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .crear-ticket-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default CrearTicket;
