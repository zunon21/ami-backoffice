import { useEffect, useState } from 'react';
import api from '../../services/api';
import * as XLSX from 'xlsx';

// Helper pour formater date et heure
const formatDateTime = (isoString) => {
  const d = new Date(isoString);
  return {
    date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
    time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  };
};

export default function SoutiensPartenaires() {
  const [donations, setDonations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-login admin (si besoin)
  useEffect(() => {
    const autoLogin = async () => {
      if (!localStorage.getItem('adminToken')) {
        try {
          const res = await api.post('/auth/admin/login', { password: 'AMI1990' });
          localStorage.setItem('adminToken', res.data.token);
        } catch (err) {
          console.error('Auto-login échoué', err);
        }
      }
    };
    autoLogin();
  }, []);

  // Charger les dons réussis et les utilisateurs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [donRes, userRes] = await Promise.all([
          api.get('/donations'),
          api.get('/auth/users')
        ]);
        const successfulDonations = donRes.data.filter(d => d.status === 'success');
        successfulDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setDonations(successfulDonations);
        setUsers(userRes.data);
      } catch (err) {
        console.error('Erreur chargement données', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-10">Chargement des partenaires...</div>;

  // Associer les profils utilisateur
  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.id, { full_name: u.full_name, phone: u.phone, profile: u.UserProfile || {} });
  });
  const enrichDonation = (d) => ({
    ...d,
    user: userMap.get(d.user_id) || { full_name: '', phone: '', profile: {} },
    userProfile: (userMap.get(d.user_id) || {}).profile
  });

  // Regrouper les dons par utilisateur
  const userDonationsMap = new Map();
  donations.forEach(d => {
    const userId = d.user_id;
    if (!userDonationsMap.has(userId)) userDonationsMap.set(userId, []);
    userDonationsMap.get(userId).push(enrichDonation(d));
  });
  for (let [userId, userDons] of userDonationsMap.entries()) {
    userDons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    userDonationsMap.set(userId, userDons);
  }

  // Filtrer les utilisateurs selon la recherche (nom ou prénom)
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    const fullName = (user.full_name || '').toLowerCase();
    const firstName = (user.UserProfile?.first_name || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || firstName.includes(term);
  }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  // Composant pour une ligne partenaire (avec expansion)
  const PartnerRow = ({ user }) => {
    const userDonations = userDonationsMap.get(user.id) || [];
    const isExpanded = expandedPartner === user.id;
    const total = userDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    const exportPartnerDonations = () => {
      if (!userDonations.length) return alert('Aucun don pour ce partenaire');
      const exportData = userDonations.map((d, idx) => ({
        '#': idx + 1,
        'NOM DE L\'ENGAGEMENT': d.description || 'Don AMI',
        'MONTANTS': `${d.amount} FCFA`,
        'MOTIFS': d.reason || '',
        'RESEAUX': (d.payment_method || '').toUpperCase(),
        'DATE': formatDateTime(d.createdAt).date,
        'HEURES': formatDateTime(d.createdAt).time
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${user.full_name}_dons`);
      XLSX.writeFile(wb, `${user.full_name}_dons_${new Date().toISOString().slice(0, 19)}.xlsx`);
    };

    return (
      <div className="border rounded-lg mb-2">
        <div
          className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
          onClick={() => setExpandedPartner(isExpanded ? null : user.id)}
        >
          <div className="flex gap-6">
            <span className="font-medium w-32">{user.full_name || '—'}</span>
            <span className="w-32">{user.UserProfile?.first_name || '—'}</span>
            <span className="w-36">{user.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{userDonations.length} don(s) - Total {total} FCFA</span>
            {isExpanded ? <span>▲</span> : <span>▼</span>}
          </div>
        </div>
        {isExpanded && (
          <div className="p-3 border-t">
            {userDonations.length === 0 ? (
              <p className="text-gray-500">Aucun don effectué.</p>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <button onClick={exportPartnerDonations} className="bg-green-600 text-white px-2 py-1 rounded text-sm">📥 Excel</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-1 border">#</th>
                        <th className="p-1 border">NOM DE L’ENGAGEMENT</th>
                        <th className="p-1 border">MONTANTS</th>
                        <th className="p-1 border">MOTIFS</th>
                        <th className="p-1 border">RESEAUX</th>
                        <th className="p-1 border">DATE</th>
                        <th className="p-1 border">HEURES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userDonations.map((d, idx) => {
                        const { date, time } = formatDateTime(d.createdAt);
                        return (
                          <tr key={d.id}>
                            <td className="p-1 border text-center">{idx + 1}</td>
                            <td className="p-1 border">{d.description || 'Don AMI'}</td>
                            <td className="p-1 border text-right">{d.amount} FCFA</td>
                            <td className="p-1 border">{d.reason || ''}</td>
                            <td className="p-1 border">{(d.payment_method || '').toUpperCase()}</td>
                            <td className="p-1 border">{date}</td>
                            <td className="p-1 border">{time}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-200 font-bold">
                      <tr>
                        <td colSpan="2" className="p-1 border">Total</td>
                        <td className="p-1 border text-right">{total} FCFA</td>
                        <td colSpan="4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Barre de recherche */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Chercher par nom"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-80 px-4 py-2 pl-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="text-gray-500">Aucun partenaire trouvé.</p>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => <PartnerRow key={user.id} user={user} />)}
        </div>
      )}
    </div>
  );
}