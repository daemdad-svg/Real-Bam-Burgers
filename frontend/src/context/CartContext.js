import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [orderType, setOrderType] = useState('delivery');
  const [branch, setBranch] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.items || []);
        setOrderType(parsed.orderType || 'delivery');
        setBranch(parsed.branch || null);
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify({ items, orderType, branch }));
  }, [items, orderType, branch]);

  const addItem = useCallback((item, variant = null, modifiers = [], quantity = 1, specialInstructions = '') => {
    const cartItem = {
      id: `${item.id}-${variant?.id || 'default'}-${Date.now()}`,
      item_id: item.id,
      item_name: item.name,
      variant_id: variant?.id || null,
      variant_name: variant?.name || null,
      quantity,
      unit_price: variant?.price || item.price,
      modifiers,
      special_instructions: specialInstructions,
      image_url: item.image_url,
      subtotal: (variant?.price || item.price) * quantity + modifiers.reduce((sum, m) => sum + (m.price || 0), 0) * quantity
    };
    
    setItems(prev => [...prev, cartItem]);
    toast.success(`${item.name} added to cart`);
  }, []);

  const removeItem = useCallback((cartItemId) => {
    setItems(prev => prev.filter(item => item.id !== cartItemId));
    toast.info('Item removed from cart');
  }, []);

  const updateQuantity = useCallback((cartItemId, quantity) => {
    if (quantity < 1) {
      removeItem(cartItemId);
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const basePrice = item.unit_price + item.modifiers.reduce((sum, m) => sum + (m.price || 0), 0);
        return {
          ...item,
          quantity,
          subtotal: basePrice * quantity
        };
      }
      return item;
    }));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setLoyaltyPointsToUse(0);
    setDeliveryAddress(null);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = orderType === 'delivery' ? (branch?.delivery_fee || 0.5) : 0;
  const discount = coupon?.discount || 0;
  const loyaltyDiscount = loyaltyPointsToUse * 0.01;
  const total = Math.max(0, subtotal + deliveryFee - discount - loyaltyDiscount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      deliveryFee,
      discount,
      loyaltyDiscount,
      total,
      orderType,
      branch,
      deliveryAddress,
      coupon,
      loyaltyPointsToUse,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setOrderType,
      setBranch,
      setDeliveryAddress,
      setCoupon,
      setLoyaltyPointsToUse
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export default CartContext;
