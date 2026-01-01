import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Plus, Minus, X, Star, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { menuAPI } from '../lib/api';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const { addItem, items: cartItems, itemCount } = useCart();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [categoriesRes, itemsRes] = await Promise.all([
          menuAPI.getCategories(),
          menuAPI.getItems()
        ]);
        setCategories(categoriesRes.data);
        setItems(itemsRes.data);
        
        // Check for item in URL params
        const itemId = searchParams.get('item');
        if (itemId) {
          const item = itemsRes.data.find(i => i.id === itemId);
          if (item) setSelectedItem(item);
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [searchParams]);

  const filteredItems = items.filter(item => {
    const matchesCategory = !activeCategory || item.category_id === activeCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = useCallback((item, variant = null, quantity = 1) => {
    addItem(item, variant, [], quantity);
  }, [addItem]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf2f1] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf2f1] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="font-bebas text-4xl text-[#1e3a5f]">Our Menu</h1>
            
            {/* Search */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                data-testid="menu-search-input"
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full border-slate-200 focus:border-[#c31c1c] focus:ring-[#c31c1c]"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              data-testid="category-all"
              onClick={() => setActiveCategory(null)}
              className={`category-pill whitespace-nowrap ${!activeCategory ? 'active' : ''}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                data-testid={`category-${category.id}`}
                onClick={() => setActiveCategory(category.id)}
                className={`category-pill whitespace-nowrap ${activeCategory === category.id ? 'active' : ''}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div 
                    data-testid={`menu-item-${item.id}`}
                    className="menu-card bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
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
                      {item.name_ar && (
                        <p className="text-slate-400 text-sm" dir="rtl">{item.name_ar}</p>
                      )}
                      <p className="text-slate-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="font-bold text-lg text-[#c31c1c]">
                          {item.variants?.length > 0 
                            ? `From ${Math.min(...item.variants.map(v => v.price)).toFixed(3)} KWD`
                            : `${item.price.toFixed(3)} KWD`
                          }
                        </span>
                        <Button 
                          data-testid={`add-to-cart-${item.id}`}
                          size="sm"
                          className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.variants?.length > 0) {
                              setSelectedItem(item);
                            } else {
                              handleAddToCart(item);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-40"
        >
          <a href="/cart">
            <Button 
              data-testid="view-cart-btn"
              className="w-full sm:w-auto bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-6 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              <span className="font-bebas text-lg">View Cart ({itemCount})</span>
            </Button>
          </a>
        </motion.div>
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

// Item Detail Modal
const ItemDetailModal = ({ item, onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item?.variants?.length > 0) {
      setSelectedVariant(item.variants[0]);
    }
    setQuantity(1);
  }, [item]);

  if (!item) return null;

  const price = selectedVariant?.price || item.price;
  const total = price * quantity;

  const handleAdd = () => {
    onAddToCart(item, selectedVariant, quantity);
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        <div className="relative h-64">
          <img 
            src={item.image_url || 'https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=600'} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="font-bebas text-3xl text-[#1e3a5f]">{item.name}</DialogTitle>
            {item.name_ar && (
              <p className="text-slate-400" dir="rtl">{item.name_ar}</p>
            )}
          </DialogHeader>
          
          <p className="text-slate-600 mt-2">{item.description}</p>

          {/* Variants */}
          {item.variants?.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-[#1e3a5f] mb-3">Choose Size</h4>
              <div className="flex flex-wrap gap-2">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    data-testid={`variant-${variant.id}`}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-full border-2 transition-all ${
                      selectedVariant?.id === variant.id
                        ? 'border-[#c31c1c] bg-[#c31c1c] text-white'
                        : 'border-slate-200 hover:border-[#c31c1c]'
                    }`}
                  >
                    {variant.name} - {variant.price.toFixed(3)} KWD
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <div className="flex items-center gap-4">
              <button
                data-testid="decrease-qty"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-[#c31c1c] hover:text-white transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="font-bebas text-2xl w-8 text-center">{quantity}</span>
              <button
                data-testid="increase-qty"
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-[#c31c1c] hover:text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <Button
              data-testid="modal-add-to-cart"
              onClick={handleAdd}
              className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-8 py-6"
            >
              <span className="font-bebas text-lg">Add to Cart - {total.toFixed(3)} KWD</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MenuPage;
