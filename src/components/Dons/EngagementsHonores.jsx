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

export default function EngagementsHonores() {
  const [donations, setDonations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [donRes, userRes] = await Promise.all([
          api.get('/donations'),
          api.get('/auth/users')
        ]);
        // Ne garder que les dons réussis
        let successfulDonations = donRes.data.filter(d => d.status === 'success');
        successfulDonations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setDonations(successfulDonations);
        setUsers(userRes.data);
      } catch (err) {
        console.error('Erreur chargement Engagements honorés', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-10">Chargement des engagements honorés...</div>;
  if (!donations.length) return <p className="text-gray-500">Aucun don honoré pour le moment.</p>;

  // --- Regroupement par catégorie (identique à la logique d'origine) ---
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

  // Associer les utilisateurs
  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.id, { full_name: u.full_name, phone: u.phone, profile: u.UserProfile || {} });
  });
  const enrichDonation = (d) => ({
    ...d,
    user: userMap.get(d.user_id) || { full_name: '', phone: '', profile: {} },
    userProfile: (userMap.get(d.user_id) || {}).profile
  });

  // Fonction générique pour afficher un tableau
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

  return (
    <div>
      {/* Fonctionnement de l'AMI */}
      {categories['Fonctionnement de l\'AMI']?.length > 0 &&
        renderDonTable(
          'Fonctionnement de l\'AMI',
          categories['Fonctionnement de l\'AMI'].map(enrichDonation),
          columnsFonctionnement
        )}

      {/* Missionnaire */}
      {categories['Missionnaire']?.length > 0 &&
        renderDonTable(
          'Missionnaire',
          categories['Missionnaire'].map(enrichDonation),
          columnsMissionnaire
        )}

      {/* Structures et Organisations */}
      {categories['Structures et Organisations']?.length > 0 &&
        renderDonTable(
          'Structures et Organisations',
          categories['Structures et Organisations'].map(enrichDonation),
          columnsStructures
        )}

      {/* Catégories dynamiques (Champs, Projets, IIFM, etc.) */}
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
  );
}