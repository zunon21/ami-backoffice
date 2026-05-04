import { useEffect, useState } from 'react';
import api from '../services/api';
import { Archive, Trash2, Eye, X } from 'lucide-react';

export default function Archives() {
  const [archivedItems, setArchivedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [archivedCommitments, setArchivedCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Auto-login
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

  // Charger les éléments archivés (items supprimés)
  const fetchArchivedItems = async () => {
    try {
      const res = await api.get('/archives/items');
      setArchivedItems(res.data);
    } catch (err) {
      console.error('Erreur chargement archives', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedItems();
  }, []);

  // Charger les engagements archivés pour un item
  const fetchArchivedCommitments = async (itemId) => {
    try {
      const res = await api.get(`/archives/commitments/${itemId}`);
      setArchivedCommitments(res.data);
    } catch (err) {
      console.error('Erreur chargement engagements archivés', err);
      setArchivedCommitments([]);
    }
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    fetchArchivedCommitments(item.id);
    setShowModal(true);
  };

  if (loading) return <div className="text-center py-10">Chargement des archives...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Archive size={28} /> Archives
      </h1>
      <p className="text-gray-600 mb-4">Éléments supprimés définitivement de « Divers engagements » (avec leurs engagements associés).</p>

      {archivedItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          Aucun élément archivé.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom de l'élément</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de suppression</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {archivedItems.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category?.name || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewItem(item)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye size={18} /> Voir engagements
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal pour afficher les engagements archivés */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-11/12 md:w-3/4 lg:w-2/3 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Engagements archivés - {selectedItem.name}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {archivedCommitments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun engagement associé à cet élément.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Nom et prénoms</th>
                      <th className="px-4 py-2 text-left">Téléphone</th>
                      <th className="px-4 py-2 text-left">Montant</th>
                      <th className="px-4 py-2 text-left">Jour</th>
                      <th className="px-4 py-2 text-left">Motifs</th>
                      <th className="px-4 py-2 text-left">Périodicité</th>
                      <th className="px-4 py-2 text-left">Date d'engagement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {archivedCommitments.map(eng => (
                      <tr key={eng.id}>
                        <td className="px-4 py-2">{eng.User?.full_name || 'Anonyme'}</td>
                        <td className="px-4 py-2">{eng.User?.phone || ''}</td>
                        <td className="px-4 py-2">{eng.amount} FCFA</td>
                        <td className="px-4 py-2">{eng.day_of_month}</td>
                        <td className="px-4 py-2">{eng.reason || '-'}</td>
                        <td className="px-4 py-2">{eng.periodicity}</td>
                        <td className="px-4 py-2">{new Date(eng.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
