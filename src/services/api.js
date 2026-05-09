import axios from 'axios';

// Utiliser le backend distant en production, local pour le développement
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ami-backend-gvuw.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Fonction pour obtenir un token admin
const getAdminToken = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/admin/login`, { password: 'AMI1990' });
    const token = response.data.token;
    localStorage.setItem('adminToken', token);
    return token;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token admin:', error);
    return null;
  }
};

// Intercepteur pour ajouter le token admin à chaque requête
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