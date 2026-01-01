import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Search, ShoppingCart, Trash2, User, Phone, 
  CreditCard, Banknote, Truck, Store, Minus, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { menuAPI, orderAPI, branchAPI } from '@/lib/api';
import { toast } from 'sonner';

const POSPage = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Cart state
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [aggregator, setAggregator] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  // Customer modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, itemsRes, branchesRes] = await Promise.all([
          menuAPI.getAllCategories(),
          menuAPI.getAllItems(),
          branchAPI.getAllAdmin()
        ]);
        setCategories(categoriesRes.data);
        setItems(itemsRes.data);
        setBranches(branchesRes.data);
        if (branchesRes.data.length > 0) {
          setSelectedBranch(branchesRes.data[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = !activeCategory || item.category_id === activeCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const addToCart = useCallback((item, variant = null) => {
    const cartItemId = `${item.id}-${variant?.id || 'default'}`;
    const price = variant?.price || item.price;
    
    setCart(prev => {
      const existing = prev.find(i => i.cartId === cartItemId);
      if (existing) {
        return prev.map(i => 
          i.cartId === cartItemId 
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      return [...prev, {
        cartId: cartItemId,
        item_id: item.id,
        item_name: item.name,
        variant_id: variant?.id || null,
        variant_name: variant?.name || null,
        quantity: 1,
        unit_price: price,
        modifiers: [],
        special_instructions: '',
        subtotal: price
      }];
    });
  }, []);

  const updateCartQuantity = useCallback((cartId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cartId === cartId) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return null;
          return { ...item, quantity: newQty, subtotal: newQty * item.unit_price };
        }
        return item;
      }).filter(Boolean);
    });
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerDetails({ name: '', phone: '' });
    setAggregator('');
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = orderType === 'delivery' ? (selectedBranch?.delivery_fee || 0.5) : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    if (!customerDetails.name || !customerDetails.phone) {
      setShowCustomerModal(true);
      return;
    }

    try {
      const orderData = {
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        order_type: orderType,
        branch_id: selectedBranch?.id || 'branch-1',
        items: cart,
        subtotal,
        delivery_fee: deliveryFee,
        discount: 0,
        total,
        payment_method: paymentMethod,
        aggregator: aggregator || null
      };

      const response = await orderAPI.create(orderData);
      
      if (response.data.success) {
        toast.success(`Order ${response.data.order.order_number} created!`);
        clearCart();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex admin-theme">
      {/* Categories Sidebar */}
      <div className="w-48 bg-white border-r overflow-y-auto flex-shrink-0">
        <div className="p-3">
          <h3 className="font-semibold text-[#1e3a5f] mb-3 text-sm">Categories</h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeCategory ? 'bg-[#1e3a5f] text-white' : 'hover:bg-slate-100'
              }`}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeCategory === category.id ? 'bg-[#1e3a5f] text-white' : 'hover:bg-slate-100'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#f5f7fa]">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              data-testid="pos-search"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Items */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer"
              onClick={() => {
                if (item.variants?.length > 0) {
                  // For items with variants, add first variant
                  addToCart(item, item.variants[0]);
                } else {
                  addToCart(item);
                }
              }}
              data-testid={`pos-item-${item.id}`}
            >
              <div className="h-24 overflow-hidden">
                <img 
                  src={item.image_url || 'https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=200'}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2">
                <p className="font-semibold text-sm text-[#1e3a5f] truncate">{item.name}</p>
                <p className="text-[#c31c1c] font-bold text-sm">{item.price.toFixed(3)} KWD</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l flex flex-col flex-shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#1e3a5f]" />
              <h3 className="font-semibold text-[#1e3a5f]">Current Order</h3>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-red-500 text-sm hover:underline">
                Clear
              </button>
            )}
          </div>
          
          {/* Order Type & Aggregator */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setOrderType('pickup')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                orderType === 'pickup' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4" /> Pickup
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                orderType === 'delivery' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" /> Delivery
            </button>
          </div>

          {/* Aggregator Selector */}
          <div className="mt-3">
            <Select value={aggregator} onValueChange={setAggregator}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Channel (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Website / Walk-in</SelectItem>
                <SelectItem value="talabat">Talabat</SelectItem>
                <SelectItem value="keeta">Keeta</SelectItem>
                <SelectItem value="jahez">Jahez</SelectItem>
                <SelectItem value="deliveroo">Deliveroo</SelectItem>
                <SelectItem value="cari">Cari</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.cartId} className="flex gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[#1e3a5f]">
                      {item.item_name}
                      {item.variant_name && <span className="text-slate-500"> ({item.variant_name})</span>}
                    </p>
                    <p className="text-sm text-[#c31c1c]">{item.unit_price.toFixed(3)} KWD</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(item.cartId, -1)}
                      className="w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.cartId, 1)}
                      className="w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-red-400 hover:text-red-500 ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-4 border-t bg-slate-50">
          {/* Customer Info */}
          {customerDetails.name && (
            <div className="mb-3 p-2 bg-white rounded-lg text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span>{customerDetails.name}</span>
              <span className="text-slate-400">•</span>
              <span>{customerDetails.phone}</span>
              <button 
                onClick={() => setShowCustomerModal(true)}
                className="ml-auto text-[#1e3a5f] hover:underline text-xs"
              >
                Edit
              </button>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(3)} KWD</span>
            </div>
            {orderType === 'delivery' && (
              <div className="flex justify-between text-sm">
                <span>Delivery</span>
                <span>{deliveryFee.toFixed(3)} KWD</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-[#c31c1c]">{total.toFixed(3)} KWD</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                paymentMethod === 'cash' ? 'bg-green-500 text-white' : 'bg-white border'
              }`}
            >
              <Banknote className="w-5 h-5" /> Cash
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-white border'
              }`}
            >
              <CreditCard className="w-5 h-5" /> Card
            </button>
          </div>

          {/* Place Order Button */}
          <Button
            data-testid="pos-place-order"
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] py-6 font-bebas text-xl"
          >
            {customerDetails.name ? `Place Order - ${total.toFixed(3)} KWD` : 'Add Customer & Order'}
          </Button>
        </div>
      </div>

      {/* Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl text-[#1e3a5f]">Customer Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Customer Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  data-testid="pos-customer-name"
                  placeholder="Enter name"
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  data-testid="pos-customer-phone"
                  placeholder="+965 XXXX XXXX"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                if (customerDetails.name && customerDetails.phone) {
                  setShowCustomerModal(false);
                  handlePlaceOrder();
                } else {
                  toast.error('Please fill all fields');
                }
              }}
              className="w-full bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              Continue with Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSPage;
