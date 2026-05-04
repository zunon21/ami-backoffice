import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, Users, Briefcase, History, Heart, Archive, Menu, X } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/');
  };

  const navItems = [
    { path: '/partenaires', label: 'Partenaires de l’AMI', icon: Users },
    { path: '/divers-engagements', label: 'Divers engagements', icon: Briefcase },
    { path: '/historique-engagements', label: 'Historique des engagements', icon: History },
    { path: '/dons', label: 'Dons', icon: Heart },
    { path: '/archives', label: 'Archives', icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar pour desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-md">
        <div className="p-4 text-xl font-bold text-blue-700 border-b">AMI Admin</div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition"
            >
              <item.icon size={20} /> <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      {/* Mobile menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white shadow z-20 p-3 flex justify-between">
        <h1 className="text-xl font-bold text-blue-700">AMI Admin</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-white z-30 pt-16 p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 border-b"
            >
              <item.icon size={20} /> {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-3 text-red-600 w-full"
          >
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 mt-14 md:mt-0">
        <Outlet />
      </main>
    </div>
  );
}