import { useEffect, useState } from 'react';
import api from '../services/api';
import { Trash2, Edit, Plus, X, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function DiversEngagements() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isReordering, setIsReordering] = useState(false);

  // Charger les catégories et items réels depuis l'API
  const fetchCategories = async () => {
    try {
      const res = await api.get('/service-items/categories');
      const cats = res.data || [];
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
        setItems(cats[0].items || []);
      } else if (selectedCategory) {
        const updatedCat = cats.find(c => c.id === selectedCategory.id);
        if (updatedCat) {
          setSelectedCategory(updatedCat);
          setItems(updatedCat.items || []);
        }
      }
    } catch (err) {
      console.error('Erreur chargement catégories :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setItems(category.items || []);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !selectedCategory) return;
    try {
      await api.post('/service-items/items', {
        category_id: selectedCategory.id,
        name: newItemName.trim()
      });
      await fetchCategories();
      setNewItemName('');
      setShowModal(false);
    } catch (err) {
      alert('Erreur lors de l’ajout : ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditItem = async (item) => {
    const newName = prompt('Nouveau nom :', item.name);
    if (!newName || newName === item.name) return;
    try {
      await api.put(`/service-items/items/${item.id}`, { name: newName });
      await fetchCategories();
    } catch (err) {
      alert('Erreur lors de la modification : ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Supprimer définitivement "${item.name}" ?\nTous les engagements associés seront archivés.`)) return;
    try {
      await api.delete(`/service-items/items/${item.id}`);
      await fetchCategories();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + (err.response?.data?.error || err.message));
    }
  };

  // Gestion du drag & drop pour réordonner les items
  const handleDragEnd = async (result) => {
    if (!result.destination || !selectedCategory) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    // Copie locale des items
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(source.index, 1);
    reorderedItems.splice(destination.index, 0, movedItem);
    setItems(reorderedItems); // Mise à jour visuelle immédiate

    // Sauvegarder l'ordre dans le backend
    setIsReordering(true);
    try {
      // Envoyer la liste des IDs dans le nouvel ordre
      const ids = reorderedItems.map(item => item.id);
      await api.post('/service-items/reorder', {
        category_id: selectedCategory.id,
        item_ids: ids
      });
    } catch (err) {
      console.error('Erreur lors de la réorganisation :', err);
      alert('La réorganisation a échoué. Annulation.');
      // Recharger la liste depuis le backend pour annuler le changement local
      await fetchCategories();
    } finally {
      setIsReordering(false);
    }
  };

  if (loading) return <div className="text-center py-10">Chargement...</div>;
  if (categories.length === 0) return <div className="text-center py-10 text-red-500">Aucune catégorie trouvée.</div>;

  // Exclure la catégorie "Missionnaires"
  const categoriesToShow = categories.filter(cat => cat.name !== 'Missionnaires');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Divers engagements</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {categoriesToShow.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleSelectCategory(cat)}
            className={`p-3 rounded-xl text-center transition ${
              selectedCategory?.id === cat.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white hover:bg-blue-50 text-gray-700 border'
            }`}
          >
            <span className="font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
              Éléments de <span className="text-blue-600">{selectedCategory.name}</span>
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={18} /> Ajouter
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun élément. Cliquez sur "Ajouter".</p>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="items-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center justify-between border rounded-lg p-3 bg-gray-50 ${
                              snapshot.isDragging ? 'shadow-lg opacity-70' : ''
                            }`}
                          >
                            <span className="text-gray-800">{item.name}</span>
                            <div className="flex gap-2">
                              <button onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => handleDeleteItem(item)} className="text-red-600 hover:text-red-800">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
          {isReordering && <div className="text-sm text-gray-500 mt-2 text-center">Mise à jour de l'ordre...</div>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Ajouter un élément</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nom de l'élément"
              className="w-full border rounded-lg p-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Annuler</button>
              <button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                <Check size={18} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}