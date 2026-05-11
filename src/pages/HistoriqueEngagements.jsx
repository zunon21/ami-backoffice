import { useEffect, useState } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import { ChevronRight, ChevronDown, Download, RefreshCw } from 'lucide-react';

const normalize = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export default function HistoriqueEngagements() {
  const [categories, setCategories] = useState([]);
  const [serviceCommitments, setServiceCommitments] = useState([]);
  const [monthlyCommitments, setMonthlyCommitments] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, serviceRes, monthlyRes] = await Promise.all([
        api.get('/service-items/categories'),
        api.get('/auth/service-commitments/all'),
        api.get('/auth/commitments/all')
      ]);
      setCategories(catRes.data || []);
      setServiceCommitments(serviceRes.data || []);
      setMonthlyCommitments(monthlyRes.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const totalAmount = (commitments) => {
    return commitments.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  };

  const exportToExcel = (data, filename) => {
    if (!data.length) return alert('Aucune donnée');
    const exportData = data.map((c, idx) => ({
      '#': idx + 1,
      'Nom': c.User?.full_name || '',
      'Prénoms': c.UserProfile?.first_name || '',
      'Téléphone': c.User?.phone || '',
      'Montant (FCFA)': c.amount,
      'Jour': c.day_of_month,
      'Missionnaire Bénéficiaire': c.service_name === 'Missionnaire' ? (c.item_name || '') : '',
      'Motifs': c.reason || '',
      'Périodicité': c.periodicity,
      'Date': new Date(c.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  if (loading && categories.length === 0) return <div className="text-center py-10">Chargement...</div>;
  if (error) return <div className="text-red-500 p-4">Erreur : {error}</div>;

  const missionnaireCommitments = serviceCommitments.filter(c =>
    c.service_name && normalize(c.service_name).includes('missionnaire')
  );
  const sortedMonthly = [...monthlyCommitments].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sortedMissionnaire = [...missionnaireCommitments].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const specialCategories = [
    { id: 'fonctionnement', name: 'Fonctionnement de l\'AMI', items: [], direct: true, commitments: sortedMonthly },
    { id: 'missionnaires', name: 'Missionnaires', items: [], direct: true, commitments: sortedMissionnaire }
  ];
  const otherCategories = categories.filter(cat => cat.name !== 'Missionnaires' && cat.name !== 'Fonctionnement de l\'AMI');
  const allCategories = [...specialCategories, ...otherCategories];

  const getItemCommitments = (item, categoryName) => {
    let matches = [];
    if (item.id && !String(item.id).startsWith('virt')) {
      const byId = serviceCommitments.filter(c => c.item_id === item.id);
      if (byId.length > 0) matches = byId;
    }
    if (matches.length === 0) {
      const normalizedCat = normalize(categoryName);
      const normalizedItem = normalize(item.name);
      matches = serviceCommitments.filter(c =>
        normalize(c.service_name) === normalizedCat && normalize(c.item_name) === normalizedItem
      );
    }
    return matches.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString() : '';

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Historique des engagements</h1>
        <button onClick={handleRefresh} className="bg-blue-500 text-white px-3 py-2 rounded-lg flex items-center gap-2">
          <RefreshCw size={18} /> Rafraîchir
        </button>
      </div>
      <div className="space-y-3">
        {allCategories.map(cat => {
          const isSpecial = cat.direct === true;
          const directCommitments = isSpecial ? (cat.commitments || []) : [];
          const hasItems = !isSpecial && cat.items && cat.items.length > 0;

          return (
            <div key={cat.id} className="bg-white rounded-xl shadow overflow-hidden">
              <button
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
              >
                <span className="text-lg font-semibold text-gray-700">{cat.name}</span>
                <div className="flex items-center gap-3">
                  {hasItems && <span className="text-sm text-gray-500">{cat.items.length} élément(s)</span>}
                  {expandedCat === cat.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </button>

              {expandedCat === cat.id && (
                <div className="border-t p-4">
                  {isSpecial && (
                    <div>
                      {directCommitments.length === 0 ? (
                        <p className="text-gray-500">Aucun engagement pour "{cat.name}".</p>
                      ) : (
                        <>
                          <div className="flex justify-end mb-3">
                            <button onClick={() => exportToExcel(directCommitments, cat.name.replace(/\s/g, '_'))} className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1">
                              <Download size={16} /> Excel
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm border">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="p-2">#</th>
                                  <th className="p-2">Nom</th>
                                  <th className="p-2">Prénoms</th>
                                  <th className="p-2">Téléphone</th>
                                  <th className="p-2">Montant (FCFA)</th>
                                  <th className="p-2">Jour</th>
                                  {cat.name === 'Missionnaires' && <th className="p-2">Missionnaire Bénéficiaire</th>}
                                  <th className="p-2">Motifs</th>
                                  <th className="p-2">Périodicité</th>
                                  <th className="p-2">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {directCommitments.map((eng, idx) => (
                                  <tr key={eng.id}>
                                    <td className="p-2">{idx + 1}</td>
                                    <td className="p-2">{eng.User?.full_name || ''}</td>
                                    <td className="p-2">{eng.UserProfile?.first_name || ''}</td>
                                    <td className="p-2">{eng.User?.phone || ''}</td>
                                    <td className="p-2">{eng.amount} FCFA</td>
                                    <td className="p-2">{eng.day_of_month}</td>
                                    {cat.name === 'Missionnaires' && <td className="p-2">{eng.item_name || ''}</td>}
                                    <td className="p-2">{eng.reason || '-'}</td>
                                    <td className="p-2">{eng.periodicity}</td>
                                    <td className="p-2">{formatDate(eng.createdAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-100 font-bold">
                                <tr>
                                  <td colSpan={cat.name === 'Missionnaires' ? 4 : 3} className="p-2">Total</td>
                                  <td colSpan={cat.name === 'Missionnaires' ? 6 : 5} className="p-2">{totalAmount(directCommitments)} FCFA</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {hasItems && (
                    <div className="space-y-2">
                      {cat.items.map(item => {
                        const itemCommitments = getItemCommitments(item, cat.name);
                        const total = totalAmount(itemCommitments);
                        return (
                          <div key={item.id} className="border rounded-lg">
                            <button onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} className="w-full flex justify-between items-center p-3 hover:bg-gray-50">
                              <span className="font-medium">{item.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">{itemCommitments.length} engagement(s) - Total: {total} FCFA</span>
                                {expandedItem === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </button>
                            {expandedItem === item.id && (
                              <div className="p-3 border-t bg-gray-50">
                                {itemCommitments.length === 0 ? (
                                  <p className="text-gray-500">Aucun engagement pour cet élément.</p>
                                ) : (
                                  <>
                                    <div className="flex justify-end mb-2">
                                      <button onClick={() => exportToExcel(itemCommitments, `${cat.name}_${item.name}`)} className="bg-green-600 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                                        <Download size={14} /> Excel
                                      </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full text-xs border">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th className="p-1">#</th>
                                            <th className="p-1">Nom</th>
                                            <th className="p-1">Prénoms</th>
                                            <th className="p-1">Téléphone</th>
                                            <th className="p-1">Montant</th>
                                            <th className="p-1">Jour</th>
                                            <th className="p-1">Motifs</th>
                                            <th className="p-1">Périodicité</th>
                                            <th className="p-1">Date</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {itemCommitments.map((eng, idx) => (
                                            <tr key={eng.id}>
                                              <td className="p-1">{idx + 1}</td>
                                              <td className="p-1">{eng.User?.full_name || ''}</td>
                                              <td className="p-1">{eng.UserProfile?.first_name || ''}</td>
                                              <td className="p-1">{eng.User?.phone || ''}</td>
                                              <td className="p-1">{eng.amount} FCFA</td>
                                              <td className="p-1">{eng.day_of_month}</td>
                                              <td className="p-1">{eng.reason || '-'}</td>
                                              <td className="p-1">{eng.periodicity}</td>
                                              <td className="p-1">{formatDate(eng.createdAt)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-gray-200 font-bold">
                                          <tr>
                                            <td colSpan="3" className="p-1">Total</td>
                                            <td colSpan="6" className="p-1">{total} FCFA</td>
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
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}