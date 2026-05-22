import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-main)',
        color: 'var(--primary)',
        fontWeight: 'bold',
        fontSize: '1.2rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(0,0,0,0.1)',
          borderLeftColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '1rem'
        }}></div>
        <span>Verificando credenciales...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.rol)) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--danger)', marginBottom: '1rem' }}>⛔ Acceso Restringido</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--secondary)', maxWidth: '500px', marginBottom: '2rem' }}>
          Tu cuenta con rol <strong>{user?.rol}</strong> no dispone de permisos suficientes para acceder a esta sección.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return children;
};

export default PrivateRoute;
