import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ticket, Lock, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Redirigir según el rol asignado
      if (user.rol === 'ADMINISTRADOR') {
        navigate('/');
      } else if (user.rol === 'OPERADOR') {
        navigate('/atencion');
      } else if (user.rol === 'VIGILANTE') {
        navigate('/turnos');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at 10% 20%, rgb(4, 159, 108) 0%, rgb(194, 254, 113) 90.1%)', // Vibrant green/teal gradients or nice corporate deep dark blues
      padding: '1.5rem',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background decor nodes */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        top: '10%',
        left: '10%',
        filter: 'blur(80px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'rgba(37, 99, 235, 0.15)',
        borderRadius: '50%',
        bottom: '10%',
        right: '15%',
        filter: 'blur(80px)',
        zIndex: 0
      }}></div>

      <div className="login-card" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        zIndex: 10,
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
            marginBottom: '1rem'
          }}>
            <Ticket size={36} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em' }}>
            SIGEP-Turnos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Gestión Inteligente y Profesional de Turnos
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            color: '#991b1b',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Correo Electrónico</label>
            <div style={{ position: 'relative', marginTop: '0.375rem' }}>
              <Mail style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} size={18} />
              <input 
                type="email" 
                placeholder="ejemplo@sigep.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  paddingLeft: '2.5rem',
                  borderRadius: '12px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  height: '48px',
                  fontSize: '0.95rem',
                  color: '#1e293b',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                className="login-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Contraseña</label>
            <div style={{ position: 'relative', marginTop: '0.375rem' }}>
              <Lock style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  paddingLeft: '2.5rem',
                  paddingRight: '2.5rem',
                  borderRadius: '12px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  height: '48px',
                  fontSize: '0.95rem',
                  color: '#1e293b',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              height: '48px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            className="login-btn"
          >
            {loading ? (
              <span className="spinner-small" style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderLeftColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite'
              }}></span>
            ) : 'Ingresar al Sistema'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          <span>© {new Date().getFullYear()} SIGEP-Turnos. Todos los derechos reservados.</span>
        </div>
      </div>

      <style>{`
        .login-input:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15) !important;
        }
        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 15px rgba(16, 185, 129, 0.4);
        }
        .login-btn:active {
          transform: translateY(1px);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
