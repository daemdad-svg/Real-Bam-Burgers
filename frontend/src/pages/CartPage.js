import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, Tag, Gift, MapPin, Truck, Store, CreditCard, Banknote, X, Check, Navigation } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderAPI, couponAPI, loyaltyAPI, branchAPI } from '../lib/api';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Kuwait center coordinates
const KUWAIT_CENTER = [29.3759, 47.9774];
const KUWAIT_BOUNDS = [[28.5, 46.5], [30.5, 48.5]];

// Map click handler component
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items, itemCount, subtotal, deliveryFee, discount, loyaltyDiscount, total,
    orderType, branch, coupon, loyaltyPointsToUse,
    removeItem, updateQuantity, clearCart, setOrderType, setCoupon, setLoyaltyPointsToUse
  } = useCart();

  const [step, setStep] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [loyaltyBalance, setLoyaltyBalance] = useState({ points: 0, value: 0 });
  const [customerDetails, setCustomerDetails] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    notes: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [mapPosition, setMapPosition] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address_line: '',
    area: '',
    building: '',
    floor: '',
    apartment: '',
    instructions: '',
    lat: null,
    lng: null
  });
  const [deliveryCheck, setDeliveryCheck] = useState(null);

  useEffect(() => {
    if (user) fetchLoyaltyBalance();
  }, [user]);

  useEffect(() => {
    if (mapPosition) {
      setAddressForm(prev => ({
        ...prev,
        lat: mapPosition.lat,
        lng: mapPosition.lng
      }));
      checkDeliveryCoverage(mapPosition.lat, mapPosition.lng);
      reverseGeocode(mapPosition.lat, mapPosition.lng);
    }
  }, [mapPosition]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
      );
      const data = await response.json();
      
      if (data && data.address) {
        setAddressForm(prev => ({
          ...prev,
          address_line: data.display_name || '',
          area: data.address.suburb || data.address.neighbourhood || data.address.city_district || '',
          building: data.address.building || '',
          lat: lat,
          lng: lng
        }));
        toast.success('Address auto-filled from map');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const fetchLoyaltyBalance = async () => {
    try {
      const response = await loyaltyAPI.getBalance();
      setLoyaltyBalance(response.data);
    } catch (error) {
      console.error('Error fetching loyalty balance:', error);
    }
  };

  const checkDeliveryCoverage = async (lat, lng) => {
    if (!branch?.id) return;
    try {
      const response = await branchAPI.checkDelivery(branch.id, { lat, lng });
      setDeliveryCheck(response.data);
      if (!response.data.covered) {
        toast.error('Sorry, we don\'t deliver to this location');
      }
    } catch (error) {
      console.error('Error checking delivery:', error);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const response = await couponAPI.validate({ code: couponCode, subtotal });
      setCoupon({
        code: response.data.code,
        discount: response.data.discount,
        description: response.data.description
      });
      toast.success('Coupon applied!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponCode('');
  };

  const handleLoyaltyPointsChange = (points) => {
    const maxPoints = Math.min(loyaltyBalance.points, Math.floor(subtotal / 0.01));
    setLoyaltyPointsToUse(Math.min(Math.max(0, points), maxPoints));
  };

  const handlePlaceOrder = async () => {
    if (!customerDetails.name || !customerDetails.phone) {
      toast.error('Please fill in your details');
      return;
    }

    if (orderType === 'delivery') {
      if (!addressForm.address_line || !mapPosition) {
        toast.error('Please select your delivery location on the map');
        return;
      }
      if (deliveryCheck && !deliveryCheck.covered) {
        toast.error('We cannot deliver to your selected location');
        return;
      }
    }

    setSubmitting(true);
    try {
      const orderData = {
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        customer_email: customerDetails.email,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? addressForm : null,
        branch_id: branch?.id || 'branch-1',
        items: items.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          variant_id: item.variant_id,
          variant_name: item.variant_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          modifiers: item.modifiers,
          special_instructions: item.special_instructions,
          subtotal: item.subtotal
        })),
        subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discount,
        coupon_code: coupon?.code || null,
        loyalty_points_used: loyaltyPointsToUse,
        total,
        payment_method: paymentMethod,
        notes: customerDetails.notes
      };

      const response = await orderAPI.create(orderData);
      if (response.data.success) {
        clearCart();
        toast.success('Order placed successfully!');
        navigate(`/track/${response.data.order.order_number}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMapPosition(latlng);
          toast.success('Location found!');
        },
        () => toast.error('Could not get your location'),
        { enableHighAccuracy: true }
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#faf2f1] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <ShoppingBag className="w-20 h-20 mx-auto text-slate-300 mb-6" />
          <h2 className="font-bebas text-3xl text-[#1e3a5f] mb-2">Your cart is empty</h2>
          <p className="text-slate-500 mb-6">Add some delicious items to get started!</p>
          <Link to="/menu">
            <Button data-testid="browse-menu-btn" className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-8">Browse Menu</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf2f1] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bebas text-3xl text-[#1e3a5f]">{step === 1 ? 'Your Cart' : step === 2 ? 'Delivery Details' : 'Payment'}</h1>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between">
            {['Cart', 'Details', 'Payment'].map((label, index) => (
              <div key={label} className="flex items-center">
                <div className={`checkout-step ${step > index + 1 ? 'completed' : step === index + 1 ? 'active' : ''}`}>
                  {step > index + 1 ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:block ${step === index + 1 ? 'text-[#c31c1c] font-semibold' : 'text-slate-400'}`}>{label}</span>
                {index < 2 && <div className={`w-12 sm:w-24 h-0.5 mx-2 ${step > index + 1 ? 'bg-green-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Step 1: Cart Items */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Order Type */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-3">Order Type</h3>
              <div className="flex gap-3">
                <button data-testid="cart-delivery-btn" onClick={() => setOrderType('delivery')} className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${orderType === 'delivery' ? 'border-[#c31c1c] bg-red-50' : 'border-slate-200'}`}>
                  <Truck className={`w-6 h-6 ${orderType === 'delivery' ? 'text-[#c31c1c]' : 'text-slate-400'}`} />
                  <div className="text-left"><p className="font-semibold">Delivery</p><p className="text-xs text-slate-500">{deliveryFee.toFixed(3)} KWD</p></div>
                </button>
                <button data-testid="cart-pickup-btn" onClick={() => setOrderType('pickup')} className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${orderType === 'pickup' ? 'border-[#c31c1c] bg-red-50' : 'border-slate-200'}`}>
                  <Store className={`w-6 h-6 ${orderType === 'pickup' ? 'text-[#c31c1c]' : 'text-slate-400'}`} />
                  <div className="text-left"><p className="font-semibold">Pickup</p><p className="text-xs text-slate-500">Free</p></div>
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#1e3a5f]">{itemCount} Items</h3>
                  <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600">Clear All</button>
                </div>
              </div>
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex gap-4" data-testid={`cart-item-${item.id}`}>
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100'} alt={item.item_name} className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div><h4 className="font-semibold text-[#1e3a5f]">{item.item_name}</h4>{item.variant_name && <p className="text-sm text-slate-500">{item.variant_name}</p>}</div>
                        <button data-testid={`remove-item-${item.id}`} onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="qty-btn"><Minus className="w-4 h-4" /></button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="qty-btn"><Plus className="w-4 h-4" /></button>
                        </div>
                        <span className="font-bold text-[#c31c1c]">{item.subtotal.toFixed(3)} KWD</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3"><Tag className="w-5 h-5 text-[#c31c1c]" /><h3 className="font-semibold text-[#1e3a5f]">Coupon Code</h3></div>
              {coupon ? (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div><p className="font-semibold text-green-700">{coupon.code}</p><p className="text-sm text-green-600">-{coupon.discount.toFixed(3)} KWD</p></div>
                  <button onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-600"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input data-testid="coupon-input" placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="flex-1 rounded-xl" />
                  <Button data-testid="apply-coupon-btn" onClick={handleApplyCoupon} disabled={validatingCoupon} className="bg-[#c31c1c] hover:bg-[#a61818] rounded-xl">Apply</Button>
                </div>
              )}
            </div>

            {/* Loyalty Points */}
            {user && loyaltyBalance.points > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3"><Gift className="w-5 h-5 text-[#d4af37]" /><h3 className="font-semibold text-[#1e3a5f]">Loyalty Points</h3></div>
                <p className="text-sm text-slate-500 mb-3">You have <span className="font-semibold text-[#d4af37]">{loyaltyBalance.points} points</span> ({loyaltyBalance.value.toFixed(3)} KWD)</p>
                <div className="flex items-center gap-4">
                  <Input type="number" min="0" max={loyaltyBalance.points} value={loyaltyPointsToUse} onChange={(e) => handleLoyaltyPointsChange(parseInt(e.target.value) || 0)} className="w-24 rounded-xl" />
                  <span className="text-sm text-slate-500">= {(loyaltyPointsToUse * 0.01).toFixed(3)} KWD discount</span>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{subtotal.toFixed(3)} KWD</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Delivery Fee</span><span>{deliveryFee.toFixed(3)} KWD</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Coupon Discount</span><span>-{discount.toFixed(3)} KWD</span></div>}
                {loyaltyDiscount > 0 && <div className="flex justify-between text-[#d4af37]"><span>Loyalty Discount</span><span>-{loyaltyDiscount.toFixed(3)} KWD</span></div>}
                <div className="flex justify-between pt-3 border-t font-bold text-lg"><span>Total</span><span className="text-[#c31c1c]">{total.toFixed(3)} KWD</span></div>
              </div>
            </div>

            <Button data-testid="proceed-to-details-btn" onClick={() => setStep(2)} className="w-full bg-[#c31c1c] hover:bg-[#a61818] rounded-full py-6 font-bebas text-xl">Continue to Details</Button>
          </motion.div>
        )}

        {/* Step 2: Customer Details */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Your Details</h3>
              <div className="space-y-4">
                <div><label className="form-label">Full Name *</label><Input data-testid="customer-name-input" placeholder="Enter your name" value={customerDetails.name} onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})} className="rounded-xl" /></div>
                <div><label className="form-label">Phone Number *</label><Input data-testid="customer-phone-input" placeholder="+965 XXXX XXXX" value={customerDetails.phone} onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})} className="rounded-xl" /></div>
                <div><label className="form-label">Email (Optional)</label><Input data-testid="customer-email-input" type="email" placeholder="your@email.com" value={customerDetails.email} onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})} className="rounded-xl" /></div>
              </div>
            </div>

            {/* Delivery Address with Map */}
            {orderType === 'delivery' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-[#c31c1c]" /><h3 className="font-semibold text-[#1e3a5f]">Delivery Location</h3></div>
                  <Button size="sm" variant="outline" onClick={getCurrentLocation} className="text-xs"><Navigation className="w-4 h-4 mr-1" /> Use My Location</Button>
                </div>
                
                {/* Map */}
                <div className="h-64 rounded-xl overflow-hidden border mb-4">
                  <MapContainer center={mapPosition || KUWAIT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }} maxBounds={KUWAIT_BOUNDS}>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                  </MapContainer>
                </div>
                
                {mapPosition && (
                  <div className={`p-2 rounded-lg mb-4 text-sm ${deliveryCheck?.covered ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {deliveryCheck?.covered ? '✓ Delivery available to this location' : '⚠ Checking delivery availability...'}
                  </div>
                )}

                <div className="space-y-4">
                  <div><label className="form-label">Address *</label><Input data-testid="address-line-input" placeholder="Street name, area" value={addressForm.address_line} onChange={(e) => setAddressForm({...addressForm, address_line: e.target.value})} className="rounded-xl" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="form-label">Building</label><Input placeholder="Building name/number" value={addressForm.building} onChange={(e) => setAddressForm({...addressForm, building: e.target.value})} className="rounded-xl" /></div>
                    <div><label className="form-label">Floor</label><Input placeholder="Floor number" value={addressForm.floor} onChange={(e) => setAddressForm({...addressForm, floor: e.target.value})} className="rounded-xl" /></div>
                  </div>
                  <div><label className="form-label">Delivery Instructions</label><Input placeholder="Any special instructions..." value={addressForm.instructions} onChange={(e) => setAddressForm({...addressForm, instructions: e.target.value})} className="rounded-xl" /></div>
                </div>
              </div>
            )}

            {orderType === 'pickup' && branch && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4"><Store className="w-5 h-5 text-[#c31c1c]" /><h3 className="font-semibold text-[#1e3a5f]">Pickup Location</h3></div>
                <div className="p-4 bg-slate-50 rounded-xl"><p className="font-semibold">{branch.name}</p><p className="text-sm text-slate-500 mt-1">{branch.address}</p></div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="form-label">Order Notes (Optional)</label>
              <Input data-testid="order-notes-input" placeholder="Any special requests..." value={customerDetails.notes} onChange={(e) => setCustomerDetails({...customerDetails, notes: e.target.value})} className="rounded-xl" />
            </div>

            <Button data-testid="proceed-to-payment-btn" onClick={() => setStep(3)} className="w-full bg-[#c31c1c] hover:bg-[#a61818] rounded-full py-6 font-bebas text-xl">Continue to Payment</Button>
          </motion.div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Payment Method</h3>
              <div className="space-y-3">
                <button data-testid="payment-cash" onClick={() => setPaymentMethod('cash')} className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'cash' ? 'border-[#c31c1c] bg-red-50' : 'border-slate-200'}`}>
                  <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-[#c31c1c]' : 'text-slate-400'}`} />
                  <div className="text-left"><p className="font-semibold">Cash on Delivery</p><p className="text-xs text-slate-500">Pay when you receive your order</p></div>
                </button>
                <button data-testid="payment-card" onClick={() => setPaymentMethod('card')} className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'card' ? 'border-[#c31c1c] bg-red-50' : 'border-slate-200'}`}>
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-[#c31c1c]' : 'text-slate-400'}`} />
                  <div className="text-left"><p className="font-semibold">Card Payment</p><p className="text-xs text-slate-500">Pay with credit/debit card</p></div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">{items.map((item) => (<div key={item.id} className="flex justify-between text-sm"><span className="text-slate-600">{item.quantity}x {item.item_name}{item.variant_name && ` (${item.variant_name})`}</span><span>{item.subtotal.toFixed(3)} KWD</span></div>))}</div>
              <div className="space-y-2 pt-3 border-t text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{subtotal.toFixed(3)} KWD</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Delivery Fee</span><span>{deliveryFee.toFixed(3)} KWD</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Coupon Discount</span><span>-{discount.toFixed(3)} KWD</span></div>}
                {loyaltyDiscount > 0 && <div className="flex justify-between text-[#d4af37]"><span>Loyalty Discount</span><span>-{loyaltyDiscount.toFixed(3)} KWD</span></div>}
                <div className="flex justify-between pt-3 border-t font-bold text-lg"><span>Total</span><span className="text-[#c31c1c]">{total.toFixed(3)} KWD</span></div>
              </div>
            </div>

            <Button data-testid="place-order-btn" onClick={handlePlaceOrder} disabled={submitting} className="w-full bg-[#c31c1c] hover:bg-[#a61818] rounded-full py-6 font-bebas text-xl">{submitting ? 'Placing Order...' : `Place Order - ${total.toFixed(3)} KWD`}</Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
