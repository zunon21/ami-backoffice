import { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('request'); // 'request' ou 'verify'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const requestCode = async () => {
    if (!email) {
      setError('Veuillez saisir votre email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/request-admin-otp', { email });
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l’envoi du code');
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/verify-admin-otp', { email, code });
      localStorage.setItem('adminToken', response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Code invalide');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Backoffice AMI</h1>
        {step === 'request' ? (
          <div>
            <input
              type="email"
              placeholder="Email administrateur"
              className="w-full p-2 border rounded mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button
              onClick={requestCode}
              disabled={loading}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Envoi...' : 'Envoyer le code'}
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-gray-600">Un code a été envoyé à {email}</p>
            <input
              type="text"
              placeholder="Code à 6 chiffres"
              className="w-full p-2 border rounded mb-4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-green-300"
            >
              {loading ? 'Vérification...' : 'Se connecter'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}