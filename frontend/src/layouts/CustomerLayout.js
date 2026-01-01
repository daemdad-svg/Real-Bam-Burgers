import { Link, useLocation } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, Gift, User, Menu, X, Phone, Languages } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_755086b3-031a-49aa-b048-bf43e27751a3/artifacts/r955osxl_Logo.png";

export const CustomerLayout = ({ children }) => {
  const { toggleLanguage, t, language } = useLanguage();
  
  return (
    <div className="min-h-screen bg-[#faf2f1]">
      <Navbar />
      <main className="pb-20 md:pb-0">{children}</main>
      <MobileNav />
      <Footer />
      
      {/* Language Toggle Button */}
      <button
        onClick={toggleLanguage}
        className="language-toggle"
        aria-label="Toggle Language"
      >
        <Languages className="w-5 h-5 inline mr-2" />
        {language === 'en' ? 'عربي' : 'English'}
      </button>
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { t } = useLanguage();
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
            <Link to="/" className="text-[#c31c1c] hover:text-[#a61818] font-medium transition-colors">
              {t('Home', 'الرئيسية')}
            </Link>
            <Link to="/menu" className="text-[#c31c1c] hover:text-[#a61818] font-medium transition-colors">
              {t('Menu', 'القائمة')}
            </Link>
            <Link to="/loyalty" className="text-[#c31c1c] hover:text-[#a61818] font-medium transition-colors">
              {t('Rewards', 'المكافآت')}
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link to="/cart" className="relative" data-testid="nav-cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="w-5 h-5 text-[#c31c1c]" />
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
                    <Button variant="ghost" className="text-[#c31c1c]">
                      <User className="w-5 h-5 mr-2" />
                      {user.name?.split(' ')[0]}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="text-[#c31c1c] border-[#c31c1c]"
                  >
                    {t('Logout', 'تسجيل خروج')}
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full" data-testid="nav-login">
                    {t('Log In', 'تسجيل دخول')}
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
              className="block text-[#c31c1c] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('Home', 'الرئيسية')}
            </Link>
            <Link 
              to="/menu" 
              className="block text-[#c31c1c] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('Menu', 'القائمة')}
            </Link>
            <Link 
              to="/loyalty" 
              className="block text-[#c31c1c] font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('Rewards', 'المكافآت')}
            </Link>
            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="block text-[#c31c1c] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('Profile', 'الملف الشخصي')}
                </Link>
                <button 
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block text-[#c31c1c] font-medium"
                >
                  {t('Logout', 'تسجيل خروج')}
                </button>
              </>
            ) : (
              <Link 
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button className="w-full bg-[#c31c1c] hover:bg-[#a61818] rounded-full">
                  {t('Log In', 'تسجيل دخول')}
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
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t('Home', 'الرئيسية'), path: '/' },
    { icon: UtensilsCrossed, label: t('Menu', 'القائمة'), path: '/menu' },
    { icon: ShoppingBag, label: t('Cart', 'السلة'), path: '/cart', badge: itemCount },
    { icon: Gift, label: t('Rewards', 'المكافآت'), path: '/loyalty' },
    { icon: User, label: t('Account', 'الحساب'), path: '/login' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
                isActive ? 'text-[#c31c1c]' : 'text-slate-500'
              }`}
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
    </div>
  );
};

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-[#c31c1c] text-white py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Bam Burgers" className="h-8 w-auto" />
            <span className="font-bebas text-3xl text-white">BAM BURGERS</span>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">{t('Quick Links', 'روابط سريعة')}</h4>
            <ul className="space-y-2">
              <li><Link to="/menu" className="text-white/70 hover:text-white">{t('Menu', 'القائمة')}</Link></li>
              <li><Link to="/loyalty" className="text-white/70 hover:text-white">{t('Rewards', 'المكافآت')}</Link></li>
              <li><Link to="/track" className="text-white/70 hover:text-white">{t('Track Order', 'تتبع الطلب')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t('Contact', 'اتصل بنا')}</h4>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +965 9474 5424
              </li>
              <li>{t('Kitchen Park Salwa', 'كيتشن بارك الصالحية')}</li>
              <li>{t('Kuwait', 'الكويت')}</li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">{t('Opening Hours', 'ساعات العمل')}</h4>
            <ul className="space-y-1 text-white/70">
              <li>{t('Sunday - Thursday: 11am - 1am', 'الأحد - الخميس: 11 صباحاً - 1 صباحاً')}</li>
              <li>{t('Friday - Saturday: 11am - 2am', 'الجمعة - السبت: 11 صباحاً - 2 صباحاً')}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/70">
          <p>© 2025 BAM Burgers. {t('All rights reserved', 'جميع الحقوق محفوظة')}.</p>
        </div>
      </div>
    </footer>
  );
};

export default CustomerLayout;
