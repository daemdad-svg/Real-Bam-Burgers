import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, Gift, User, Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_755086b3-031a-49aa-b048-bf43e27751a3/artifacts/r955osxl_Logo.png";

export const CustomerLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#faf2f1]">
      <Navbar />
      <main>{children}</main>
      <MobileNav />
      <Footer />
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glass border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Bam Burgers" className="h-10 w-auto" />
            <span className="font-bebas text-2xl text-[#c31c1c] hidden sm:block" data-testid="nav-logo">BAM BURGERS</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-[#1e3a5f] hover:text-[#c31c1c] font-medium transition-colors">
              Home
            </Link>
            <Link to="/menu" className="text-[#1e3a5f] hover:text-[#c31c1c] font-medium transition-colors">
              Menu
            </Link>
            <Link to="/loyalty" className="text-[#1e3a5f] hover:text-[#c31c1c] font-medium transition-colors">
              Rewards
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link to="/cart" className="relative" data-testid="nav-cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="w-5 h-5 text-[#1e3a5f]" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#c31c1c] text-white text-xs rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Auth */}
            <div className="hidden md:block">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile">
                    <Button variant="ghost" className="text-[#1e3a5f]">
                      <User className="w-5 h-5 mr-2" />
                      {user.name?.split(' ')[0]}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="text-[#c31c1c] border-[#c31c1c]"
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full" data-testid="nav-login">
                    Log In
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-4 space-y-4">
            <Link 
              to="/" 
              className="block text-[#1e3a5f] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/menu" 
              className="block text-[#1e3a5f] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Menu
            </Link>
            <Link 
              to="/loyalty" 
              className="block text-[#1e3a5f] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Rewards
            </Link>
            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="block text-[#1e3a5f] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block text-[#c31c1c] font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link 
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full bg-[#c31c1c] hover:bg-[#a61818] rounded-full">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const MobileNav = () => {
  const location = useLocation();
  const { itemCount } = useCart();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: UtensilsCrossed, label: 'Menu', path: '/menu' },
    { icon: ShoppingBag, label: 'Cart', path: '/cart', badge: itemCount },
    { icon: Gift, label: 'Rewards', path: '/loyalty' },
    { icon: User, label: 'Account', path: '/login' },
  ];

  return (
    <div className="mobile-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#c31c1c] text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#1e3a5f] text-white py-12 hidden md:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="font-bebas text-3xl">BAM BURGERS</span>
            <p className="text-white/70 mt-2">Fresh. Fast. Flavorful.</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/menu" className="text-white/70 hover:text-white">Menu</Link></li>
              <li><Link to="/loyalty" className="text-white/70 hover:text-white">Rewards</Link></li>
              <li><Link to="/track" className="text-white/70 hover:text-white">Track Order</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +965 9474 5424
              </li>
              <li>Kitchen Park Salwa</li>
              <li>Kuwait</li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Opening Hours</h4>
            <ul className="space-y-1 text-white/70">
              <li>Sunday - Thursday: 11am - 1am</li>
              <li>Friday - Saturday: 11am - 2am</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/50">
          <p>© 2025 BAM Burgers. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default CustomerLayout;
