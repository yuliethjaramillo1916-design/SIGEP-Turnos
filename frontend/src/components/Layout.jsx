import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  // Obtener color del badge según el rol
  const getRolBadgeClass = (rol) => {
    switch(rol) {
      case 'ADMINISTRADOR': return 'badge-danger';
      case 'OPERADOR': return 'badge-primary';
      case 'VIGILANTE': return 'badge-success';
      default: return 'badge-primary';
    }
  };

  return (
    <div className="app-container">
      {/* Barra Lateral */}
      <Sidebar />

      {/* Contenedor Principal */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', overflow: 'hidden' }}>
        
        {/* Barra Superior Navbar */}
        <header className="navbar" style={{
          height: '70px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 2rem',
          zIndex: 100
        }}>
          {/* Lado Izquierdo - Título de sección */}
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
              Sistema Profesional de Gestión de Turnos
            </span>
          </div>

          {/* Lado Derecho - Datos del Usuario y Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderRight: '1px solid var(--border)', paddingRight: '1.5rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <User size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {user?.nombre} {user?.apellido}
                </span>
                <span className={`badge ${getRolBadgeClass(user?.rol)}`} style={{ 
                  fontSize: '0.7rem', 
                  alignSelf: 'flex-end', 
                  marginTop: '0.2rem',
                  letterSpacing: '0.05em' 
                }}>
                  {user?.rol}
                </span>
              </div>
            </div>

            {/* Botón de Logout */}
            <button 
              onClick={logout} 
              className="btn btn-outline" 
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                color: '#ef4444',
                borderColor: '#fee2e2',
                background: '#fef2f2'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* Área de Contenido */}
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-main)', padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
