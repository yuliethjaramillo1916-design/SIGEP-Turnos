import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 3 — Multi-Entidad
// ETAPA 5 — Multi-Entidad Login (entidadId explícito)
//
// Estructura del objeto `user` almacenado:
//   {
//     _id, nombre, apellido, email, rol,
//     entidadId,   ← nuevo campo Multi-Tenant
//     entidad,     ← datos básicos de la entidad { _id, nombre, logo, prefijoCodigo }
//     ventanilla
//   }
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [token, setToken]                   = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading]               = useState(true);

  // ── Efecto: verificar sesión guardada al arrancar la app ──────────────────
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (storedToken) {
        // Configurar token por defecto en axios
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

        try {
          // /auth/me devuelve el usuario con entidadId populado
          const res = await api.get('/auth/me');

          // Normalizar para garantizar que entidadId siempre esté presente
          const userData = {
            ...res.data,
            // Si entidadId viene como objeto populado, extraer solo el _id
            entidadId: res.data.entidadId?._id
                       ?? res.data.entidadId
                       ?? null
          };

          setUser(userData);
          setToken(storedToken);
          setIsAuthenticated(true);

        } catch (error) {
          console.error('Error al validar sesión:', error);
          // Token inválido o expirado → limpiar todo
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // ── Interceptor Axios: manejar 401 globalmente ────────────────────────────
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Solo desloguear en rutas de autenticación para no interrumpir flujos
        if (error.response && error.response.status === 401) {
          const url = error.config?.url || '';
          if (url.includes('/auth/me') || url.includes('/auth/login')) {
            console.warn('Sesión expirada o token inválido, deslogueando...');
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // ── login: autenticar y guardar datos incluyendo entidadId ───────────────
  // AHORA RECIBE entidadId COMO PRIMER PARÁMETRO
  const login = async (entidadId, email, password) => {
    try {
      const res = await api.post('/auth/login', {
        entidadId: entidadId || undefined,
        email: email.toLowerCase().trim(),
        password
      });

      const { token: userToken, ...userData } = res.data;

      // Guardar token en localStorage y configurar axios
      localStorage.setItem('token', userToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

      // Normalizar el objeto usuario que se guardará en el estado
      const normalizedUser = {
        _id:        userData._id,
        nombre:     userData.nombre,
        apellido:   userData.apellido,
        email:      userData.email,
        rol:        userData.rol,
        entidadId:  userData.entidadId  ?? null,   // ← Multi-Tenant
        entidad:    userData.entidad    ?? null,   // ← datos de la entidad
        ventanilla: userData.ventanilla ?? null
      };

      setToken(userToken);
      setUser(normalizedUser);
      setIsAuthenticated(true);

      return normalizedUser;

    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      throw new Error(message);
    }
  };

  // ── logout: limpiar todo ─────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // ── Valor del contexto expuesto ──────────────────────────────────────────
  const contextValue = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    entidadId: user?.entidadId ?? null
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
