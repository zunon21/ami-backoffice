import { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

// Helper pour formater date et heure
const formatDateTime = (isoString) => {
  const d = new Date(isoString);
  return {
    date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
    time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  };
};

export default function Dons() {
  const [donations, setDonations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [activeTab, setActiveTab] = useState('honored');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-login admin
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

  // Charger les dons (uniquement status success) et les utilisateurs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [donRes, userRes] = await Promise.all([
          api.get('/donations'),
          api.get('/auth/users')
        ]);
        let successfulDonations = donRes.data.filter(d => d.status === 'success');
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

  if (loading) return <div className="text-center py-10">Chargement des données...</div>;

  // --- Regroupement des dons pour "Engagements honorés" ---
  const categories = {
    'Fonctionnement de l\'AMI': [],
    'Missionnaire': [],
    'Structures et Organisations': [],
  };
  const dynamicCategories = new Set();

  donations.forEach(d => {
    let category = null;
    let itemName = null;
    let extra = null;
    const desc = d.description || '';
    const extraData = d.extra_data || {};

    if (desc === 'Fonctionnement de l\'AMI') {
      category = 'Fonctionnement de l\'AMI';
    } else if (desc && desc.startsWith('Missionnaire - ')) {
      category = 'Missionnaire';
      itemName = desc.replace('Missionnaire - ', '');
    } else if (desc === 'Structures et Organisations') {
      category = 'Structures et Organisations';
      extra = extraData;
    } else {
      const parts = desc.split(' - ');
      if (parts.length >= 2) {
        category = parts[0];
        itemName = parts.slice(1).join(' - ');
        dynamicCategories.add(category);
      } else {
        category = 'Autres';
        dynamicCategories.add('Autres');
      }
    }

    if (category) {
      if (!categories[category]) categories[category] = [];
      categories[category].push({ ...d, itemName, extra });
    }
  });
  dynamicCategories.forEach(cat => {
    if (!categories[cat]) categories[cat] = [];
  });

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

  // Fonction pour afficher un tableau avec colonnes adaptées
  const renderDonTable = (title, donationsRaw, columnsConfig) => {
    if (!donationsRaw.length) return null;
    const donations = [...donationsRaw].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

    const handleExport = () => {
      const exportData = donations.map((d, idx) => {
        const row = { '#': idx + 1 };
        columnsConfig.forEach(col => {
          let val = '';
          if (col.field === 'full_name') val = d.user?.full_name || '';
          else if (col.field === 'first_name') val = d.userProfile?.first_name || '';
          else if (col.field === 'phone') val = d.user?.phone || '';
          else if (col.field === 'amount') val = `${d.amount} FCFA`;
          else if (col.field === 'payment_method') val = (d.payment_method || '').toUpperCase();
          else if (col.field === 'reason') val = d.reason || '';
          else if (col.field === 'missionnaire') val = d.itemName || '';
          else if (col.field === 'organizationName') val = d.extra?.organizationName || '';
          else if (col.field === 'destination') val = d.extra?.destination || '';
          else if (col.field === 'motifs') val = d.extra?.reason || d.reason || '';
          else if (col.field === 'date') val = formatDateTime(d.createdAt).date;
          else if (col.field === 'time') val = formatDateTime(d.createdAt).time;
          else val = d[col.field] || '';
          row[col.label] = val;
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title);
      XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0, 19)}.xlsx`);
    };

    return (
      <div key={title} className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button onClick={handleExport} className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
            📥 Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                {columnsConfig.map(col => <th key={col.field} className="p-2 border text-left">{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {donations.map((d, idx) => {
                const { date, time } = formatDateTime(d.createdAt);
                return (
                  <tr key={d.id} className="border-b">
                    <td className="p-2 text-center">{idx + 1}</td>
                    <td className="p-2">{d.user?.full_name || ''}</td>
                    <td className="p-2">{d.userProfile?.first_name || ''}</td>
                    <td className="p-2">{d.user?.phone || ''}</td>
                    <td className="p-2 text-right">{d.amount} FCFA</td>
                    {columnsConfig.some(c => c.field === 'payment_method') && (
                      <td className="p-2">{(d.payment_method || '').toUpperCase()}</td>
                    )}
                    {columnsConfig.some(c => c.field === 'missionnaire') && (
                      <td className="p-2">{d.itemName || ''}</td>
                    )}
                    {columnsConfig.some(c => c.field === 'organizationName') && (
                      <td className="p-2">{d.extra?.organizationName || ''}</td>
                    )}
                    {columnsConfig.some(c => c.field === 'destination') && (
                      <td className="p-2">{d.extra?.destination || ''}</td>
                    )}
                    <td className="p-2">{d.extra?.reason || d.reason || ''}</td>
                    <td className="p-2">{date}</td>
                    <td className="p-2">{time}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={columnsConfig.length - 1} className="p-2 text-right">Total général :</td>
                <td className="p-2 text-right">{total} FCFA</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Définition des colonnes
  const columnsFonctionnement = [
    { field: '#', label: '#' }, { field: 'full_name', label: 'Nom' }, { field: 'first_name', label: 'Prénoms' },
    { field: 'phone', label: 'Téléphone' }, { field: 'amount', label: 'Montant (FCFA)' },
    { field: 'payment_method', label: 'Réseaux' }, { field: 'reason', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];
  const columnsMissionnaire = [
    ...columnsFonctionnement.slice(0, 5),
    { field: 'payment_method', label: 'Réseaux' }, { field: 'missionnaire', label: 'Missionnaire Bénéficiaire' },
    { field: 'reason', label: 'Motifs' }, { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];
  const columnsStructures = [
    ...columnsFonctionnement.slice(0, 5),
    { field: 'payment_method', label: 'Réseaux' }, { field: 'organizationName', label: 'Nom de l\'organisation' },
    { field: 'destination', label: 'Destinations des fonds' }, { field: 'motifs', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];
  const columnsGeneric = [
    ...columnsFonctionnement.slice(0, 5),
    { field: 'payment_method', label: 'Réseaux' }, { field: 'reason', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];

  // --- Soutiens des partenaires ---
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

  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    const fullName = (user.full_name || '').toLowerCase();
    const firstName = (user.UserProfile?.first_name || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || firstName.includes(term);
  }).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

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

  // --- Rendu avec onglets ---
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dons</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-6 font-medium text-sm focus:outline-none ${
            activeTab === 'honored'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('honored')}
        >
          Engagements honorés
        </button>
        <button
          className={`py-2 px-6 font-medium text-sm focus:outline-none ${
            activeTab === 'partners'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('partners')}
        >
          Soutiens des partenaires
        </button>
      </div>

      {activeTab === 'honored' ? (
        <div>
          {categories['Fonctionnement de l\'AMI']?.length > 0 &&
            renderDonTable(
              'Fonctionnement de l\'AMI',
              categories['Fonctionnement de l\'AMI'].map(enrichDonation),
              columnsFonctionnement
            )}
          {categories['Missionnaire']?.length > 0 &&
            renderDonTable(
              'Missionnaire',
              categories['Missionnaire'].map(enrichDonation),
              columnsMissionnaire
            )}
          {categories['Structures et Organisations']?.length > 0 &&
            renderDonTable(
              'Structures et Organisations',
              categories['Structures et Organisations'].map(enrichDonation),
              columnsStructures
            )}
          {Array.from(dynamicCategories)
            .filter(cat => cat !== 'Autres')
            .sort()
            .map(cat => {
              const catDonations = categories[cat] || [];
              if (catDonations.length === 0) return null;
              return renderDonTable(
                cat,
                catDonations.map(enrichDonation),
                columnsGeneric
              );
            })}
          {Object.values(categories).every(arr => arr.length === 0) && (
            <p className="text-gray-500">Aucun don honoré pour le moment.</p>
          )}
        </div>
      ) : (
        <div>
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
      )}
    </div>
  );
}