import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, Ticket, Monitor, Users, AlertTriangle, Clock, LogIn, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { evaluarHorarioAtencion } from '../utils/horarioAtencion';
import { io } from 'socket.io-client';

const formatearFechaHora = (fechaStr) => {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const f = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${f} • ${h}`;
};

const Layout = ({ children }) => {
  const { user } = useAuth();
  const [showNotif, setShowNotif]   = useState(false);
  const [notifs, setNotifs]         = useState([]);
  const [unread, setUnread]         = useState(0);

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
          if (configRes.data?.horario_atencion) {
            const infoHor = evaluarHorarioAtencion(configRes.data.horario_atencion);
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
            } else if (infoHor.estado === 'cerrado') {
              lista.push({
                id: 'horario_cerrado',
                icon: 'reloj',
                color: '#f87171',
                msg: `Emisión de tickets cerrada para hoy (${infoHor.horaCierre}).`,
                time: 'Cerrado'
              });
            }
          }
        } catch {}

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
    <div style={{ display: 'flex', height: '100vh', background: '#0f0e17' }}>
      <Sidebar />

      {/* columna derecha: header fijo + contenido con scroll */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>

        {/* ── Header ── */}
        <header style={{
          height: '64px',
          flexShrink: 0,
          background: 'rgba(19,17,28,0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(124,58,237,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem 0 2rem',
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
          zIndex: 100,
        }}>

          {/* Saludo izquierda */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              {getGreeting()},
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              {user?.nombre} {user?.apellido}
            </div>
          </div>

          {/* Derecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>

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
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
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

        {/* ── Contenido con scroll ── */}
        <main style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'clip',
          background: '#13111c',
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
    </div>
  );
};

export default Layout;
