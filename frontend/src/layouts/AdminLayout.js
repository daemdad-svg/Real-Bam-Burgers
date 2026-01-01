import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ChefHat, UtensilsCrossed, 
  Tag, Gift, Users, BarChart3, Settings, LogOut, Printer, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: ShoppingCart, label: 'POS', path: '/admin/pos' },
    { icon: ChefHat, label: 'KDS', path: '/admin/kds' },
    { icon: UtensilsCrossed, label: 'Menu', path: '/admin/menu' },
    { icon: Tag, label: 'Coupons', path: '/admin/coupons' },
    { icon: Gift, label: 'Loyalty', path: '/admin/loyalty' },
    { icon: Users, label: 'Customers', path: '/admin/customers' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="admin-layout flex min-h-screen admin-theme">
      {/* Sidebar */}
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#d4af37] rounded-lg flex items-center justify-center">
                <span className="font-bebas text-[#1e3a5f] text-lg">RP</span>
              </div>
              <div>
                <h1 className="font-bebas text-xl text-white">RIWA POS</h1>
                <p className="text-xs text-[#d4af37]">Bam Burgers</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`admin-sidebar-item ${isActive ? 'active' : ''}`}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                <span className="font-semibold text-white">
                  {admin?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{admin?.name || 'Admin'}</p>
                <p className="text-xs text-white/60">{admin?.role || 'admin'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center gap-4">
              <Link to="/" target="_blank" className="text-sm text-slate-500 hover:text-[#c31c1c]">
                View Website →
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-64px)]">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
