import { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import { ChevronRight, ChevronDown, Download, RefreshCw } from 'lucide-react';

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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState(null);
  const [activeTab, setActiveTab] = useState('honored');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCat, setExpandedCat] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Charger les dons, utilisateurs et catégories
  const fetchData = async () => {
    setLoading(true);
    try {
      const [donRes, userRes, catRes] = await Promise.all([
        api.get('/donations'),
        api.get('/auth/users'),
        api.get('/service-items/categories')
      ]);
      let successfulDonations = donRes.data.filter(d => d.status === 'success');
      successfulDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDonations(successfulDonations);
      setUsers(userRes.data);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Erreur chargement données', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  if (loading) return <div className="text-center py-10">Chargement des données...</div>;

  // Map utilisateurs
  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.id, { full_name: u.full_name, phone: u.phone, profile: u.UserProfile || {} });
  });
  const getUserInfo = (userId) => userMap.get(userId) || { full_name: '', phone: '', profile: {} };

  // ------------------------------------------------
  // 1. Engagements honorés – structure par catégories
  // ------------------------------------------------

  // Récupère les dons pour une catégorie spéciale (Fonctionnement, Missionnaire, Structures)
  const getSpecialDonations = (catName) => {
    if (catName === 'Fonctionnement de l\'AMI') {
      return donations.filter(d => d.description === 'Fonctionnement de l\'AMI');
    }
    if (catName === 'Missionnaire') {
      return donations.filter(d => d.description && d.description.startsWith('Missionnaire - '));
    }
    if (catName === 'Structures et Organisations') {
      return donations.filter(d => d.description === 'Structures et Organisations');
    }
    return [];
  };

  // Pour une catégorie normale (Champs, Projets, etc.), récupère les dons associés à un item
  const getItemDonations = (categoryName, itemName) => {
    const prefix = `${categoryName} - ${itemName}`;
    return donations.filter(d => d.description === prefix);
  };

  // Total des montants
  const totalAmount = (list) => list.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  // Export Excel d'une liste de dons
  const exportDonationsToExcel = (donationsList, title, columns) => {
    if (!donationsList.length) return alert('Aucun don à exporter');
    const exportData = donationsList.map((d, idx) => {
      const user = getUserInfo(d.user_id);
      const { date, time } = formatDateTime(d.createdAt);
      const row = { '#': idx + 1 };
      columns.forEach(col => {
        if (col.field === 'full_name') row[col.label] = user.full_name;
        else if (col.field === 'first_name') row[col.label] = user.profile.first_name || '';
        else if (col.field === 'phone') row[col.label] = user.phone;
        else if (col.field === 'amount') row[col.label] = `${d.amount} FCFA`;
        else if (col.field === 'payment_method') row[col.label] = (d.payment_method || '').toUpperCase();
        else if (col.field === 'reason') row[col.label] = d.extra_data?.reason || '';
        else if (col.field === 'missionnaire') {
          const name = d.description?.replace('Missionnaire - ', '') || '';
          row[col.label] = name;
        }
        else if (col.field === 'organizationName') row[col.label] = d.extra_data?.organizationName || '';
        else if (col.field === 'destination') row[col.label] = d.extra_data?.destination || '';
        else if (col.field === 'date') row[col.label] = date;
        else if (col.field === 'time') row[col.label] = time;
        else row[col.label] = d[col.field] || '';
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0, 19)}.xlsx`);
  };

  // Composant Tableau réutilisable
  const DonTable = ({ title, donations: rawDonations, columns, extraData }) => {
    if (!rawDonations.length) return null;
    const donationsSorted = [...rawDonations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = totalAmount(donationsSorted);
    const handleExport = () => exportDonationsToExcel(donationsSorted, title, columns);
    return (
      <div className="mb-4">
        <div className="flex justify-end mb-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
            <Download size={14} /> Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                {columns.map(col => <th key={col.field} className="p-2 border text-left">{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {donationsSorted.map((d, idx) => {
                const user = getUserInfo(d.user_id);
                const { date, time } = formatDateTime(d.createdAt);
                return (
                  <tr key={d.id} className="border-b">
                    <td className="p-2 text-center">{idx + 1}</td>
                    <td className="p-2">{user.full_name}</td>
                    <td className="p-2">{user.profile.first_name || ''}</td>
                    <td className="p-2">{user.phone}</td>
                    <td className="p-2 text-right">{d.amount} FCFA</td>
                    {columns.some(c => c.field === 'payment_method') && (
                      <td className="p-2">{(d.payment_method || '').toUpperCase()}</td>
                    )}
                    {columns.some(c => c.field === 'missionnaire') && (
                      <td className="p-2">{d.description?.replace('Missionnaire - ', '') || ''}</td>
                    )}
                    {columns.some(c => c.field === 'organizationName') && (
                      <td className="p-2">{d.extra_data?.organizationName || ''}</td>
                    )}
                    {columns.some(c => c.field === 'destination') && (
                      <td className="p-2">{d.extra_data?.destination || ''}</td>
                    )}
                    <td className="p-2">{d.extra_data?.reason || ''}</td>
                    <td className="p-2">{date}</td>
                    <td className="p-2">{time}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan={columns.length - 1} className="p-2 text-right">Total :</td>
                <td className="p-2 text-right">{total} FCFA</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Définition des colonnes par type de tableau
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
    { field: 'destination', label: 'Destinations des fonds' }, { field: 'reason', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];
  const columnsGeneric = [
    ...columnsFonctionnement.slice(0, 5),
    { field: 'payment_method', label: 'Réseaux' }, { field: 'reason', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];

  // Liste des catégories spéciales
  const specialCategories = [
    { id: 'fonctionnement', name: 'Fonctionnement de l\'AMI' },
    { id: 'missionnaire', name: 'Missionnaire' },
    { id: 'structures', name: 'Structures et Organisations' }
  ];

  // Catégories dynamiques (Champs, Projets, etc.) – on ignore celles déjà traitées
  const dynamicCategoriesList = categories.filter(cat =>
    !['Missionnaire', 'Fonctionnement de l\'AMI'].includes(cat.name)
  );

  // Fonction pour obtenir les colonnes appropriées pour une catégorie
  const getColumnsForCategory = (catName) => {
    if (catName === 'Fonctionnement de l\'AMI') return columnsFonctionnement;
    if (catName === 'Missionnaire') return columnsMissionnaire;
    if (catName === 'Structures et Organisations') return columnsStructures;
    return columnsGeneric;
  };

  // ---------------------------------------------------------
  // 2. Soutiens des partenaires (inchangé, mais adapté pour utiliser les nouvelles données)
  // ---------------------------------------------------------
  const userDonationsMap = new Map();
  donations.forEach(d => {
    const userId = d.user_id;
    if (!userDonationsMap.has(userId)) userDonationsMap.set(userId, []);
    userDonationsMap.get(userId).push({
      ...d,
      user: getUserInfo(userId),
      userProfile: getUserInfo(userId).profile
    });
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
        'MOTIFS': d.extra_data?.reason || '',
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
                            <td className="p-1 border">{d.extra_data?.reason || ''}</td>
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

  // Rafraîchissement manuel
  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dons</h1>
        <button onClick={handleRefresh} className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2">
          <RefreshCw size={18} /> Rafraîchir
        </button>
      </div>

      {/* Onglets */}
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

      {/* Contenu onglet Engagements honorés */}
      {activeTab === 'honored' ? (
        <div className="space-y-3">
          {/* Catégories spéciales */}
          {specialCategories.map(cat => {
            const donationsList = getSpecialDonations(cat.name);
            const columns = getColumnsForCategory(cat.name);
            const hasDonations = donationsList.length > 0;
            return (
              <div key={cat.id} className="bg-white rounded-xl shadow overflow-hidden">
                <button
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                  className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
                >
                  <span className="text-lg font-semibold text-gray-700">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{donationsList.length} don(s)</span>
                    {expandedCat === cat.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>
                {expandedCat === cat.id && (
                  <div className="border-t p-4">
                    {!hasDonations ? (
                      <p className="text-gray-500">Aucun don pour "{cat.name}".</p>
                    ) : (
                      <DonTable title={cat.name} donations={donationsList} columns={columns} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Catégories dynamiques (Champs, Projets, IIFM, Départements, Activités, Social, Equipements, Zones) */}
          {dynamicCategoriesList.map(cat => {
            const hasItems = cat.items && cat.items.length > 0;
            if (!hasItems) return null;
            return (
              <div key={cat.id} className="bg-white rounded-xl shadow overflow-hidden">
                <button
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                  className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
                >
                  <span className="text-lg font-semibold text-gray-700">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{cat.items.length} élément(s)</span>
                    {expandedCat === cat.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>
                {expandedCat === cat.id && (
                  <div className="border-t p-4">
                    <div className="space-y-2">
                      {cat.items.map(item => {
                        const itemDonations = getItemDonations(cat.name, item.name);
                        const total = totalAmount(itemDonations);
                        return (
                          <div key={item.id} className="border rounded-lg">
                            <button
                              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                              className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
                            >
                              <span className="font-medium">{item.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">{itemDonations.length} don(s) - Total: {total} FCFA</span>
                                {expandedItem === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </button>
                            {expandedItem === item.id && (
                              <div className="p-3 border-t bg-gray-50">
                                {itemDonations.length === 0 ? (
                                  <p className="text-gray-500">Aucun don pour cet élément.</p>
                                ) : (
                                  <DonTable
                                    title={`${cat.name} - ${item.name}`}
                                    donations={itemDonations}
                                    columns={columnsGeneric}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {donations.length === 0 && (
            <p className="text-gray-500 text-center py-6">Aucun don honoré pour le moment.</p>
          )}
        </div>
      ) : (
        // Onglet Soutiens des partenaires
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