import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, SkipForward, Pause, RefreshCw, XCircle, Users, Monitor, AlertCircle, Info, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const Atencion = () => {
  const { user } = useAuth();
  
  // Estados de Configuración
  const [ventanilla, setVentanilla] = useState(localStorage.getItem('ventanilla') || '');
  const [isVentanillaSet, setIsVentanillaSet] = useState(!!localStorage.getItem('ventanilla'));
  const [ventanillasDisponibles, setVentanillasDisponibles] = useState([]);
  
  // Estados de Atención
  const [currentTurno, setCurrentTurno] = useState(null);
  const [espera, setEspera] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('connecting'); // connecting, connected, disconnected (polling)
  
  // Estado para modal de reasignación
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetTramite, setTargetTramite] = useState('');

  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Cargar ventanillas y trámites iniciales
  useEffect(() => {
    fetchVentanillas();
    fetchTramites();
  }, []);

  // Efecto para inicializar la conexión en tiempo real con Socket.io
  useEffect(() => {
    if (isVentanillaSet) {
      initSocket();
      fetchTurnos(); // Cargar inicial
    }

    return () => {
      // Limpieza de socket y polling
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isVentanillaSet, ventanilla]);

  const fetchVentanillas = async () => {
    try {
      const res = await api.get('/ventanillas');
      setVentanillasDisponibles(res.data || []);
    } catch (err) {
      console.error('Error fetching ventanillas:', err);
    }
  };

  const fetchTramites = async () => {
    try {
      const res = await api.get('/tramites');
      setTramites(res.data || []);
    } catch (err) {
      console.error('Error fetching tramites:', err);
    }
  };

  const initSocket = () => {
    try {
      // Conectar con el backend
      const socket = io('http://localhost:3000');
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Conectado al WebSocket del Servidor');
        setSocketStatus('connected');
        // Detener polling si estaba activo
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      });

      socket.on('disconnect', () => {
        console.warn('❌ Desconectado de WebSocket. Iniciando sondeo de respaldo...');
        setSocketStatus('disconnected');
        startPolling();
      });

      socket.on('connect_error', () => {
        console.warn('⚠️ Error de conexión WebSocket. Iniciando sondeo de respaldo...');
        setSocketStatus('disconnected');
        startPolling();
      });

      // Escuchar actualización de la fila
      socket.on('cola_actualizada', () => {
        console.log('⚡ Sincronizando colas en tiempo real...');
        fetchTurnos();
      });

    } catch (err) {
      console.error('Error al inicializar Socket.io:', err);
      setSocketStatus('disconnected');
      startPolling();
    }
  };

  // Sondeo de respaldo en caso de que Socket falle
  const startPolling = () => {
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        console.log('🔄 Polling activo (fallback)...');
        fetchTurnos();
      }, 4000);
    }
  };

  const fetchTurnos = async () => {
    try {
      const response = await api.get('/turnos');
      const allTurnos = response.data;
      
      // Fila de espera de hoy
      const hoyStr = new Date().toISOString().split('T')[0];
      const enEsperaHoy = allTurnos.filter(t => t.estado === 'ESPERA');
      setEspera(enEsperaHoy);

      // Turno activo de este operador en este momento
      const activo = allTurnos.find(t => t.estado === 'ATENDIENDO' && t.usuarioAtencion?._id === user?._id);
      const pausado = allTurnos.find(t => t.estado === 'PAUSADO' && t.usuarioAtencion?._id === user?._id);

      setCurrentTurno(activo || pausado || null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching turnos:', error);
      setLoading(false);
    }
  };

  const guardarVentanilla = (e) => {
    e.preventDefault();
    if (ventanilla.trim() === '') return;
    localStorage.setItem('ventanilla', ventanilla);
    setIsVentanillaSet(true);
  };

  const cambiarVentanillaConfig = () => {
    localStorage.removeItem('ventanilla');
    setIsVentanillaSet(false);
    setVentanilla('');
    setCurrentTurno(null);
  };

  // 1. Llamar al siguiente turno en cola
  const llamarSiguiente = async () => {
    try {
      const res = await api.post('/turnos/llamar-siguiente', { ventanilla });
      setCurrentTurno(res.data);
      fetchTurnos();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al llamar turno';
      alert(msg);
    }
  };

  // 2. Finalizar atención del turno actual
  const finalizarAtencion = async () => {
    if (!currentTurno) return;
    try {
      await api.put(`/turnos/${currentTurno._id}/finalizar`);
      setCurrentTurno(null);
      fetchTurnos();
    } catch (error) {
      alert('Error al finalizar atención');
    }
  };

  // 3. Pausar atención del turno
  const pausarAtencion = async () => {
    if (!currentTurno) return;
    try {
      const res = await api.put(`/turnos/${currentTurno._id}/pausar`);
      setCurrentTurno(res.data); // Actualizar inmediatamente sin parpadeo
      fetchTurnos();
    } catch (error) {
      alert('Error al pausar atención');
    }
  };

  // 4. Reanudar atención pausada
  const reanudarAtencion = async () => {
    if (!currentTurno) return;
    try {
      const res = await api.put(`/turnos/${currentTurno._id}/reanudar`);
      setCurrentTurno(res.data); // Actualizar inmediatamente sin parpadeo
      fetchTurnos();
    } catch (error) {
      alert('Error al reanudar atención');
    }
  };

  // 5. Cancelar turno
  const cancelarAtencion = async () => {
    if (!currentTurno) return;
    if (!confirm('¿Está seguro de que desea cancelar este turno?')) return;
    try {
      await api.put(`/turnos/${currentTurno._id}/cancelar`);
      setCurrentTurno(null);
      fetchTurnos();
    } catch (error) {
      alert('Error al cancelar el turno');
    }
  };

  // 6. Transferir o Reasignar turno
  const transferirTurno = async (e) => {
    e.preventDefault();
    if (!targetTramite) return alert('Seleccione un trámite');
    try {
      await api.put(`/turnos/${currentTurno._id}/transferir`, { nuevoTramiteId: targetTramite });
      setShowTransferModal(false);
      setTargetTramite('');
      setCurrentTurno(null);
      fetchTurnos();
    } catch (error) {
      alert('Error al transferir el turno');
    }
  };

  // Mostrar selector de ventanilla si no está configurada
  if (!isVentanillaSet) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh', fontFamily: "'Inter', sans-serif" }}>
        <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              background: '#eff6ff',
              color: 'var(--primary)',
              borderRadius: '16px',
              marginBottom: '1rem'
            }}>
              <Monitor size={28} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Configura tu Módulo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Selecciona o introduce la ventanilla física desde la cual atenderás el día de hoy.
            </p>
          </div>

          <form onSubmit={guardarVentanilla}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: '#475569' }}>Número o Nombre de Ventanilla</label>
              
              {ventanillasDisponibles.length > 0 ? (
                <select 
                  value={ventanilla}
                  onChange={(e) => setVentanilla(e.target.value)}
                  required
                  style={{ marginTop: '0.5rem', height: '45px', borderRadius: '10px' }}
                >
                  <option value="">Seleccione una ventanilla...</option>
                  {ventanillasDisponibles.map(v => (
                    <option key={v._id} value={v.nombre || `Ventanilla ${v.numero}`}>
                      {v.nombre || `Ventanilla ${v.numero}`}
                    </option>
                  ))}
                  <option value="Ventanilla Personalizada">Ventanilla Personalizada (Escribir)...</option>
                </select>
              ) : null}

              {ventanillasDisponibles.length === 0 || ventanilla === 'Ventanilla Personalizada' ? (
                <input 
                  type="text" 
                  placeholder="Ej: Ventanilla 1, Módulo A..." 
                  value={ventanilla === 'Ventanilla Personalizada' ? '' : ventanilla} 
                  onChange={(e) => setVentanilla(e.target.value)}
                  required
                  style={{ marginTop: '0.5rem', height: '45px', borderRadius: '10px' }}
                />
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '45px', borderRadius: '10px', display: 'flex', justifyContent: 'center', fontWeight: 700 }}>
              Iniciar Atención
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Cabecera del Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Módulo de Atención
            </h1>
            <span style={{ 
              background: socketStatus === 'connected' ? '#dcfce7' : '#fee2e2', 
              color: socketStatus === 'connected' ? '#166534' : '#991b1b',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: socketStatus === 'connected' ? '#22c55e' : '#ef4444',
                display: 'inline-block' 
              }}></span>
              {socketStatus === 'connected' ? 'Tiempo Real' : 'Sondeo Fallback'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Gestiona la llamada y flujo de atención para <strong>{ventanilla}</strong>.
          </p>
        </div>

        <button onClick={cambiarVentanillaConfig} className="btn btn-outline" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          <RefreshCw size={16} /> Cambiar Ventanilla
        </button>
      </div>

      {/* Grid Principal: Turno Activo vs Cola */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }} className="operator-grid">
        
        {/* Lado Izquierdo: Consola del Turno en Atención */}
        <div className="card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '450px', 
          padding: '3rem', 
          border: '1px solid var(--border)',
          textAlign: 'center',
          position: 'relative'
        }}>
          {currentTurno ? (
            <>
              {/* Prioridad en Banner Superior */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px'
              }}>
                <span className={`badge ${currentTurno.prioridad === 'PRIORITARIO' ? 'badge-danger' : 'badge-primary'}`} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', fontWeight: 700 }}>
                  {currentTurno.prioridad === 'PRIORITARIO' ? `PRIORITARIO (${currentTurno.motivoPrioridad})` : 'NORMAL'}
                </span>
              </div>

              <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600 }}>
                {currentTurno.estado === 'PAUSADO' ? '🟡 EN PAUSA' : '🟢 ATENDIENDO AHORA'}
              </span>

              {/* Código Gigante */}
              <h2 style={{ 
                fontSize: '6.5rem', 
                fontWeight: 900, 
                color: 'var(--primary)', 
                margin: '1rem 0',
                letterSpacing: '-0.04em',
                lineHeight: 1
              }}>
                {currentTurno.codigoTurno}
              </h2>

              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                {currentTurno.tramite?.nombre}
              </p>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Llamado a las {currentTurno.hora} • Espera de: <strong>{Math.floor(currentTurno.tiempoEspera / 60)} min</strong>
              </p>

              {/* Acciones del Operador */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={finalizarAtencion} style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', borderRadius: '12px' }}>
                  <CheckCircle size={20} /> Finalizar Atención
                </button>

                {currentTurno.estado === 'ATENDIENDO' ? (
                  <button className="btn btn-outline" onClick={pausarAtencion} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#d97706', borderColor: '#fef3c7', background: '#fffbeb' }}>
                    <Pause size={20} /> Pausar
                  </button>
                ) : (
                  <button className="btn btn-outline" onClick={reanudarAtencion} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#16a34a', borderColor: '#dcfce7', background: '#f0fdf4' }}>
                    <Play size={20} /> Reanudar
                  </button>
                )}

                <button className="btn btn-outline" onClick={() => setShowTransferModal(true)} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: 'var(--primary)', borderColor: '#dbeafe', background: '#f0f9ff' }}>
                  <RefreshCw size={20} /> Reasignar Trámite
                </button>

                {user?.rol === 'ADMINISTRADOR' && (
                  <button className="btn btn-outline" onClick={cancelarAtencion} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}>
                    <XCircle size={20} /> Cancelar Turno
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: '#f8fafc',
                border: '2px dashed var(--border)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                marginBottom: '1.5rem'
              }}>
                <Monitor size={36} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Módulo en Espera</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 2rem', maxWidth: '340px', fontSize: '0.9rem' }}>
                Actualmente no tienes ningún turno asignado en ventanilla. Llama al siguiente en cola.
              </p>
              
              <button 
                className="btn btn-primary" 
                onClick={llamarSiguiente}
                disabled={espera.length === 0}
                style={{ 
                  padding: '1rem 2.5rem', 
                  fontSize: '1.1rem', 
                  borderRadius: '14px',
                  boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                  opacity: espera.length === 0 ? 0.6 : 1,
                  cursor: espera.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <Play size={22} /> Llamar Siguiente Turno
              </button>
            </div>
          )}
        </div>

        {/* Lado Derecho: Fila de Espera de Hoy */}
        <div className="card" style={{ border: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '450px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Fila de Espera ({espera.length})</h3>
            </div>
          </div>

          {/* Cola Scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {espera.length > 0 ? (
              espera.map((t) => (
                <div 
                  key={t._id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '0.85rem 1rem', 
                    background: t.prioridad === 'PRIORITARIO' ? '#fffbeb' : '#f8fafc', 
                    borderRadius: '10px', 
                    border: '1px solid',
                    borderColor: t.prioridad === 'PRIORITARIO' ? '#fef3c7' : 'var(--border)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{t.codigoTurno}</strong>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      color: t.prioridad === 'PRIORITARIO' ? '#854d0e' : 'var(--secondary)' 
                    }}>
                      {t.prioridad === 'PRIORITARIO' ? `⭐ PRIORITARIO` : 'NORMAL'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.tramite?.nombre}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hora: {t.hora}</span>
                  </div>
                  {t.prioridad === 'PRIORITARIO' && (
                    <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Info size={12} /> Motivo: {t.motivoPrioridad}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>No hay turnos pendientes</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal para Transferir / Reasignar Trámite */}
      {showTransferModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '440px', borderRadius: '18px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reasignar Trámite</h2>
              <button onClick={() => setShowTransferModal(false)} style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold' }}>&times;</button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              El turno <strong>{currentTurno?.codigoTurno}</strong> será colocado de vuelta en la fila de espera del trámite que selecciones.
            </p>

            <form onSubmit={transferirTurno}>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ fontWeight: 600 }}>Seleccione el Trámite de Destino</label>
                <select 
                  required 
                  value={targetTramite} 
                  onChange={(e) => setTargetTramite(e.target.value)}
                  style={{ marginTop: '0.5rem', height: '45px', borderRadius: '8px' }}
                >
                  <option value="">Seleccione...</option>
                  {tramites
                    .filter(t => t._id !== currentTurno?.tramite?._id && t.estado)
                    .map(t => (
                      <option key={t._id} value={t._id}>{t.nombre}</option>
                    ))
                  }
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowTransferModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontWeight: 700 }}>
                  Transferir Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .operator-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Atencion;
