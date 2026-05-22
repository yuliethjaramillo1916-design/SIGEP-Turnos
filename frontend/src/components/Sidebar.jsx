import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  BookOpen, 
  MonitorPlay, 
  BarChart3, 
  Settings,
  Tv,
  Monitor
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  // Definir todos los enlaces disponibles
  const allLinks = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['ADMINISTRADOR'] },
    { to: '/turnos', icon: <Ticket size={20} />, label: 'Turnos', roles: ['ADMINISTRADOR', 'VIGILANTE'] },
    { to: '/atencion', icon: <MonitorPlay size={20} />, label: 'Atención', roles: ['ADMINISTRADOR', 'OPERADOR'] },
    { to: '/usuarios', icon: <Users size={20} />, label: 'Usuarios', roles: ['ADMINISTRADOR'] },
    { to: '/ventanillas', icon: <Monitor size={20} />, label: 'Ventanillas', roles: ['ADMINISTRADOR'] },
    { to: '/tramites', icon: <BookOpen size={20} />, label: 'Trámites', roles: ['ADMINISTRADOR'] },
    { to: '/reportes', icon: <BarChart3 size={20} />, label: 'Reportes', roles: ['ADMINISTRADOR'] },
    { to: '/configuracion', icon: <Settings size={20} />, label: 'Configuración', roles: ['ADMINISTRADOR'] },
  ];

  // Filtrar enlaces según el rol del usuario logueado
  const allowedLinks = allLinks.filter(link => link.roles.includes(user?.rol));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
        }}>
          <Ticket size={24} />
        </div>
        <span>SIGEP</span>
      </div>
      
      <nav className="nav-links" style={{ flex: 1 }}>
        {allowedLinks.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to} 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Enlace rápido a la pantalla pública — solo visible para Administrador */}
      {user?.rol === 'ADMINISTRADOR' && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <a 
            href="/pantalla-publica" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-link"
            style={{ 
              background: '#ecfdf5', 
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <Tv size={20} />
            <span>Pantalla Pública</span>
          </a>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
