import { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

export default function Dons() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-login si pas de token
  useEffect(() => {
    const autoLogin = async () => {
      if (!localStorage.getItem('adminToken')) {
        try {
          const res = await api.post('/auth/admin/login', { password: 'admin123' });
          localStorage.setItem('adminToken', res.data.token);
        } catch (err) {
          console.error('Auto-login échoué', err);
        }
      }
    };
    autoLogin();
  }, []);

  // Charger les dons
  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const res = await api.get('/donations');
        setDonations(res.data);
      } catch (err) {
        console.error('Erreur chargement dons', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, []);

  const exportToExcel = () => {
    if (donations.length === 0) {
      alert('Aucun don à exporter');
      return;
    }
    const exportData = donations.map(d => ({
      'Montant (FCFA)': d.amount,
      'Statut': d.status,
      'Référence': d.transaction_reference || '',
      'Date': new Date(d.createdAt).toLocaleDateString(),
      'ID Utilisateur': d.user_id || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dons');
    XLSX.writeFile(wb, `dons_ami_${new Date().toISOString().slice(0,19)}.xlsx`);
  };

  if (loading) return <div className="text-center py-10">Chargement des dons...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dons</h1>
        <button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          📥 Exporter Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {donations.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Aucun don enregistré</td>
              </tr>
            ) : (
              donations.map((don, idx) => (
                <tr key={don.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{don.amount} FCFA</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      don.status === 'success' ? 'bg-green-100 text-green-800' :
                      don.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {don.status === 'success' ? 'Réussi' : don.status === 'pending' ? 'En attente' : 'Échoué'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{don.transaction_reference || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(don.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
