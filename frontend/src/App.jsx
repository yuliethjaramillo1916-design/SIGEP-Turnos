import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Turnos from './pages/Turnos';
import Usuarios from './pages/Usuarios';
import Tramites from './pages/Tramites';
import Atencion from './pages/Atencion';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import PantallaPublica from './pages/PantallaPublica';
import Ventanillas from './pages/Ventanillas';
import './styles/global.css';

// Componente para manejar la redirección de la raíz '/' según el rol del usuario logueado
const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null; // Esperar a que la sesión sea verificada

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir según el rol del usuario
  if (user?.rol === 'OPERADOR') {
    return <Navigate to="/atencion" replace />;
  }
  if (user?.rol === 'VIGILANTE') {
    return <Navigate to="/turnos" replace />;
  }

  // Los administradores entran directo al Dashboard
  return <Dashboard />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Pantalla de inicio de sesión */}
          <Route path="/login" element={<Login />} />

          {/* Pantalla pública de turnos (Sin Login, Sin Layout) */}
          <Route path="/pantalla-publica" element={<PantallaPublica />} />

          {/* Rutas Privadas Protegidas con el Layout Común */}
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  
                  {/* Gestión de Turnos (Vigilante, Admin) */}
                  <Route path="/turnos" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR', 'VIGILANTE']}>
                      <Turnos />
                    </PrivateRoute>
                  } />
                  
                  {/* Atención de Turnos (Operador, Admin) */}
                  <Route path="/atencion" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}>
                      <Atencion />
                    </PrivateRoute>
                  } />
                  
                  {/* Usuarios (Solo Admin) */}
                  <Route path="/usuarios" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                      <Usuarios />
                    </PrivateRoute>
                  } />
                  
                  {/* Ventanillas (Solo Admin) */}
                  <Route path="/ventanillas" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                      <Ventanillas />
                    </PrivateRoute>
                  } />
                  
                  {/* Trámites (Solo Admin) */}
                  <Route path="/tramites" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                      <Tramites />
                    </PrivateRoute>
                  } />
                  
                  {/* Reportes (Solo Admin) */}
                  <Route path="/reportes" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                      <Reportes />
                    </PrivateRoute>
                  } />
                  
                  {/* Configuración (Solo Admin) */}
                  <Route path="/configuracion" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                      <Configuracion />
                    </PrivateRoute>
                  } />

                  {/* Fallback de redirección */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
