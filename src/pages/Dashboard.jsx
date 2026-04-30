import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [donations, setDonations] = useState([]);
  const [users, setUsers] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [activeTab, setActiveTab] = useState('projects');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedCommitmentId, setExpandedCommitmentId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'project',
    target_amount: '',
    image_url: '',
    is_active: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoLoginDone, setAutoLoginDone] = useState(false);
  const navigate = useNavigate();

  // 1. Auto-login : récupère un token admin si absent
  useEffect(() => {
    const autoLogin = async () => {
      if (!localStorage.getItem('adminToken')) {
        try {
          const res = await api.post('/auth/admin/login', { password: 'admin123' });
          localStorage.setItem('adminToken', res.data.token);
          console.log('Token admin obtenu automatiquement');
        } catch (err) {
          console.error('Erreur lors de l’auto-login :', err.response?.data || err.message);
        }
      }
      setAutoLoginDone(true);
    };
    autoLogin();
  }, []);

  // 2. Chargement des données (uniquement après auto-login)
  useEffect(() => {
    if (!autoLoginDone) return;

    const fetchData = async () => {
      try {
        const [projectsRes, donationsRes, usersRes, commitmentsRes] = await Promise.all([
          api.get('/projects'),
          api.get('/donations'),
          api.get('/auth/users'),
          api.get('/auth/commitments/all'),
        ]);
        setProjects(projectsRes.data);
        setDonations(donationsRes.data);
        setUsers(usersRes.data);
        setCommitments(commitmentsRes.data);
      } catch (err) {
        if (err.response?.status === 401) {
          // Token invalide : on le supprime et on réessaie l'auto-login
          localStorage.removeItem('adminToken');
          setAutoLoginDone(false);
          // Déclencher un nouvel auto-login
          const retry = async () => {
            try {
              const res = await api.post('/auth/admin/login', { password: 'admin123' });
              localStorage.setItem('adminToken', res.data.token);
              setAutoLoginDone(true);
              // Recharger les données
              fetchData();
            } catch (e) {
              console.error('Impossible de se reconnecter');
            }
          };
          retry();
        } else {
          console.error('Erreur chargement :', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [autoLoginDone, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }
    let exportData;
    if (filename === 'projects') {
      exportData = data.map(p => ({
        Nom: p.name,
        Description: p.description,
        Type: p.type,
        Objectif: p.target_amount,
        Image: p.image_url,
        Actif: p.is_active ? 'Oui' : 'Non'
      }));
    } else if (filename === 'donations') {
      exportData = data.map(d => ({
        Montant: d.amount,
        Statut: d.status,
        Date: new Date(d.createdAt).toLocaleDateString(),
        Référence: d.transaction_reference
      }));
    } else if (filename === 'users') {
      exportData = data.map(u => ({
        Nom: u.full_name || 'Anonyme',
        Prénom: u.UserProfile?.first_name || '',
        Téléphone: u.phone,
        Genre: u.UserProfile?.gender || '',
        Âge: u.UserProfile?.age || '',
        Ville: u.UserProfile?.city || '',
        Profession: u.UserProfile?.profession || '',
        Église: u.UserProfile?.church_org || '',
        Vérifié: u.is_verified ? 'Oui' : 'Non',
        Date_inscription: new Date(u.createdAt).toLocaleDateString()
      }));
    } else if (filename === 'commitments') {
      exportData = data.map(c => ({
        Utilisateur: c.User?.full_name || 'Anonyme',
        Prénom: c.UserProfile?.first_name || '',
        Montant: c.amount,
        Jour: c.day_of_month,
        Raison: c.reason || '',
        Date_engagement: new Date(c.createdAt).toLocaleDateString()
      }));
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
        imageUrl = base64;
      }
      const payload = {
        ...formData,
        target_amount: formData.target_amount ? parseFloat(formData.target_amount) : null,
        image_url: imageUrl,
      };
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      setShowProjectForm(false);
      setEditingProject(null);
      setFormData({ name: '', description: '', type: 'project', target_amount: '', image_url: '', is_active: true });
      setImageFile(null);
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Erreur détaillée :', err.response?.data || err.message);
      alert('Erreur lors de l\'enregistrement : ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm('Supprimer ce projet ?')) {
      try {
        await api.delete(`/projects/${id}`);
        const res = await api.get('/projects');
        setProjects(res.data);
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      type: project.type,
      target_amount: project.target_amount?.toString() || '',
      image_url: project.image_url || '',
      is_active: project.is_active,
    });
    setImageFile(null);
    setShowProjectForm(true);
  };

  const toggleUserDetails = (id) => {
    setExpandedUserId(expandedUserId === id ? null : id);
  };

  const toggleCommitmentDetails = (id) => {
    setExpandedCommitmentId(expandedCommitmentId === id ? null : id);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Backoffice AMI</h1>
        <div>
          <button onClick={() => exportToExcel(activeTab === 'projects' ? projects : activeTab === 'donations' ? donations : activeTab === 'users' ? users : commitments, activeTab)} className="bg-green-600 text-white px-3 py-1 rounded mr-2">
            Exporter Excel
          </button>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Déconnexion</button>
        </div>
      </nav>
      <div className="p-4">
        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 rounded ${activeTab === 'projects' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('projects')}>Projets</button>
          <button className={`px-4 py-2 rounded ${activeTab === 'donations' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('donations')}>Dons</button>
          <button className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('users')}>Utilisateurs</button>
          <button className={`px-4 py-2 rounded ${activeTab === 'commitments' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => setActiveTab('commitments')}>Engagements</button>
        </div>

        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Projets missionnaires</h2>
              <button onClick={() => { setShowProjectForm(true); setEditingProject(null); setFormData({ name: '', description: '', type: 'project', target_amount: '', image_url: '', is_active: true }); setImageFile(null); }} className="bg-blue-600 text-white px-3 py-1 rounded">+ Nouveau projet</button>
            </div>
            {showProjectForm && (
              <div className="bg-white p-4 rounded shadow mb-6">
                <h3 className="font-bold mb-2">{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</h3>
                <form onSubmit={handleProjectSubmit} className="space-y-3">
                  <input type="text" placeholder="Nom" className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  <textarea placeholder="Description" className="w-full p-2 border rounded" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  <select className="w-full p-2 border rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="project">Projet</option>
                    <option value="missionary">Missionnaire</option>
                    <option value="zone">Zone</option>
                    <option value="general">Général</option>
                  </select>
                  <input type="number" placeholder="Montant objectif (FCFA)" className="w-full p-2 border rounded" value={formData.target_amount} onChange={e => setFormData({...formData, target_amount: e.target.value})} />
                  <div className="border rounded p-2">
                    <label className="block mb-1">Image (PNG ou JPG)</label>
                    <input type="file" accept="image/png, image/jpeg" onChange={e => setImageFile(e.target.files[0])} />
                    {formData.image_url && !imageFile && <p className="text-xs text-gray-500 mt-1">Image actuelle : {formData.image_url.substring(0, 50)}...</p>}
                  </div>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                    Actif
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-green-600 text-white px-4 py-1 rounded">Enregistrer</button>
                    <button type="button" onClick={() => { setShowProjectForm(false); setEditingProject(null); }} className="bg-gray-400 text-white px-4 py-1 rounded">Annuler</button>
                  </div>
                </form>
              </div>
            )}
            <ul className="bg-white rounded shadow">
              {projects.length === 0 ? (
                <li className="p-3 text-center text-gray-500">Aucun projet trouvé</li>
              ) : (
                projects.map(p => (
                  <li key={p.id} className="p-3 border-b flex justify-between items-center">
                    <div>
                      <strong>{p.name}</strong> - {p.target_amount} FCFA - {p.type}
                    </div>
                    <div>
                      <button onClick={() => handleEditProject(p)} className="text-blue-600 mr-2">Modifier</button>
                      <button onClick={() => handleDeleteProject(p.id)} className="text-red-600">Supprimer</button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'donations' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Dons récents</h2>
            <ul className="bg-white rounded shadow">
              {donations.length === 0 ? (
                <li className="p-3 text-center text-gray-500">Aucun don trouvé</li>
              ) : (
                donations.map(d => (
                  <li key={d.id} className="p-3 border-b">{d.amount} FCFA - {d.status} - {new Date(d.createdAt).toLocaleDateString()}</li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Partenaires</h2>
            <ul className="bg-white rounded shadow">
              {users.length === 0 ? (
                <li className="p-3 text-center text-gray-500">Aucun utilisateur trouvé</li>
              ) : (
                users.map((u, index) => (
                  <li key={u.id} className="p-3 border-b">
                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleUserDetails(u.id)}>
                      <span><strong>{index + 1}.</strong> {u.full_name || 'Anonyme'}</span>
                      <span>{u.phone}</span>
                    </div>
                    {expandedUserId === u.id && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p><strong>Nom complet :</strong> {u.full_name || 'Non renseigné'}</p>
                        <p><strong>Prénoms :</strong> {u.UserProfile?.first_name || 'Non renseigné'}</p>
                        <p><strong>Sexe :</strong> {u.UserProfile?.gender || 'Non renseigné'}</p>
                        <p><strong>Âge :</strong> {u.UserProfile?.age || 'Non renseigné'}</p>
                        <p><strong>Ville de résidence :</strong> {u.UserProfile?.city || 'Non renseigné'}</p>
                        <p><strong>Profession :</strong> {u.UserProfile?.profession || 'Non renseigné'}</p>
                        <p><strong>Église / organisation :</strong> {u.UserProfile?.church_org || 'Non renseigné'}</p>
                        <p><strong>Téléphone :</strong> {u.phone}</p>
                        <p><strong>Vérifié :</strong> {u.is_verified ? 'Oui' : 'Non'}</p>
                        <p><strong>Date inscription :</strong> {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        {activeTab === 'commitments' && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Engagements mensuels</h2>
            <ul className="bg-white rounded shadow">
              {commitments.length === 0 ? (
                <li className="p-3 text-center text-gray-500">Aucun engagement trouvé</li>
              ) : (
                commitments.map((c) => {
                  const fullName = c.User?.full_name
                    ? (c.UserProfile?.first_name ? `${c.User.full_name} ${c.UserProfile.first_name}` : c.User.full_name)
                    : (c.UserProfile?.first_name || 'Anonyme');
                  return (
                    <li key={c.id} className="p-3 border-b">
                      <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => toggleCommitmentDetails(c.id)}
                      >
                        <span><strong>{fullName}</strong></span>
                        <span>{c.amount} FCFA</span>
                      </div>
                      {expandedCommitmentId === c.id && (
                        <div className="mt-2 p-2 bg-gray-50 rounded">
                          <p><strong>Montant :</strong> {c.amount} FCFA</p>
                          <p><strong>Jour du mois :</strong> {c.day_of_month}</p>
                          <p><strong>Raison :</strong> {c.reason || 'Non spécifiée'}</p>
                          <p><strong>Date d'engagement :</strong> {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}