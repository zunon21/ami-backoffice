import axios from 'axios';

// Utiliser le backend distant en production, local pour le développement
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ami-backend-gvuw.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default api;