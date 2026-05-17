import axios from 'axios';

// Déterminer la base URL selon l'environnement
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment
  ? 'http://localhost:5000/api'
  : (import.meta.env.VITE_API_URL || 'https://ami-backend-gvuw.onrender.com/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Fonction pour obtenir un token admin (utilisé seulement si le backend l'exige)
const getAdminToken = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/admin/login`, { password: 'AMI1990' });
    const token = response.data.token;
    if (token) {
      localStorage.setItem('adminToken', token);
    }
    return token;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token admin:', error);
    return null;
  }
};

// Intercepteur pour ajouter le token admin à chaque requête (sauf pour les routes publiques)
api.interceptors.request.use(async (config) => {
  // Ne pas ajouter le token pour les routes qui doivent être publiques
  if (config.url.includes('/donations')) {
    return config;
  }
  let token = localStorage.getItem('adminToken');
  if (!token) {
    token = await getAdminToken();
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export default api;