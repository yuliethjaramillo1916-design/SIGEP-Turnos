import SuperAdminSidebar from './SuperAdminSidebar';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Activity, Bell, Server } from 'lucide-react';

const SuperAdminLayout = ({ children }) => {
  const { user } = useAuth();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const initials = user ? `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase() : 'SA';

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0914' }}>
      <SuperAdminSidebar />

      {/* Columna derecha: Header + Contenido con scroll */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>

        {/* ── Header ── */}
        <header style={{
          height: '64px',
          flexShrink: 0,
          background: 'rgba(15, 13, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          boxShadow: '0 4px 25px rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>

          {/* Saludo izquierda */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              {getGreeting()}, Administrador Maestro
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
              {user?.nombre} {user?.apellido}
            </div>
          </div>

          {/* Indicadores centrales / estado global */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginRight: '1.5rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.35rem 0.75rem', borderRadius: '20px',
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
              fontSize: '0.75rem', fontWeight: 700, color: '#4ade80'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              SaaS Activo & Operacional
            </div>
          </div>

          {/* Perfil derecha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
            {/* Avatar */}
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: '0.85rem',
              boxShadow: '0 4px 14px rgba(236,72,153,0.35)',
            }}>
              {initials}
            </div>

            {/* Rol badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>
                {user?.email}
              </span>
              <span style={{
                fontSize: '0.62rem', fontWeight: 800,
                padding: '0.1rem 0.5rem', borderRadius: '9999px',
                background: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(139,92,246,0.3))',
                color: '#f472b6',
                border: '1px solid rgba(236,72,153,0.4)',
                letterSpacing: '0.04em'
              }}>
                SUPER_ADMIN
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
          background: '#0d0c18',
          padding: '2rem 2.5rem',
          position: 'relative',
        }}>
          {/* Orbes de ambiente */}
          <div style={{
            position: 'fixed', top: 0, right: 0,
            width: '450px', height: '450px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '240px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
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

export default SuperAdminLayout;
