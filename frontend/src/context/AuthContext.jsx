import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Efecto para verificar si hay un token válido al arrancar la app (solo al montar)
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        // Configurar token por defecto en axios
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          setToken(storedToken);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error al validar sesión:', error);
          // Si el token guardado no es válido, limpiamos almacenamiento y headers
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

  // Interceptor de Axios para capturar respuestas 401 (Token expirado/Inválido)
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn('Sesión expirada o token inválido, deslogueando...');
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email: email.toLowerCase().trim(), password });
      const { token: userToken, ...userData } = res.data;
      
      localStorage.setItem('token', userToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      
      setToken(userToken);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout }}>
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
