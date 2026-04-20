import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, LayoutDashboard, LogOut, Shield, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/exams', label: 'Exams', icon: BookOpen },
  ];
  const studentLinks = [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/exams', label: 'Exams', icon: BookOpen },
  ];
  const links = user?.role === 'admin' ? adminLinks : studentLinks;

  return (
    <nav className="sticky top-0 z-40 bg-brand-card/80 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white">ExamShield</span>
          {user?.role === 'admin' && (
            <span className="badge bg-primary-900 text-primary-300 ml-2">Admin</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-brand-dark'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-dark rounded-xl">
            <User size={14} className="text-primary-400" />
            <span className="text-sm text-slate-300">{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="btn-secondary text-sm flex items-center gap-2 py-2">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
