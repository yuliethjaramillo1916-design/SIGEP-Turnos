import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import SuperAdminLayout from './components/SuperAdminLayout';

// Páginas Institucionales (Clientes)
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
import CrearTicket from './pages/CrearTicket';
import HistorialAtencion from './pages/HistorialAtencion';

// Páginas del SuperAdmin (SaaS Global)
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminEntidades from './pages/superadmin/SuperAdminEntidades';
import SuperAdminPlanes from './pages/superadmin/SuperAdminPlanes';
import SuperAdminLicencias from './pages/superadmin/SuperAdminLicencias';
import SuperAdminOperaciones from './pages/superadmin/SuperAdminOperaciones';
import SuperAdminAuditoria from './pages/superadmin/SuperAdminAuditoria';
import SuperAdminMonitoreo from './pages/superadmin/SuperAdminMonitoreo';
import SuperAdminConfiguracion from './pages/superadmin/SuperAdminConfiguracion';

import './styles/global.css';

// Componente para manejar la redirección de la raíz '/' según el rol del usuario logueado
const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null; // Esperar a que la sesión sea verificada

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir según el rol del usuario
  if (user?.rol === 'SUPER_ADMIN') {
    return <Navigate to="/super-admin" replace />;
  }
  if (user?.rol === 'OPERADOR') {
    return <Navigate to="/atencion" replace />;
  }
  if (user?.rol === 'VIGILANTE') {
    return <Navigate to="/turnos" replace />;
  }

  // Los administradores entran directo al Dashboard institucional
  return <Dashboard />;
};

function App() {
  return (
    <Router basename="/turnos">
      <AuthProvider>
        <Routes>
          {/* Pantalla de inicio de sesión */}
          <Route path="/login" element={<Login />} />

          {/* Pantalla pública de turnos (Sin Login, Sin Layout) */}
          <Route path="/pantalla-publica" element={<PantallaPublica />} />

          {/* ══════════════ RUTAS SUPER_ADMIN (PLATAFORMA SAAS) ══════════════ */}
          <Route path="/super-admin/*" element={
            <PrivateRoute allowedRoles={['SUPER_ADMIN']}>
              <SuperAdminLayout>
                <Routes>
                  <Route path="/" element={<SuperAdminDashboard />} />
                  <Route path="/entidades" element={<SuperAdminEntidades />} />
                  <Route path="/planes" element={<SuperAdminPlanes />} />
                  <Route path="/licencias" element={<SuperAdminLicencias />} />
                  <Route path="/operaciones" element={<SuperAdminOperaciones />} />
                  <Route path="/auditoria" element={<SuperAdminAuditoria />} />
                  <Route path="/monitoreo" element={<SuperAdminMonitoreo />} />
                  <Route path="/configuracion" element={<SuperAdminConfiguracion />} />
                  <Route path="*" element={<Navigate to="/super-admin" replace />} />
                </Routes>
              </SuperAdminLayout>
            </PrivateRoute>
          } />

          {/* ══════════════ RUTAS INSTITUCIONALES (ENTIDADES CLIENTES) ══════════════ */}
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

                  {/* Crear Ticket — acceso directo para Vigilante */}
                  <Route path="/crear-ticket" element={
                    <PrivateRoute allowedRoles={['VIGILANTE']}>
                      <CrearTicket />
                    </PrivateRoute>
                  } />
                  
                  {/* Atención de Turnos (Operador, Admin) */}
                  <Route path="/atencion" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}>
                      <Atencion />
                    </PrivateRoute>
                  } />

                  {/* Historial de turnos atendidos */}
                  <Route path="/historial-atencion" element={
                    <PrivateRoute allowedRoles={['ADMINISTRADOR', 'OPERADOR']}>
                      <HistorialAtencion />
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
