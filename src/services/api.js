import axios from 'axios';

// Déterminer la base URL selon l'environnement
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment
  ? 'http://localhost:5000/api'                                   // backend local
  : (import.meta.env.VITE_API_URL || 'https://ami-backend-gvuw.onrender.com/api'); // backend distant

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

// Intercepteur pour ajouter le token admin à chaque requête (si disponible)
api.interceptors.request.use(async (config) => {
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