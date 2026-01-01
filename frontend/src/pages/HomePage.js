import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Star, Truck, ArrowRight, ChevronRight, Gift } from 'lucide-react';
import { Button } from '../components/ui/button';
import { menuAPI, branchAPI } from '../lib/api';
import { useCart } from '../context/CartContext';

const HomePage = () => {
  const [popularItems, setPopularItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setBranch, setOrderType } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, branchesRes] = await Promise.all([
          menuAPI.getItems({ popular: true }),
          branchAPI.getAll()
        ]);
        setPopularItems(itemsRes.data.slice(0, 4));
        setBranches(branchesRes.data);
        if (branchesRes.data.length > 0) {
          setBranch(branchesRes.data[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setBranch]);

  const handleOrderType = useCallback((type, branch) => {
    setOrderType(type);
    setBranch(branch);
  }, [setOrderType, setBranch]);

  return (
    <div className="min-h-screen bg-[#faf2f1]">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden hero-gradient">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=1920&q=80')`,
          }}
        />
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="font-bebas text-6xl sm:text-7xl lg:text-8xl text-white tracking-wide leading-none mb-6">
              OG BURGER<br />MEAL
            </h1>
            <p className="text-white/90 text-lg sm:text-xl mb-8 font-manrope">
              Fresh ingredients, bold flavors, and quick delivery. Experience the best burgers in Kuwait with Bam Burgers.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/menu">
                <Button 
                  data-testid="hero-order-now-btn"
                  className="bg-white text-[#c31c1c] hover:bg-white/90 rounded-full px-8 py-6 text-xl font-bebas tracking-wide shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Order Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/menu">
                <Button 
                  data-testid="hero-view-menu-btn"
                  variant="outline"
                  className="bg-transparent text-white border-2 border-white hover:bg-white/10 rounded-full px-8 py-6 text-xl font-bebas tracking-wide"
                >
                  View Menu
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Popular Items Section */}
      <section className="py-16 sm:py-24 bg-[#faf2f1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <span className="text-[#c31c1c] font-semibold text-sm tracking-wider uppercase">Popular</span>
              <h2 className="font-bebas text-4xl sm:text-5xl text-[#1e3a5f] mt-1">Most Popular Items</h2>
              <p className="text-slate-600 mt-2">Our customers' favorites - tried, tested, and loved by thousands</p>
            </div>
            <Link to="/menu" className="hidden sm:block">
              <Button 
                data-testid="view-full-menu-btn"
                variant="outline"
                className="rounded-full border-[#c31c1c] text-[#c31c1c] hover:bg-[#c31c1c] hover:text-white"
              >
                View Full Menu
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link to={`/menu?item=${item.id}`} data-testid={`popular-item-${item.id}`}>
                    <div className="menu-card bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group">
                      <div className="relative h-48 overflow-hidden">
                        <img 
                          src={item.image_url || 'https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=400'} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {item.is_popular && (
                          <div className="absolute top-3 left-3 bg-[#d4af37] text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" fill="currentColor" />
                            Popular
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bebas text-xl text-[#1e3a5f]">{item.name}</h3>
                        <p className="text-slate-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="font-bold text-lg text-[#c31c1c]">{item.price.toFixed(3)} KWD</span>
                          <Button 
                            size="sm"
                            className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link to="/menu">
              <Button 
                className="rounded-full bg-[#c31c1c] hover:bg-[#a61818] w-full"
                data-testid="mobile-view-menu-btn"
              >
                View Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Truck,
                title: 'Fast Delivery',
                description: 'Hot and fresh food delivered to your doorstep in 30 minutes or less'
              },
              {
                icon: Star,
                title: 'Best Quality',
                description: 'Premium ingredients and recipes crafted to perfection by our chefs'
              },
              {
                icon: Clock,
                title: 'Open Late',
                description: "Craving food at night? We're open until 1 AM daily"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center p-6"
              >
                <div className="w-16 h-16 bg-[#faf2f1] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-[#c31c1c]" />
                </div>
                <h3 className="font-bebas text-2xl text-[#1e3a5f] mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loyalty Section */}
      <section className="py-16 bg-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-[#d4af37] rounded-2xl flex items-center justify-center flex-shrink-0">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="font-bebas text-3xl sm:text-4xl text-white">Loyalty Program</h2>
                <p className="text-white/80 mt-1">Earn points with every order and unlock exclusive rewards!</p>
              </div>
            </div>
            <Link to="/loyalty">
              <Button 
                data-testid="join-loyalty-btn"
                className="bg-[#d4af37] hover:bg-[#c49f2f] text-[#1e3a5f] rounded-full px-8 py-6 font-bebas text-xl tracking-wide"
              >
                Join Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-[#faf2f1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-bebas text-4xl sm:text-5xl text-[#1e3a5f] mb-4">Ready to Order?</h2>
          <p className="text-slate-600 text-lg mb-8">Order now and get fast delivery right to your doorstep</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/menu">
              <Button 
                data-testid="cta-order-now-btn"
                className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-8 py-6 font-bebas text-xl tracking-wide"
              >
                Order Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="tel:+96594745424">
              <Button 
                data-testid="call-btn"
                variant="outline"
                className="rounded-full border-[#1e3a5f] text-[#1e3a5f] px-8 py-6 font-bebas text-xl tracking-wide"
              >
                +965 9474 5424
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Order Type Modal (appears on first visit) */}
      {branches.length > 0 && (
        <OrderTypeModal 
          branches={branches} 
          onSelect={handleOrderType}
        />
      )}
    </div>
  );
};

// Order Type Selection Modal
const OrderTypeModal = ({ branches, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]);

  useEffect(() => {
    const hasSelectedType = localStorage.getItem('order_type_selected');
    if (!hasSelectedType) {
      setIsOpen(true);
    }
  }, []);

  const handleSelect = (type) => {
    onSelect(type, selectedBranch);
    localStorage.setItem('order_type_selected', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 pb-8"
      >
        <h2 className="font-bebas text-3xl text-[#1e3a5f] text-center mb-2">
          How would you like your order?
        </h2>
        
        {/* Branch Selection */}
        <div className="mb-6">
          <p className="text-sm text-slate-500 text-center mb-3">{selectedBranch?.name}</p>
          <p className="text-xs text-slate-400 text-center">{selectedBranch?.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            data-testid="select-delivery-btn"
            onClick={() => handleSelect('delivery')}
            className="p-6 border-2 border-slate-200 rounded-2xl hover:border-[#c31c1c] transition-all text-center group"
          >
            <Truck className="w-10 h-10 mx-auto mb-3 text-[#c31c1c] group-hover:scale-110 transition-transform" />
            <span className="font-bebas text-xl text-[#1e3a5f]">Delivery</span>
            <p className="text-xs text-slate-500 mt-1">We'll bring it to you</p>
          </button>
          
          <button
            data-testid="select-pickup-btn"
            onClick={() => handleSelect('pickup')}
            className="p-6 border-2 border-slate-200 rounded-2xl hover:border-[#c31c1c] transition-all text-center group"
          >
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-[#c31c1c] group-hover:scale-110 transition-transform" />
            <span className="font-bebas text-xl text-[#1e3a5f]">Pickup</span>
            <p className="text-xs text-slate-500 mt-1">Collect from our store</p>
          </button>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="w-full mt-6 text-slate-500 text-sm hover:text-[#c31c1c] transition-colors"
        >
          Continue
        </button>
      </motion.div>
    </div>
  );
};

export default HomePage;
