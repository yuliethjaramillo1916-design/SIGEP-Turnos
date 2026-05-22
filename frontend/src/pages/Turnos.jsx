import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Printer, Ticket, CheckCircle, Clock, Heart, AlertCircle } from 'lucide-react';
import api from '../services/api';

const Turnos = () => {
  const [turnos, setTurnos] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Búsqueda y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Estado para creación de nuevo turno
  const [newTurno, setNewTurno] = useState({
    tramite: '',
    nombreOtro: '',
    prioridad: 'NORMAL',
    motivoPrioridad: ''
  });

  // Estado para el modal de Ticket térmico
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000); // Poll every 6 seconds to update list
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [turnosRes, tramitesRes] = await Promise.all([
        api.get('/turnos'),
        api.get('/tramites')
      ]);
      setTurnos(turnosRes.data || []);
      setTramites(tramitesRes.data?.filter(t => t.estado) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleCreateTurno = async (e) => {
    e.preventDefault();
    if (!newTurno.tramite) return alert('Por favor, seleccione un trámite');
    if (newTurno.tramite === 'OTRO' && (!newTurno.nombreOtro || !newTurno.nombreOtro.trim())) {
      return alert('Por favor, especifique el nombre del trámite');
    }
    
    try {
      const payload = {
        tramite: newTurno.tramite,
        nombreTramitePersonalizado: newTurno.tramite === 'OTRO' ? newTurno.nombreOtro : null,
        prioridad: newTurno.prioridad,
        motivoPrioridad: newTurno.prioridad === 'PRIORITARIO' ? newTurno.motivoPrioridad : null
      };

      const res = await api.post('/turnos', payload);
      
      // Mostrar ticket físico generado
      setGeneratedTicket(res.data);
      setShowTicketModal(true);

      // Reiniciar formulario
      setNewTurno({
        tramite: '',
        nombreOtro: '',
        prioridad: 'NORMAL',
        motivoPrioridad: ''
      });

      fetchData();
    } catch (error) {
      alert('Error al generar turno. Intente nuevamente.');
    }
  };

  const printTicket = () => {
    const printContent = document.getElementById('thermal-ticket-content').innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Crear una ventana o div temporal para impresión limpia
    const printWindow = window.open('', '', 'height=600,width=400');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Ticket</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              width: 280px;
              margin: 0 auto;
              text-align: center;
              color: #000;
            }
            .header {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .ticket-code {
              font-size: 44px;
              font-weight: bold;
              margin: 15px 0;
            }
            .details {
              font-size: 12px;
              text-align: left;
              margin-bottom: 15px;
            }
            .footer {
              border-top: 1px dashed #000;
              padding-top: 10px;
              font-size: 10px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filtrado de turnos en base a los criterios
  const filteredTurnos = turnos.filter(t => {
    const matchesSearch = t.codigoTurno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.tramite?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? t.estado === statusFilter : true;
    const matchesPriority = priorityFilter ? t.prioridad === priorityFilter : true;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Cabecera */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Dispensador y Gestión de Turnos
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Emisión de tickets de atención e historial general de turnos.
        </p>
      </div>

      {/* Diseño Principal: Dispensador Izquierda vs Tabla Derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }} className="turnos-layout">
        
        {/* Lado Izquierdo: Dispensador Corporativo */}
        <div className="card" style={{ border: '1px solid var(--border)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Ticket size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Emitir Nuevo Ticket</h3>
          </div>

          <form onSubmit={handleCreateTurno}>
            {/* Trámite */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontWeight: 600, color: '#475569' }}>Seleccionar Trámite</label>
              <select 
                required 
                value={newTurno.tramite} 
                onChange={(e) => setNewTurno({...newTurno, tramite: e.target.value, nombreOtro: ''})}
                style={{ marginTop: '0.5rem', height: '42px', borderRadius: '8px' }}
              >
                <option value="">Seleccione el trámite...</option>
                {tramites.map(t => (
                  <option key={t._id} value={t._id}>{t.nombre}</option>
                ))}
                <option value="OTRO">Otro Trámite (Diligenciar...)</option>
              </select>
            </div>

            {/* Trámite Personalizado (Si selecciona "OTRO") */}
            {newTurno.tramite === 'OTRO' && (
              <div className="form-group" style={{ 
                marginBottom: '1.25rem',
                animation: 'slideDown 0.25s ease-out'
              }}>
                <label style={{ fontWeight: 600, color: '#475569' }}>Especificar Trámite</label>
                <input 
                  type="text" 
                  required 
                  placeholder="¿Por qué trámite viene el usuario?"
                  value={newTurno.nombreOtro || ''}
                  onChange={(e) => setNewTurno({...newTurno, nombreOtro: e.target.value})}
                  style={{ marginTop: '0.5rem', height: '42px', borderRadius: '8px' }}
                />
              </div>
            )}

            {/* Clasificación de Prioridad */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: '#475569', marginBottom: '0.75rem', display: 'block' }}>
                Clasificación del Usuario
              </label>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {/* Normal */}
                <button
                  type="button"
                  onClick={() => setNewTurno({...newTurno, prioridad: 'NORMAL', motivoPrioridad: ''})}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: newTurno.prioridad === 'NORMAL' ? 'var(--primary)' : 'var(--border)',
                    background: newTurno.prioridad === 'NORMAL' ? '#eff6ff' : 'white',
                    color: newTurno.prioridad === 'NORMAL' ? 'var(--primary)' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Atención Normal
                </button>

                {/* Prioritario */}
                <button
                  type="button"
                  onClick={() => setNewTurno({...newTurno, prioridad: 'PRIORITARIO', motivoPrioridad: 'Adulto Mayor'})}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: newTurno.prioridad === 'PRIORITARIO' ? '#d97706' : 'var(--border)',
                    background: newTurno.prioridad === 'PRIORITARIO' ? '#fffbeb' : 'white',
                    color: newTurno.prioridad === 'PRIORITARIO' ? '#b45309' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ⭐ Preferencial
                </button>
              </div>
            </div>

            {/* Selector de Motivo Preferencial (Si es PRIORITARIO) */}
            {newTurno.prioridad === 'PRIORITARIO' && (
              <div className="form-group" style={{ 
                marginBottom: '1.5rem', 
                background: '#fffbeb', 
                padding: '1rem', 
                borderRadius: '10px',
                border: '1px solid #fef3c7',
                animation: 'slideDown 0.25s ease-out'
              }}>
                <label style={{ fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <Heart size={16} /> Condición Especial
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {['Adulto Mayor', 'Embarazo', 'Discapacidad', 'Urgencias'].map(motivo => (
                    <button
                      key={motivo}
                      type="button"
                      onClick={() => setNewTurno({...newTurno, motivoPrioridad: motivo})}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: newTurno.motivoPrioridad === motivo ? '#b45309' : '#fcd34d',
                        background: newTurno.motivoPrioridad === motivo ? '#f59e0b' : 'white',
                        color: newTurno.motivoPrioridad === motivo ? 'white' : '#78350f',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', height: '45px', borderRadius: '10px', display: 'flex', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}
            >
              Generar Ticket
            </button>
          </form>
        </div>

        {/* Lado Derecho: Tabla Histórica de Turnos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Barra de Filtros */}
          <div className="card" style={{ border: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Buscador */}
              <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por código o trámite..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem', height: '40px', borderRadius: '8px' }} 
                />
              </div>

              {/* Filtro Estado */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '150px', height: '40px', borderRadius: '8px' }}
              >
                <option value="">Todos los Estados</option>
                <option value="ESPERA">ESPERA</option>
                <option value="ATENDIENDO">ATENDIENDO</option>
                <option value="FINALIZADO">FINALIZADO</option>
                <option value="PAUSADO">PAUSADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>

              {/* Filtro Prioridad */}
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ width: '150px', height: '40px', borderRadius: '8px' }}
              >
                <option value="">Clasificación</option>
                <option value="NORMAL">NORMAL</option>
                <option value="PRIORITARIO">PRIORITARIO</option>
              </select>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="table-container" style={{ border: '1px solid var(--border)' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Trámite</th>
                  <th>Clasificación</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th>Emisión</th>
                  <th>Espera</th>
                </tr>
              </thead>
              <tbody>
                {filteredTurnos.length > 0 ? (
                  filteredTurnos.map((turno) => (
                    <tr key={turno._id}>
                      <td><strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>{turno.codigoTurno}</strong></td>
                      <td>{turno.tramite?.nombre || 'N/A'}</td>
                      <td>
                        <span className={`badge ${turno.prioridad === 'PRIORITARIO' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                          {turno.prioridad}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {turno.motivoPrioridad || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          turno.estado === 'ESPERA' ? 'badge-warning' : 
                          turno.estado === 'ATENDIENDO' ? 'badge-primary' : 
                          turno.estado === 'FINALIZADO' ? 'badge-success' : 'badge-danger'
                        }`}>
                          {turno.estado}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{turno.hora}</td>
                      <td>
                        <strong style={{ fontSize: '0.8rem' }}>
                          {turno.estado === 'ESPERA' ? (
                            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Clock size={12} /> En cola
                            </span>
                          ) : (
                            `${Math.floor(turno.tiempoEspera / 60)} min`
                          )}
                        </strong>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                      <AlertCircle size={32} style={{ margin: '0 auto 0.5rem', color: 'var(--text-muted)' }} />
                      No se encontraron turnos emitidos hoy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Modal del Ticket Térmico Imprimible */}
      {showTicketModal && generatedTicket && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.7)' }}>
          <div className="modal-content" style={{ maxWidth: '380px', padding: '1.5rem', borderRadius: '16px' }}>
            
            {/* Vista Previa del Ticket Físico */}
            <div id="thermal-ticket-content" style={{ 
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              padding: '2rem 1.5rem',
              borderRadius: '10px',
              fontFamily: "'Courier New', Courier, monospace",
              textAlign: 'center',
              color: '#0f172a',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
            }}>
              <div className="header" style={{ borderBottom: '2px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>SIGEP-TURNOS</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Servicio Gubernamental</span>
              </div>

              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Turno de Atención</span>
              
              <div className="ticket-code" style={{ fontSize: '3.5rem', fontWeight: 900, margin: '0.5rem 0', color: 'var(--primary)' }}>
                {generatedTicket.codigoTurno}
              </div>

              <div className="details" style={{ textAlign: 'left', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '2px dashed #94a3b8', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <div><strong>Trámite:</strong> {generatedTicket.tramite?.nombre}</div>
                <div><strong>Clase:</strong> {generatedTicket.prioridad}</div>
                {generatedTicket.prioridad === 'PRIORITARIO' && (
                  <div><strong>Motivo:</strong> {generatedTicket.motivoPrioridad}</div>
                )}
                <div><strong>Fecha:</strong> {generatedTicket.fecha}</div>
                <div><strong>Hora Emisión:</strong> {generatedTicket.hora}</div>
              </div>

              <div className="footer" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                <span>Por favor espere su llamado en la pantalla pública.</span>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowTicketModal(false)}>
                Cerrar
              </button>
              <button className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }} onClick={printTicket}>
                <Printer size={18} /> Imprimir
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .turnos-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Turnos;
