import { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

export default function Partenaires() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/auth/users');
        // S'assurer que chaque utilisateur a un UserProfile (même vide)
        const enriched = res.data.map(u => ({
          ...u,
          UserProfile: u.UserProfile || {}
        }));
        setUsers(enriched);
      } catch (err) {
        console.error('Erreur chargement utilisateurs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const exportToExcel = () => {
    const exportData = users.map(u => ({
      'Nom': u.full_name || '',
      'Prénoms': u.UserProfile?.first_name || '',
      'Sexe': u.UserProfile?.gender || '',
      'Âge': u.UserProfile?.age || '',
      'Ville de résidence': u.UserProfile?.city || '',
      'Profession': u.UserProfile?.profession || '',
      'Église / organisation': u.UserProfile?.church_org || '',
      'Téléphone': u.phone,
      'Date inscription': new Date(u.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partenaires_AMI');
    XLSX.writeFile(wb, `partenaires_ami_${new Date().toISOString().slice(0,19)}.xlsx`);
  };

  if (loading) return <div className="text-center py-10">Chargement des partenaires...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Partenaires de l'AMI</h1>
        <button 
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          📥 Exporter Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prénoms</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sexe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Âge</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profession</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Église/Org.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-6 text-gray-500">Aucun partenaire inscrit</td></tr>
              ) : (
                users.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.full_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.UserProfile?.first_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.UserProfile?.gender || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.UserProfile?.age || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.UserProfile?.city || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.UserProfile?.profession || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.UserProfile?.church_org || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}