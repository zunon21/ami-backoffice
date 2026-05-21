import { useEffect, useState } from 'react';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import { ChevronRight, ChevronDown, Download, RefreshCw } from 'lucide-react';

const normalize = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Helper pour formater date et heure
const formatDateTime = (isoString) => {
  const d = new Date(isoString);
  return {
    date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
    time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  };
};

export default function EngagementsHonores() {
  const [donations, setDonations] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [donRes, userRes, catRes] = await Promise.all([
        api.get('/donations'),
        api.get('/auth/users'),
        api.get('/service-items/categories')
      ]);
      let successful = donRes.data.filter(d => d.status === 'success');
      successful.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setDonations(successful);
      setUsers(userRes.data);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  // Map des utilisateurs
  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.id, { full_name: u.full_name, phone: u.phone, profile: u.UserProfile || {} });
  });

  const getUserInfo = (userId) => userMap.get(userId) || { full_name: '', phone: '', profile: {} };

  // Récupère les dons pour une catégorie spéciale
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

  // Pour une catégorie normale et un item, récupère les dons correspondants
  const getItemDonations = (categoryName, itemName) => {
    const fullDescription = `${categoryName} - ${itemName}`;
    return donations.filter(d => d.description === fullDescription);
  };

  const totalAmount = (donationsList) => {
    return donationsList.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  };

  const exportDonationsToExcel = (donationsList, title, columnsConfig) => {
    if (!donationsList.length) return alert('Aucun don à exporter');
    const exportData = donationsList.map((d, idx) => {
      const user = getUserInfo(d.user_id);
      const { date, time } = formatDateTime(d.createdAt);
      const row = { '#': idx + 1 };
      columnsConfig.forEach(col => {
        if (col.field === 'full_name') row[col.label] = user.full_name;
        else if (col.field === 'first_name') row[col.label] = user.profile.first_name || '';
        else if (col.field === 'phone') row[col.label] = user.phone;
        else if (col.field === 'amount') row[col.label] = `${d.amount} FCFA`;
        else if (col.field === 'payment_method') row[col.label] = (d.payment_method || '').toUpperCase();
        else if (col.field === 'reason') row[col.label] = d.extra_data?.reason || '';
        else if (col.field === 'missionnaire') {
          const missionnaireName = d.description?.replace('Missionnaire - ', '') || '';
          row[col.label] = missionnaireName;
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
    { field: 'destination', label: 'Destinations des fonds' }, { field: 'reason', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];
  const columnsGeneric = [
    ...columnsFonctionnement.slice(0, 5),
    { field: 'payment_method', label: 'Réseaux' }, { field: 'reason', label: 'Motifs' },
    { field: 'date', label: 'Date' }, { field: 'time', label: 'Heure' }
  ];

  // Composant tableau réutilisable (similaire à HistoriqueEngagements mais adapté)
  const DonTable = ({ title, donations: rawDonations, columns }) => {
    if (!rawDonations.length) return null;
    const sorted = [...rawDonations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = totalAmount(sorted);
    const handleExport = () => exportDonationsToExcel(sorted, title, columns);
    return (
      <div className="mb-6">
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
              {sorted.map((d, idx) => {
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

  if (loading) return <div className="text-center py-10">Chargement des engagements honorés...</div>;

  // Catégories spéciales
  const specialCategories = [
    { id: 'fonctionnement', name: 'Fonctionnement de l\'AMI', columns: columnsFonctionnement },
    { id: 'missionnaire', name: 'Missionnaire', columns: columnsMissionnaire },
    { id: 'structures', name: 'Structures et Organisations', columns: columnsStructures }
  ];

  // Les autres catégories viennent de l'API (avec leurs items)
  const otherCategories = categories.filter(cat =>
    cat.name !== 'Fonctionnement de l\'AMI' && cat.name !== 'Missionnaire' && cat.name !== 'Structures et Organisations'
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Engagements honorés</h2>
        <button onClick={handleRefresh} className="bg-blue-500 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm">
          <RefreshCw size={16} /> Rafraîchir
        </button>
      </div>

      <div className="space-y-3">
        {/* Catégories spéciales */}
        {specialCategories.map(cat => {
          const catDonations = getSpecialDonations(cat.name);
          return (
            <div key={cat.id} className="bg-white rounded-xl shadow overflow-hidden">
              <button
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
              >
                <span className="text-lg font-semibold text-gray-700">{cat.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{catDonations.length} don(s)</span>
                  {expandedCat === cat.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </button>
              {expandedCat === cat.id && (
                <div className="border-t p-4">
                  {catDonations.length === 0 ? (
                    <p className="text-gray-500">Aucun don pour "{cat.name}".</p>
                  ) : (
                    <DonTable title={cat.name} donations={catDonations} columns={cat.columns} />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Catégories dynamiques (Champs, Projets, etc.) */}
        {otherCategories.map(cat => {
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
    </div>
  );
}