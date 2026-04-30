import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Envoi du mot de passe fixe pour obtenir un token
        const res = await api.post('/auth/admin/login', { password: 'AMI1990' });
        localStorage.setItem('adminToken', res.data.token);
        // Redirection vers le tableau de bord
        navigate('/dashboard');
      } catch (err) {
        console.error('Échec de la connexion automatique', err);
        // En cas d’erreur, vous pouvez afficher un message ou rester sur la page
      }
    };
    autoLogin();
  }, [navigate]);

  // Pendant la connexion, on affiche un message de chargement
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center">
        <p className="text-gray-600">Connexion automatique en cours...</p>
      </div>
    </div>
  );
}