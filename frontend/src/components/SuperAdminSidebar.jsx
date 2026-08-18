import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Package,
  KeyRound,
  Activity,
  ShieldAlert,
  Server,
  Settings,
  LogOut,
  Sparkles
} from 'lucide-react';

const SuperAdminSidebar = () => {
  const { user, logout } = useAuth();

  const navLinks = [
    { to: '/super-admin',              icon: <LayoutDashboard size={18} />, label: 'Dashboard Global', end: true },
    { to: '/super-admin/entidades',    icon: <Building2 size={18} />,       label: 'Gestión Entidades' },
    { to: '/super-admin/planes',       icon: <Package size={18} />,         label: 'Planes SaaS' },
    { to: '/super-admin/licencias',    icon: <KeyRound size={18} />,        label: 'Licencias & Cupos' },
    { to: '/super-admin/operaciones',  icon: <Activity size={18} />,        label: 'Centro Operaciones' },
    { to: '/super-admin/monitoreo',    icon: <Server size={18} />,          label: 'Salud & Monitoreo' },
    { to: '/super-admin/configuracion',icon: <Settings size={18} />,        label: 'Configuración SaaS' },
  ];

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'linear-gradient(180deg, #090814 0%, #110d24 50%, #150f2e 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.75rem 1rem',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
      borderRight: '1px solid rgba(139,92,246,0.18)',
    }}>

      {/* Brand & SuperAdmin Badge */}
      <div style={{ marginBottom: '1.75rem', paddingLeft: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 0 15px rgba(124,58,237,0.4)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>
              SIGEP<span style={{ color: '#c084fc' }}>-SaaS</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
              SUPER ADMIN PANEL
            </div>
          </div>
        </div>
      </div>

      {/* Tag de alcance global */}
      <div style={{
        margin: '0 0.25rem 1.25rem',
        padding: '0.6rem 0.8rem',
        borderRadius: '10px',
        background: 'rgba(124,58,237,0.1)',
        border: '1px solid rgba(124,58,237,0.2)',
        fontSize: '0.72rem',
        color: '#c4b5fd',
        lineHeight: 1.3
      }}>
        👑 <strong>Control Maestro:</strong> Administrando clientes y licencias multi-entidad.
      </div>

      {/* Navegación */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={{ textDecoration: 'none', position: 'relative' }}
          >
            {({ isActive }) => (
              <div
                title={link.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.875rem',
                  borderRadius: '12px',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.28) 0%, rgba(139,92,246,0.28) 100%)'
                    : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #8b5cf6' : '3px solid transparent',
                  boxShadow: isActive ? '0 2px 14px rgba(124,58,237,0.25)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  }
                }}
              >
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  flexShrink: 0,
                  background: isActive ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                }}>
                  {link.icon}
                </div>
                {link.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div style={{
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.875rem',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
            e.currentTarget.style.color = '#fca5a5';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <LogOut size={16} />
          </div>
          Cerrar Sesión Global
        </button>
      </div>
    </aside>
  );
};

export default SuperAdminSidebar;
