import { useEffect, useState } from 'react';
import api from '../services/api';
import { Trash2, Edit, Plus, X, Check, GripVertical } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = { SERVICE_ITEM: 'serviceItem' };

const DraggableItem = ({ item, index, onDragEnd, onEdit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SERVICE_ITEM,
    item: { id: item.id, originalIndex: index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: (item, monitor) => {
      const didDrop = monitor.didDrop();
      if (!didDrop) return;
      const { finalIndex } = monitor.getDropResult() || {};
      if (finalIndex !== undefined && finalIndex !== item.originalIndex) {
        onDragEnd(item.originalIndex, finalIndex);
      }
    },
  });

  const [, drop] = useDrop({
    accept: ItemTypes.SERVICE_ITEM,
    hover: (draggedItem) => {
      if (draggedItem.id === item.id) return;
      onDragEnd(draggedItem.originalIndex, index);
      draggedItem.originalIndex = index;
    },
    drop: () => ({ finalIndex: index }),
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center justify-between border rounded-lg p-3 bg-gray-50 cursor-move"
    >
      <div className="flex items-center gap-2">
        <GripVertical size={18} className="text-gray-400" />
        <span className="text-gray-800">{item.name}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800">
          <Edit size={18} />
        </button>
        <button onClick={() => onDelete(item)} className="text-red-600 hover:text-red-800">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default function DiversEngagements() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await api.get('/service-items/categories');
      const cats = res.data || [];
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
        setItems(cats[0].items || []);
      } else if (selectedCategory) {
        const updatedCat = cats.find((c) => c.id === selectedCategory.id);
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
        name: newItemName.trim(),
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

  const onDragEnd = async (oldIndex, newIndex) => {
    if (oldIndex === newIndex) return;
    const newItems = Array.from(items);
    const [movedItem] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movedItem);
    setItems(newItems);
    try {
      const orderIds = newItems.map((item) => item.id);
      await api.post('/service-items/reorder', {
        category_id: selectedCategory.id,
        item_ids: orderIds,
      });
      await fetchCategories(); // re-synchronise
    } catch (err) {
      console.error('Erreur lors de la réorganisation:', err);
      alert('Erreur lors de la sauvegarde de l’ordre. Veuillez réessayer.');
      await fetchCategories(); // annule le changement local
    }
  };

  if (loading) return <div className="text-center py-10">Chargement...</div>;
  if (categories.length === 0)
    return <div className="text-center py-10 text-red-500">Aucune catégorie trouvée.</div>;

  const categoriesToShow = categories.filter((cat) => cat.name !== 'Missionnaires');

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Divers engagements</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {categoriesToShow.map((cat) => (
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
              <div className="space-y-2">
                {items.map((item, index) => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    index={index}
                    onDragEnd={onDragEnd}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
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
    </DndProvider>
  );
}