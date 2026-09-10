import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Inicializar leyendo la preferencia de localStorage o 'dark' por defecto
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('sigep_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Aplicar el atributo al elemento <html> cada vez que cambie el tema
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('sigep_theme', theme);
    } catch (e) {
      console.error('Error al persistir el tema:', e);
    }
  }, [theme]);

  // Alternar entre oscuro y claro
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser utilizado dentro de un ThemeProvider');
  }
  return context;
};

export default ThemeContext;
