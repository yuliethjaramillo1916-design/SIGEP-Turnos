import axios from 'axios';

// Detectar automáticamente si estamos en producción (ej. yessica.online) o local
const isProd = typeof window !== 'undefined' && 
               window.location.hostname !== 'localhost' && 
               window.location.hostname !== '127.0.0.1';

const baseURL = import.meta.env.VITE_API_URL || (isProd ? '/api' : 'http://localhost:3001/api');

const api = axios.create({
    baseURL,
});

export default api;
