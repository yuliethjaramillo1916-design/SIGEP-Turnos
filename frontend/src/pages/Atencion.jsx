import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, SkipForward, Pause, RefreshCw, XCircle, Users, Monitor, AlertCircle, Info, ChevronRight, Bell, ArrowRightLeft, UserCheck } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const Atencion = () => {
  const { user } = useAuth();
  
  // Estados de Configuración
  const [ventanilla, setVentanilla] = useState('');
  const [isVentanillaSet, setIsVentanillaSet] = useState(false);
  const [ventanillasDisponibles, setVentanillasDisponibles] = useState([]);
  const [loadingVentanilla, setLoadingVentanilla] = useState(true);
  
  // Estados de Atención
  const [currentTurno, setCurrentTurno] = useState(null);
  const [espera, setEspera] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('connecting'); // connecting, connected, disconnected (polling)
  
  // Estados para reasignación y notificación de turnos
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetTramite, setTargetTramite] = useState('');
  const [targetVentanilla, setTargetVentanilla] = useState('');
  const [targetOperador, setTargetOperador] = useState('');
  const [targetMotivo, setTargetMotivo] = useState('');
  const [operadoresDisponibles, setOperadoresDisponibles] = useState([]);
  const [turnoReasignadoPendiente, setTurnoReasignadoPendiente] = useState(null);

  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Cargar ventanillas, trámites y operadores iniciales
  useEffect(() => {
    if (user?._id) {
      fetchVentanillas();
      fetchOperadores();
    }
    fetchTramites();
  }, [user?._id]);

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

  // Helper para dar formato consistente y descriptivo a la ventanilla
  const formatVentanillaLabel = (v) => {
    if (!v) return '';
    const num = v.numero ? String(v.numero).trim() : '';
    const nom = v.nombre ? String(v.nombre).trim() : '';
    if (!nom || /^(ventanilla|modulo|módulo)$/i.test(nom)) {
      return num ? `Ventanilla ${num}` : (nom || 'Ventanilla');
    }
    if (num && nom.includes(num)) {
      return nom;
    }
    return num ? `Ventanilla ${num} - ${nom}` : nom;
  };

  const fetchVentanillas = async () => {
    setLoadingVentanilla(true);
    try {
      const res = await api.get('/ventanillas');
      const lista = res.data || [];
      setVentanillasDisponibles(lista);

      // Estrategia 1: el objeto user tiene el campo ventanilla (ObjectId) desde /auth/me
      if (user?.ventanilla) {
        const ventanillaAsignada = lista.find(
          v => String(v._id) === String(user.ventanilla?._id || user.ventanilla)
        );
        if (ventanillaAsignada) {
          const nombreVentanilla = formatVentanillaLabel(ventanillaAsignada);
          setVentanilla(nombreVentanilla);
          setIsVentanillaSet(true);
          setLoadingVentanilla(false);
          return;
        }
      }

      // Estrategia 2: buscar por operador asignado en la ventanilla
      const ventanillaAsignada = lista.find(
        v => v.operador && String(v.operador._id || v.operador) === String(user?._id)
      );
      if (ventanillaAsignada) {
        const nombreVentanilla = formatVentanillaLabel(ventanillaAsignada);
        setVentanilla(nombreVentanilla);
        setIsVentanillaSet(true);
        setLoadingVentanilla(false);
        return;
      }

      // Estrategia 3: localStorage por usuario (fallback manual)
      const guardada = localStorage.getItem(`ventanilla_${user?._id}`);
      if (guardada) {
        if (/^(ventanilla|modulo|módulo)$/i.test(guardada.trim())) {
          localStorage.removeItem(`ventanilla_${user?._id}`);
        } else {
          setVentanilla(guardada);
          setIsVentanillaSet(true);
        }
      }
    } catch (err) {
      console.error('Error fetching ventanillas:', err);
    } finally {
      setLoadingVentanilla(false);
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

  const fetchOperadores = async () => {
    try {
      const res = await api.get('/turnos/operadores-disponibles');
      setOperadoresDisponibles(res.data || []);
    } catch (err) {
      console.error('Error fetching operadores:', err);
    }
  };

  const initSocket = () => {
    try {
      const isProd = typeof window !== 'undefined' && 
                     window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';
      const socketUrl = import.meta.env.VITE_SOCKET_URL || (isProd ? window.location.origin : 'http://localhost:3001');
      const socket = io(socketUrl);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Conectado al WebSocket del Servidor');
        setSocketStatus('connected');
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

      socket.on('turno_actualizado', () => {
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

  // Helper para verificar si un turno en espera está asignado a este operador o su ventanilla
  const isTurnoMio = (t) => {
    if (!t) return false;
    const opId = t.operadorAsignado?._id || t.operadorAsignado;
    if (opId && String(opId) === String(user?._id)) return true;
    const vDestinoId = t.ventanillaDestino?._id || t.ventanillaDestino;
    const miVId = user?.ventanilla?._id || user?.ventanilla;
    if (vDestinoId && miVId && String(vDestinoId) === String(miVId)) return true;
    return false;
  };

  const fetchTurnos = async () => {
    try {
      const response = await api.get('/turnos');
      const allTurnos = response.data;
      
      // Fila de espera de hoy (solo turnos de hoy)
      const hoyISO = new Date().toISOString().split('T')[0];
      const normFecha = (t) => {
        if (t.createdAt) {
          const d = new Date(t.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        if (t.fecha && /^\d{4}-\d{2}-\d{2}/.test(t.fecha)) return t.fecha.slice(0,10);
        return '';
      };
      const enEsperaHoy = allTurnos.filter(t => t.estado === 'ESPERA' && normFecha(t) === hoyISO);

      // Detectar si hay turno reasignado a este operador o a su ventanilla
      const reasignadoAMi = enEsperaHoy.find(isTurnoMio);
      setTurnoReasignadoPendiente(reasignadoAMi || null);

      // Ordenar fila de espera:
      // 1. Reasignados a este operador / ventanilla
      // 2. Prioritarios
      // 3. Normales
      const ordenados = [...enEsperaHoy].sort((a, b) => {
        const aMio = isTurnoMio(a);
        const bMio = isTurnoMio(b);
        if (aMio && !bMio) return -1;
        if (!aMio && bMio) return 1;
        if (a.prioridad === 'PRIORITARIO' && b.prioridad !== 'PRIORITARIO') return -1;
        if (a.prioridad !== 'PRIORITARIO' && b.prioridad === 'PRIORITARIO') return 1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      setEspera(ordenados);

      // Turno activo de este operador en este momento
      const activo = allTurnos.find(t => t.estado === 'ATENDIENDO' && String(t.usuarioAtencion?._id || t.usuarioAtencion) === String(user?._id));
      const pausado = allTurnos.find(t => t.estado === 'PAUSADO' && String(t.usuarioAtencion?._id || t.usuarioAtencion) === String(user?._id));

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
    localStorage.setItem(`ventanilla_${user?._id}`, ventanilla);
    setIsVentanillaSet(true);
  };

  const cambiarVentanillaConfig = () => {
    localStorage.removeItem(`ventanilla_${user?._id}`);
    setIsVentanillaSet(false);
    setVentanilla('');
    setCurrentTurno(null);
  };

  // 1. Llamar al siguiente turno en cola (prioriza turnos reasignados automáticamente)
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
      setCurrentTurno(res.data);
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
      setCurrentTurno(res.data);
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
    if (!targetVentanilla && !targetTramite) {
      return alert('Debe seleccionar una ventanilla de destino o un nuevo trámite');
    }
    try {
      await api.put(`/turnos/${currentTurno._id}/transferir`, {
        nuevoTramiteId: targetTramite || undefined,
        ventanillaDestinoId: targetVentanilla || undefined,
        motivo: targetMotivo || undefined
      });
      setShowTransferModal(false);
      setTargetTramite('');
      setTargetVentanilla('');
      setTargetMotivo('');
      setCurrentTurno(null);
      fetchTurnos();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al transferir el turno');
    }
  };

  // Mientras carga la ventanilla asignada, mostrar spinner
  if (loadingVentanilla) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{
            width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
          }} />
          <p style={{ fontWeight: 600 }}>Cargando tu módulo de atención...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

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
              background: 'rgba(124,58,237,0.15)',
              color: 'var(--primary)',
              borderRadius: '16px',
              marginBottom: '1rem'
            }}>
              <Monitor size={28} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Configura tu Módulo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              No tienes una ventanilla asignada en el sistema. Selecciona una manualmente o pide al administrador que te asigne una.
            </p>
          </div>

          <form onSubmit={guardarVentanilla}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Número o Nombre de Ventanilla</label>
              
              {ventanillasDisponibles.length > 0 ? (
                <select 
                  value={ventanilla}
                  onChange={(e) => setVentanilla(e.target.value)}
                  required
                  style={{ marginTop: '0.5rem', height: '45px', borderRadius: '10px' }}
                >
                  <option value="">Seleccione una ventanilla...</option>
                  {ventanillasDisponibles.map(v => (
                    <option key={v._id} value={formatVentanillaLabel(v)}>
                      {formatVentanillaLabel(v)}
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
              background: socketStatus === 'connected' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', 
              color: socketStatus === 'connected' ? '#4ade80' : '#f87171',
              padding: '0.2rem 0.6rem',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              border: `1px solid ${socketStatus === 'connected' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
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

        {user?.rol === 'ADMINISTRADOR' && (
          <button onClick={cambiarVentanillaConfig} className="btn btn-outline" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            <RefreshCw size={16} /> Cambiar Ventanilla
          </button>
        )}
      </div>

      {/* Banner de Notificación de Turno Reasignado Pendiente */}
      {turnoReasignadoPendiente && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.14) 0%, rgba(202, 138, 4, 0.08) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          borderRadius: '16px',
          padding: '1.1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(234, 179, 8, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
              color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(234, 179, 8, 0.35)', flexShrink: 0
            }}>
              <Bell size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#fef08a', fontSize: '1.05rem' }}>
                  ¡Tienes un turno reasignado pendiente!
                </span>
                <span style={{
                  background: '#eab308', color: '#0f172a',
                  fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '6px',
                  letterSpacing: '0.04em'
                }}>
                  PRIORIDAD 1
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Turno <strong style={{ color: '#fff', fontSize: '1rem' }}>{turnoReasignadoPendiente.codigoTurno}</strong> ({turnoReasignadoPendiente.tramite?.nombre}).
                {currentTurno
                  ? ' Será llamado automáticamente cuando finalices tu atención actual.'
                  : ' ¡Está listo para ser atendido! Haz clic para iniciar su llamado ahora.'}
                {turnoReasignadoPendiente.motivoReasignacion && (
                  <span style={{ color: '#fde047', fontStyle: 'italic', display: 'block', marginTop: '0.15rem' }}>
                    Motivo: "{turnoReasignadoPendiente.motivoReasignacion}"
                  </span>
                )}
              </div>
            </div>
          </div>

          {!currentTurno && (
            <button 
              onClick={llamarSiguiente}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                color: '#0f172a',
                borderColor: 'transparent',
                fontWeight: 800,
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)',
                cursor: 'pointer'
              }}
            >
              <Play size={18} fill="#0f172a" /> Atender Turno Reasignado
            </button>
          )}
        </div>
      )}

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
                right: '20px',
                display: 'flex',
                gap: '0.5rem'
              }}>
                {currentTurno.esReasignado && (
                  <span style={{
                    background: '#eab308',
                    color: '#0f172a',
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🔄 REASIGNADO
                  </span>
                )}
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

              <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {currentTurno.tramite?.nombre}
              </p>

              {currentTurno.motivoReasignacion && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: '#fef08a',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  padding: '0.35rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  💬 {currentTurno.motivoReasignacion}
                </div>
              )}
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
                Atención iniciada a las {currentTurno.hora}
              </p>

              {/* Acciones del Operador */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={finalizarAtencion} style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', borderRadius: '12px' }}>
                  <CheckCircle size={20} /> Finalizar Atención
                </button>

                {currentTurno.estado === 'ATENDIENDO' ? (
                  <button className="btn btn-outline" onClick={pausarAtencion} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.08)' }}>
                    <Pause size={20} /> Pausar
                  </button>
                ) : (
                  <button className="btn btn-outline" onClick={reanudarAtencion} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)' }}>
                    <Play size={20} /> Reanudar
                  </button>
                )}

                <button className="btn btn-outline" onClick={() => {
                    setTargetTramite(currentTurno.tramite?._id || '');
                    setTargetOperador('');
                    setTargetVentanilla('');
                    setTargetMotivo('');
                    fetchVentanillas();
                    fetchOperadores();
                    setShowTransferModal(true);
                  }} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(124,58,237,0.08)' }}>
                  <RefreshCw size={20} /> Reasignar Trámite
                </button>

                {user?.rol === 'ADMINISTRADOR' && (
                  <button className="btn btn-outline" onClick={cancelarAtencion} style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '12px', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
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
                background: 'rgba(255,255,255,0.05)',
                border: '2px dashed rgba(255,255,255,0.12)',
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
              espera.map((t) => {
                const esMio = String(t.operadorAsignado?._id || t.operadorAsignado) === String(user?._id);
                return (
                <div 
                  key={t._id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '0.85rem 1rem', 
                    background: esMio 
                        ? 'rgba(234, 179, 8, 0.12)' 
                        : (t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.04)'), 
                    borderRadius: '10px', 
                    border: '1px solid',
                    borderColor: esMio 
                        ? 'rgba(234, 179, 8, 0.5)' 
                        : (t.prioridad === 'PRIORITARIO' ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.08)'),
                    position: 'relative',
                    boxShadow: esMio ? '0 0 12px rgba(234, 179, 8, 0.18)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '1.1rem', color: esMio ? '#fef08a' : 'var(--text-main)' }}>{t.codigoTurno}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {esMio && (
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 800, 
                          background: '#eab308', 
                          color: '#0f172a',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          🔄 REASIGNADO
                        </span>
                      )}
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: t.prioridad === 'PRIORITARIO' ? '#fbbf24' : 'rgba(255,255,255,0.4)' 
                      }}>
                        {t.prioridad === 'PRIORITARIO' ? `⭐ PRIORITARIO` : 'NORMAL'}
                      </span>
                    </div>
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
                  {esMio && t.motivoReasignacion && (
                    <div style={{ fontSize: '0.75rem', color: '#fde047', marginTop: '0.25rem', fontStyle: 'italic' }}>
                      💬 Nota: {t.motivoReasignacion}
                    </div>
                  )}
                </div>
              );
              })
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>No hay turnos pendientes</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal para Transferir / Reasignar Turno */}
      {showTransferModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '20px', background: '#1a1830', border: '1px solid rgba(124,58,237,0.3)', padding: '2rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reasignar Turno</h2>
              <button onClick={() => setShowTransferModal(false)} style={{ color: 'var(--text-muted)', fontSize: '1.5rem', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
            </div>
            
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Reasigna el turno <strong>{currentTurno?.codigoTurno}</strong> a otro operador o trámite. Al operador seleccionado le aparecerá como su próximo turno a llamar.
            </p>

            <form onSubmit={transferirTurno}>
              {/* Selector de Ventanilla / Operador de Destino */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  Ventanilla / Operador de Destino
                </label>
                <select 
                  value={targetVentanilla} 
                  onChange={(e) => setTargetVentanilla(e.target.value)}
                  style={{ marginTop: '0.4rem', height: '44px', borderRadius: '10px', width: '100%', background: '#13111c', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0 0.75rem' }}
                >
                  <option value="">Seleccione una ventanilla de destino...</option>
                  {ventanillasDisponibles && ventanillasDisponibles.length > 0 ? (
                    ventanillasDisponibles
                      .filter(v => !v.estado || String(v.estado).toLowerCase() === 'activa')
                      .map(v => {
                        const op = v.operador;
                        const esMiVentanilla = (op && String(op._id || op) === String(user?._id)) ||
                                               (user?.ventanilla && String(user.ventanilla?._id || user.ventanilla) === String(v._id));
                        if (esMiVentanilla) return null;
                        const nomVentanilla = formatVentanillaLabel(v);
                        const opTexto = op ? `(${op.nombre} ${op.apellido})` : '(Disponible)';
                        return (
                          <option key={v._id} value={v._id}>
                            {nomVentanilla} — {opTexto}
                          </option>
                        );
                      })
                  ) : (
                    operadoresDisponibles
                      .filter(op => String(op._id) !== String(user?._id))
                      .map(op => (
                        <option key={op._id} value={op.ventanilla?._id || op._id}>
                          {op.ventanilla ? formatVentanillaLabel(op.ventanilla) : 'Ventanilla'} — ({op.nombre} {op.apellido})
                        </option>
                      ))
                  )}
                </select>
                <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', display: 'block', marginTop: '0.3rem' }}>
                  El turno será transferido a esta ventanilla con prioridad máxima de llamado.
                </small>
              </div>

              {/* Selector de Trámite de Destino */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Trámite de Destino</label>
                <select 
                  value={targetTramite} 
                  onChange={(e) => setTargetTramite(e.target.value)}
                  style={{ marginTop: '0.4rem', height: '44px', borderRadius: '10px', width: '100%', background: '#13111c', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0 0.75rem' }}
                >
                  <option value="">Mantener trámite actual ({currentTurno?.tramite?.nombre})</option>
                  {tramites
                    .filter(t => t.estado)
                    .map(t => (
                      <option key={t._id} value={t._id}>{t.nombre}</option>
                    ))
                  }
                </select>
              </div>

              {/* Motivo de reasignación */}
              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Motivo / Observación (opcional)</label>
                <input 
                  type="text"
                  placeholder="Ej: Requiere pago en caja, validación de firma..."
                  value={targetMotivo}
                  onChange={(e) => setTargetMotivo(e.target.value)}
                  style={{ marginTop: '0.4rem', height: '44px', borderRadius: '10px', width: '100%', background: '#13111c', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0 0.75rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, height: '44px', borderRadius: '10px' }} onClick={() => setShowTransferModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '44px', borderRadius: '10px', fontWeight: 700 }}>
                  Reasignar Turno
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
