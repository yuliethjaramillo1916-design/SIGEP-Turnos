import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, Ticket, Monitor, Users, AlertTriangle, Clock, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { evaluarHorarioAtencion } from '../utils/horarioAtencion';
import { io } from 'socket.io-client';
import { useTheme } from '../context/ThemeContext';

const formatearFechaHora = (fechaStr) => {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const f = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${f} • ${h}`;
};

const Layout = ({ children }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotif, setShowNotif]   = useState(false);
  const [notifs, setNotifs]         = useState([]);
  const [unread, setUnread]         = useState(0);
  const [horarioCerrado, setHorarioCerrado]       = useState(false);
  const [horarioTexto, setHorarioTexto]           = useState('');
  const [showModalCerrado, setShowModalCerrado]   = useState(false);
  const [showBannerCerrado, setShowBannerCerrado] = useState(true);

  // Comprobación inmediata al montar Layout para Operador y Vigilante
  useEffect(() => {
    if (user && ['OPERADOR', 'VIGILANTE'].includes(user.rol)) {
      const hStr = user.entidad?.horarioAtencion || '08:00 - 18:00';
      setHorarioTexto(hStr);
      const evalInicial = evaluarHorarioAtencion(hStr);
      if (!evalInicial.activo || evalInicial.estado === 'cerrado' || evalInicial.estado === 'antes_apertura') {
        setHorarioCerrado(true);
        setShowModalCerrado(true);
      }
    }
  }, [user]);

  // Escuchar notificaciones de sesión en tiempo real vía WebSocket para Administradores
  useEffect(() => {
    if (!user || user.rol !== 'ADMINISTRADOR') return;

    let socket;
    try {
      const isProd = typeof window !== 'undefined' && 
                     window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';
      const socketUrl = import.meta.env.VITE_SOCKET_URL || (isProd ? window.location.origin : 'http://localhost:3001');
      socket = io(socketUrl, { transports: ['websocket', 'polling'] });

      const entidadId = user.entidadId?._id || user.entidadId;
      if (entidadId) {
        socket.emit('join_entidad', entidadId);
      }

      socket.on('notificacion_sesion', (nuevaNotif) => {
        const notifEntidadId = String(nuevaNotif.entidadId?._id || nuevaNotif.entidadId || '');
        const miEntidadId = String(entidadId || '');

        // Filtrar estrictamente para que solo reciba notificaciones de su propia entidad
        if (miEntidadId && notifEntidadId && miEntidadId !== notifEntidadId) {
          return;
        }

        const item = {
          id: nuevaNotif._id || `temp_${Date.now()}`,
          icon: nuevaNotif.tipo === 'LOGIN' ? 'login' : 'logout',
          color: nuevaNotif.tipo === 'LOGIN' ? '#34d399' : '#f59e0b',
          msg: nuevaNotif.mensaje,
          rol: nuevaNotif.rol,
          tipo: nuevaNotif.tipo,
          time: formatearFechaHora(nuevaNotif.fecha || new Date()),
          leido: false
        };

        setNotifs(prev => [item, ...prev.filter(x => String(x.id) !== String(item.id))]);
        setUnread(u => u + 1);
      });
    } catch (err) {
      console.warn('Socket no inicializado en Layout:', err.message);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  // Consultar notificaciones persistidas y alertas del sistema
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const lista = [];

        if (user.rol === 'ADMINISTRADOR') {
          // 1. Obtener eventos reales de inicio y cierre de sesión de operadores y vigilantes
          try {
            const notifRes = await api.get('/notificaciones');
            const data = notifRes.data || {};
            const eventos = data.notificaciones || [];
            
            eventos.forEach(ev => {
              lista.push({
                id: ev._id,
                icon: ev.tipo === 'LOGIN' ? 'login' : 'logout',
                color: ev.tipo === 'LOGIN' ? '#34d399' : '#f59e0b',
                msg: ev.mensaje,
                rol: ev.rol,
                tipo: ev.tipo,
                time: formatearFechaHora(ev.fecha),
                leido: ev.leido
              });
            });

            // Establecer conteo de no leídas
            setUnread(data.unreadCount ?? eventos.filter(e => !e.leido).length);
          } catch (notifErr) {
            console.error('Error al consultar notificaciones de sesión:', notifErr);
          }

          // 2. Verificar si hay ventanillas inactivas como aviso prioritario
          try {
            const ventRes = await api.get('/ventanillas');
            const inactivas = (ventRes.data || []).filter(v => v.estado === 'inactiva');
            if (inactivas.length > 0) {
              lista.unshift({ 
                id: 'admin_inactivas', 
                icon: 'alerta', 
                color: '#f87171', 
                msg: `${inactivas.length} ventanilla${inactivas.length > 1 ? 's' : ''} inactiva${inactivas.length > 1 ? 's' : ''}`, 
                time: 'Alerta' 
              });
            }
          } catch {}

        } else if (user.rol === 'OPERADOR') {
          const [ventRes, turnosRes] = await Promise.all([
            api.get('/ventanillas'),
            api.get('/turnos')
          ]);

          const ventanillas = ventRes.data || [];
          const misVentanillas = ventanillas.filter(v => 
            (v.operador && String(v.operador._id || v.operador) === String(user._id)) ||
            (user.ventanilla && String(v._id) === String(user.ventanilla._id || user.ventanilla))
          );

          // Comprobar si la ventanilla del operador está inactiva
          const ventInactiva = misVentanillas.find(v => v.estado === 'inactiva');
          if (ventInactiva) {
            const nom = ventInactiva.nombre ? ` (${ventInactiva.nombre})` : ` Ventanilla ${ventInactiva.numero}`;
            lista.push({
              id: 'operador_ventanilla_inactiva',
              icon: 'alerta',
              color: '#f87171',
              msg: `El administrador ha desactivado tu ventanilla${nom}. No puedes llamar turnos.`,
              time: 'Inactiva'
            });
          }

          // Comprobar si tiene turnos reasignados pendientes
          const turnosHoy = (turnosRes.data || []).filter(t => t.estado === 'ESPERA');
          const turnosReasignados = turnosHoy.filter(t => 
            String(t.operadorAsignado?._id || t.operadorAsignado) === String(user._id)
          );
          if (turnosReasignados.length > 0) {
            lista.push({
              id: 'operador_reasignados',
              icon: 'ticket',
              color: '#eab308',
              msg: `Tienes ${turnosReasignados.length} turno${turnosReasignados.length > 1 ? 's' : ''} reasignado${turnosReasignados.length > 1 ? 's' : ''} pendiente${turnosReasignados.length > 1 ? 's' : ''}`,
              time: 'Prioritario'
            });
          }
        }

        // Comprobar horario de atención para alertas de cierre
        try {
          const configRes = await api.get('/configuracion');
          const horStr = configRes.data?.horario_atencion || user?.entidad?.horarioAtencion || '08:00 - 18:00';
          setHorarioTexto(horStr);
          const infoHor = evaluarHorarioAtencion(horStr);

          // Está cerrado si ya pasó la hora de cierre o si es antes de la hora de apertura
          const estaCerrado = !infoHor.activo || infoHor.estado === 'cerrado' || infoHor.estado === 'antes_apertura';

          if (estaCerrado) {
            setHorarioCerrado(true);

            // Mostrar el modal y el banner al Operador o Vigilante al ingresar
            if (['OPERADOR', 'VIGILANTE'].includes(user.rol)) {
              setShowModalCerrado(true);
            }

            lista.push({
              id: 'horario_cerrado',
              icon: 'reloj',
              color: '#f87171',
              msg: `Horario finalizado (${horStr}).`,
              time: 'Cerrado'
            });
          } else {
            setHorarioCerrado(false);
            if (infoHor.estado === 'aviso_10') {
              lista.unshift({
                id: 'horario_cierre_10',
                icon: 'reloj',
                color: '#f97316',
                msg: `Cierre inminente en ${infoHor.minutosParaCierre} min (${infoHor.horaCierre}). La emisión concluirá pronto.`,
                time: 'Urgente'
              });
            } else if (infoHor.estado === 'aviso_60') {
              lista.unshift({
                id: 'horario_cierre_60',
                icon: 'reloj',
                color: '#eab308',
                msg: `Horario de atención: cierre en ${infoHor.minutosParaCierre} min (${infoHor.horaCierre}).`,
                time: 'Horario'
              });
            }
          }
        } catch (configErr) {
          console.error('Error al evaluar horario de atención:', configErr);
          // Fallback por defecto si falla la petición
          const horFallback = '08:00 - 18:00';
          setHorarioTexto(horFallback);
          const infoFallback = evaluarHorarioAtencion(horFallback);
          if (!infoFallback.activo) {
            setHorarioCerrado(true);
            if (['OPERADOR', 'VIGILANTE'].includes(user.rol)) {
              setShowModalCerrado(true);
            }
          }
        }

        setNotifs(lista);
        if (user.rol !== 'ADMINISTRADOR') {
          setUnread(lista.length);
        }
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const cerrarModalCerrado = () => {
    setShowModalCerrado(false);
    if (user?._id) {
      const sessionKey = `aviso_cierre_${user._id}_${new Date().toISOString().split('T')[0]}`;
      sessionStorage.setItem(sessionKey, 'true');
    }
  };

  const handleToggleNotif = async () => {
    const next = !showNotif;
    setShowNotif(next);
    if (next && user?.rol === 'ADMINISTRADOR') {
      setUnread(0);
      try {
        await api.put('/notificaciones/marcar-leidas');
      } catch {}
    }
  };

  const getRolColor = (rol) => {
    switch(rol) {
      case 'ADMINISTRADOR': return { bg: 'rgba(124,58,237,0.25)', color: '#c4b5fd', border: 'rgba(124,58,237,0.35)' };
      case 'OPERADOR':      return { bg: 'rgba(5,150,105,0.20)',  color: '#34d399', border: 'rgba(5,150,105,0.35)' };
      case 'VIGILANTE':     return { bg: 'rgba(217,119,6,0.20)',  color: '#fbbf24', border: 'rgba(217,119,6,0.35)' };
      default:              return { bg: 'rgba(124,58,237,0.25)', color: '#c4b5fd', border: 'rgba(124,58,237,0.35)' };
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const rolStyle = getRolColor(user?.rol);
  const initials = user ? `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase() : 'U';

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-main)' }}>
      <Sidebar />

      {/* columna derecha: header fijo + contenido con scroll */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>

        {/* ── Header ── */}
        <header style={{
          height: '64px',
          flexShrink: 0,
          background: 'var(--bg-header)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem 0 2rem',
          boxShadow: 'var(--shadow)',
          zIndex: 100,
        }}>

          {/* Saludo izquierda */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {getGreeting()},
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {user?.nombre} {user?.apellido}
            </div>
          </div>

          {/* Derecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>

            {/* Botón Selector Modo Oscuro / Modo Claro */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: theme === 'light' ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${theme === 'light' ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme === 'light' ? '#7c3aed' : '#fbbf24',
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.08)';
              }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Campana con badge y panel */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleToggleNotif}
                style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: showNotif ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${showNotif ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: showNotif ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                }}
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: '#f87171', color: 'white',
                    fontSize: '0.6rem', fontWeight: 800,
                    width: '16px', height: '16px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #13111c',
                  }}>{unread > 99 ? '99+' : unread}</span>
                )}
              </button>

              {/* Panel desplegable */}
              {showNotif && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: '330px', zIndex: 9999,
                  background: '#1a1830', border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize:'0.9rem', fontWeight:700 }}>Notificaciones</span>
                      {user?.rol === 'ADMINISTRADOR' && (
                        <span style={{ fontSize: '0.65rem', color: '#a78bfa', background: 'rgba(124,58,237,0.15)', padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>
                          Sesiones en Vivo
                        </span>
                      )}
                    </div>
                    <button onClick={() => setShowNotif(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center' }}>
                      <X size={15} />
                    </button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0', maxHeight:'300px', overflowY:'auto' }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding:'2rem', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:'0.85rem' }}>Sin notificaciones</div>
                    ) : notifs.map(n => (
                      <div key={n.id} style={{ display:'flex', alignItems:'center', gap:'0.875rem', padding:'0.875rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width:'34px', height:'34px', borderRadius:'10px', background:`${n.color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {n.icon === 'ticket'    && <Ticket   size={16} style={{ color: n.color }} />}
                          {n.icon === 'espera'    && <Bell     size={16} style={{ color: n.color }} />}
                          {n.icon === 'ventanilla'&& <Monitor  size={16} style={{ color: n.color }} />}
                          {n.icon === 'alerta'    && <AlertTriangle size={16} style={{ color: n.color }} />}
                          {n.icon === 'usuario'   && <Users    size={16} style={{ color: n.color }} />}
                          {n.icon === 'success'   && <CheckCircle size={16} style={{ color: n.color }} />}
                          {n.icon === 'reloj'     && <Clock    size={16} style={{ color: n.color }} />}
                          {n.icon === 'login'     && <LogIn    size={16} style={{ color: n.color }} />}
                          {n.icon === 'logout'    && <LogOut   size={16} style={{ color: n.color }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.82rem', color:'var(--text-main)', fontWeight:600, lineHeight: 1.3 }}>{n.msg}</div>
                          <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.38)', marginTop:'3px', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{n.time}</span>
                            {n.rol && (
                              <span style={{
                                fontSize: '0.62rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: n.rol === 'OPERADOR' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                color: n.rol === 'OPERADOR' ? '#34d399' : '#fbbf24',
                                fontWeight: 700
                              }}>
                                {n.rol}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

            {/* Avatar */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '0.8rem',
              boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
            }}>
              {initials}
            </div>

            {/* Nombre + rol — columna */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                {user?.nombre}
              </span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700,
                padding: '0.08rem 0.45rem', borderRadius: '9999px',
                background: rolStyle.bg, color: rolStyle.color,
                border: `1px solid ${rolStyle.border}`,
                whiteSpace: 'nowrap', marginTop: '1px',
              }}>
                {user?.rol}
              </span>
            </div>

          </div>
        </header>

        {/* ── Banner Superior de Horario Finalizado para Operadores y Vigilantes ── */}
        {showBannerCerrado && ['OPERADOR', 'VIGILANTE'].includes(user?.rol) && horarioCerrado && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.25) 50%, rgba(239, 68, 68, 0.18) 100%)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.35)',
            backdropFilter: 'blur(10px)',
            padding: '0.65rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 90,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.22)', border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Clock size={16} color="#fca5a5" />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fee2e2' }}>
                El horario de atención para hoy ha finalizado (Horario: {horarioTexto || '08:00 - 18:00'})
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 800,
                padding: '0.15rem 0.5rem', borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                letterSpacing: '0.04em'
              }}>
                CERRADO
              </span>
              <button
                onClick={() => setShowBannerCerrado(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(254, 202, 202, 0.6)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Ocultar aviso"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Contenido con scroll ── */}
        <main style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'clip',
          background: 'var(--bg-main)',
          padding: '2rem 2.5rem',
          position: 'relative',
        }}>
          {/* Orbes decorativos */}
          <div style={{
            position: 'fixed', top: 0, right: 0,
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '220px',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </main>

      </div>

      {/* ── Modal de Aviso al Ingresar Fuera de Horario para Operador y Vigilante ── */}
      {showModalCerrado && ['OPERADOR', 'VIGILANTE'].includes(user?.rol) && horarioCerrado && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(5, 4, 12, 0.78)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1b182b 0%, #141222 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '20px',
            padding: '2.25rem 2rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.12)',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Botón cerrar X superior */}
            <button
              onClick={cerrarModalCerrado}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.06)', border: 'none',
                borderRadius: '8px', width: '30px', height: '30px',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>

            {/* Icono destacado */}
            <div style={{
              width: '58px', height: '58px', borderRadius: '16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              margin: '0 auto 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Clock size={28} color="#f87171" />
            </div>

            {/* Píldora de estado */}
            <div style={{
              display: 'inline-block',
              fontSize: '0.68rem', fontWeight: 800,
              padding: '0.2rem 0.65rem', borderRadius: '9999px',
              background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              letterSpacing: '0.05em', textTransform: 'uppercase',
              marginBottom: '1rem'
            }}>
              Atención Fuera de Horario
            </div>

            {/* Mensaje principal exacto */}
            <h3 style={{
              fontSize: '1.05rem', fontWeight: 700, color: '#fef2f2',
              lineHeight: 1.4, margin: '0 0 0.75rem 0'
            }}>
              El horario de atención para hoy ha finalizado (Horario: {horarioTexto || '08:00 - 18:00'})
            </h3>

            {/* Explicación de apoyo */}
            <p style={{
              fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)',
              lineHeight: 1.5, margin: '0 0 1.75rem 0'
            }}>
              Estimado/a <strong>{user?.nombre}</strong>, la jornada operativa de atención para la entidad ha culminado. Puedes consultar registros anteriores o cerrar tu sesión.
            </p>

            {/* Botón de acción */}
            <button
              onClick={cerrarModalCerrado}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.85rem 1.5rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Layout;

