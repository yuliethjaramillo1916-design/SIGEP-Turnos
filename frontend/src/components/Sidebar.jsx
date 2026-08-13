import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard, Ticket, Users, BookOpen,
  MonitorPlay, BarChart3, Settings, Tv, Monitor, LogOut, TicketPlus, ClipboardList
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [ventanillaAsignada, setVentanillaAsignada] = useState(null);

  useEffect(() => {
    if (user?.rol === 'OPERADOR' && user?._id) {
      api.get('/ventanillas').then(res => {
        const lista = res.data || [];
        const encontrada = lista.find(v =>
          String(v.operador?._id || v.operador) === String(user._id) ||
          (user.ventanilla && String(v._id) === String(user.ventanilla?._id || user.ventanilla))
        );
        if (encontrada) setVentanillaAsignada(encontrada);
      }).catch(() => {});
    }
  }, [user?._id]);

  const allLinks = [
    { to: '/',                   icon: <LayoutDashboard size={18} />, label: 'Panel',            roles: ['ADMINISTRADOR'] },
    { to: '/crear-ticket',       icon: <TicketPlus size={18} />,      label: 'Crear Ticket',     roles: ['VIGILANTE'] },
    { to: '/turnos',             icon: <Ticket size={18} />,          label: 'Turnos',           roles: ['ADMINISTRADOR', 'VIGILANTE'] },
    { to: '/atencion',           icon: <MonitorPlay size={18} />,     label: 'Atención',         roles: ['OPERADOR'] },
    { to: '/historial-atencion', icon: <ClipboardList size={18} />,   label: 'Historial',        roles: ['OPERADOR', 'ADMINISTRADOR'] },
    { to: '/usuarios',           icon: <Users size={18} />,           label: 'Usuarios',         roles: ['ADMINISTRADOR'] },
    { to: '/ventanillas',        icon: <Monitor size={18} />,         label: 'Ventanillas',      roles: ['ADMINISTRADOR'] },
    { to: '/tramites',           icon: <BookOpen size={18} />,        label: 'Trámites',         roles: ['ADMINISTRADOR'] },
    { to: '/reportes',           icon: <BarChart3 size={18} />,       label: 'Informes',         roles: ['ADMINISTRADOR'] },
    { to: '/configuracion',      icon: <Settings size={18} />,        label: 'Configuración',    roles: ['ADMINISTRADOR'] },
  ];

  const allowedLinks = allLinks.filter(l => l.roles.includes(user?.rol));

  return (
    <aside style={{
      width: '220px', minWidth: '220px',
      background: 'linear-gradient(180deg, #13111c 0%, #1a1530 50%, #1e1a35 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.75rem 1rem',
      position: 'sticky', top: 0, height: '100vh',
      overflowY: 'auto', flexShrink: 0,
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
      borderRight: '1px solid rgba(124,58,237,0.12)',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: '2rem', paddingLeft: '0.5rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>
          SIGEP<span style={{ color: '#a78bfa' }}>-TURNOS</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: '2px', letterSpacing: '0.04em' }}>
          Gestión de Turnos
        </div>
      </div>

      {/* Ventanilla badge — solo operadores */}
      {user?.rol === 'OPERADOR' && ventanillaAsignada && (
        <div style={{
          marginBottom: '1.25rem', padding: '0.75rem 1rem',
          background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: '14px',
        }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mi Ventanilla
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>
            Ventanilla {ventanillaAsignada.numero}
          </div>
          {ventanillaAsignada.nombre && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
              {ventanillaAsignada.nombre}
            </div>
          )}
        </div>
      )}

      {/* Navegación */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
        {allowedLinks.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} style={{ textDecoration: 'none', position: 'relative' }}>
            {({ isActive }) => (
              <div
                title={link.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.875rem', borderRadius: '12px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(109,40,217,0.25) 100%)'
                    : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 700 : 500, fontSize: '0.875rem',
                  transition: 'all 0.2s', cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #a78bfa' : '3px solid transparent',
                  boxShadow: isActive ? '0 2px 12px rgba(124,58,237,0.2)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                  background: isActive ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                }}>
                  {link.icon}
                </div>
                {link.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Parte inferior */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

        {/* Pantalla pública — solo admin */}
        {user?.rol === 'ADMINISTRADOR' && (() => {
          const baseUrl = import.meta.env.BASE_URL || '/';
          const publicUrl = baseUrl.endsWith('/') ? `${baseUrl}pantalla-publica` : `${baseUrl}/pantalla-publica`;
          return (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.875rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.875rem',
              textDecoration: 'none', transition: 'all 0.2s',
            }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tv size={16} />
              </div>
              Pantalla Pública
            </a>
          );
        })()}

        {/* Cerrar sesión */}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.65rem 0.875rem', borderRadius: '12px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.875rem',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
          width: '100%', textAlign: 'left',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={16} />
          </div>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
