import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, Ticket, Monitor, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const [showNotif, setShowNotif]   = useState(false);
  const [notifs, setNotifs]         = useState([]);
  const [unread, setUnread]         = useState(0);

  useEffect(() => {
    if (user?.rol !== 'ADMINISTRADOR') return;
    const fetch = async () => {
      try {
        const [turnos, ventRes] = await Promise.all([
          api.get('/turnos'),
          api.get('/ventanillas'),
        ]);
        const hoy = new Date().toISOString().split('T')[0];
        const deHoy = (turnos.data || []).filter(t => {
          const f = t.fecha || (t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '');
          return f === hoy;
        });
        const lista = [];
        const total = deHoy.length;
        if (total > 0) lista.push({ id: 1, icon: 'ticket', color: '#a78bfa', msg: `${total} turno${total !== 1 ? 's' : ''} emitido${total !== 1 ? 's' : ''} hoy`, time: 'Hoy' });
        const esp = deHoy.filter(t => t.estado === 'ESPERA').length;
        if (esp > 0) lista.push({ id: 2, icon: 'espera', color: '#fbbf24', msg: `${esp} turno${esp !== 1 ? 's' : ''} en espera`, time: 'Ahora' });
        const vents = (ventRes.data || []).filter(v => v.estado === 'activa').length;
        lista.push({ id: 3, icon: 'ventanilla', color: '#34d399', msg: `${vents} ventanilla${vents !== 1 ? 's' : ''} activa${vents !== 1 ? 's' : ''}`, time: 'Sistema' });
        setNotifs(lista);
        setUnread(lista.length);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user?.rol]);

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
                onClick={() => { setShowNotif(p => !p); setUnread(0); }}
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
                  }}>{unread}</span>
                )}
              </button>

              {/* Panel desplegable */}
              {showNotif && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: '300px', zIndex: 9999,
                  background: '#1a1830', border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ fontSize:'0.9rem', fontWeight:700 }}>Notificaciones</span>
                    <button onClick={() => setShowNotif(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center' }}>
                      <X size={15} />
                    </button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0', maxHeight:'240px', overflowY:'auto' }}>
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
                          {n.icon === 'usuario'   && <Users    size={16} style={{ color: n.color }} />}
                          {n.icon === 'success'   && <CheckCircle size={16} style={{ color: n.color }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.82rem', color:'var(--text-main)', fontWeight:600 }}>{n.msg}</div>
                          <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)', marginTop:'1px' }}>{n.time}</div>
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
