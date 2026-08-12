import axios from 'axios';

// Si se define VITE_API_URL en el .env del frontend se usa esa, sino por defecto http://localhost:3001/api
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL,
});

export default api;
