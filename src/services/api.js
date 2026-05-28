import axios from 'axios';

// Déterminer la base URL selon l'environnement
// En développement : backend local, en production : backend Render
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : 'https://ami-backend-gvuw.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Fonction pour obtenir un token admin
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

// Intercepteur pour ajouter le token admin (sauf pour les routes publiques)
api.interceptors.request.use(async (config) => {
  // Ne pas ajouter le token pour les routes publiques (ex: donations)
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