import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Clock, Check, ChefHat, Truck, Package, X, 
  Phone, MapPin, User, CreditCard, Banknote, AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { orderAPI } from '../../lib/api';
import { toast } from 'sonner';

// Buzzer sound URL (5 second alert)
const BUZZER_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [filter, setFilter] = useState('all');
  const audioRef = useRef(null);
  const previousOrderIds = useRef(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const response = await orderAPI.getActive();
      const newOrders = response.data;
      
      // Check for new orders
      newOrders.forEach(order => {
        if (!previousOrderIds.current.has(order.id) && order.status === 'placed') {
          // New order detected!
          setNewOrderAlert(order);
          playBuzzer();
        }
      });
      
      // Update previous order IDs
      previousOrderIds.current = new Set(newOrders.map(o => o.id));
      setOrders(newOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    
    // Poll for new orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const playBuzzer = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      toast.success(`Order ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleAcceptNewOrder = async () => {
    if (newOrderAlert) {
      await handleStatusUpdate(newOrderAlert.id, 'accepted');
      setNewOrderAlert(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const getStatusColor = (status) => {
    const colors = {
      placed: 'bg-blue-100 text-blue-800 border-blue-200',
      accepted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      preparing: 'bg-orange-100 text-orange-800 border-orange-200',
      ready: 'bg-green-100 text-green-800 border-green-200',
      out_for_delivery: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      placed: 'accepted',
      accepted: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'completed',
    };
    return flow[currentStatus];
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeSinceOrder = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ${diffMins % 60}m ago`;
  };

  return (
    <div className="p-6 admin-theme">
      {/* Audio element for buzzer */}
      <audio ref={audioRef} src={BUZZER_SOUND} loop />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-[#1e3a5f]">Order Inbox</h1>
          <p className="text-slate-500">{orders.length} active orders</p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'placed', 'accepted', 'preparing', 'ready', 'out_for_delivery'].map((status) => (
            <button
              key={status}
              data-testid={`filter-${status}`}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status 
                  ? 'bg-[#1e3a5f] text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No orders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-4 ${
                  order.status === 'placed' ? 'border-blue-500' :
                  order.status === 'accepted' ? 'border-yellow-500' :
                  order.status === 'preparing' ? 'border-orange-500' :
                  order.status === 'ready' ? 'border-green-500' :
                  'border-slate-300'
                }`}
                data-testid={`order-card-${order.id}`}
              >
                {/* Order Header */}
                <div className="p-4 bg-[#1e3a5f] text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bebas text-xl">{order.order_number}</p>
                      <p className="text-sm text-white/70">{formatTime(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="text-xs text-white/70 mt-1">{getTimeSinceOrder(order.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-4">
                  {/* Customer Info */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1e3a5f]">{order.customer_name}</p>
                      <p className="text-sm text-slate-500">{order.customer_phone}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {order.payment_method === 'cash' ? (
                        <Banknote className="w-4 h-4 text-green-600" />
                      ) : (
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="capitalize">{order.payment_method}</span>
                    </div>
                  </div>

                  {/* Order Type */}
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    {order.order_type === 'delivery' ? (
                      <>
                        <Truck className="w-4 h-4 text-[#c31c1c]" />
                        <span className="text-[#c31c1c] font-semibold">Delivery</span>
                        {order.delivery_address && (
                          <span className="text-slate-500 truncate flex-1">
                            - {order.delivery_address.address_line}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 text-[#d4af37]" />
                        <span className="text-[#d4af37] font-semibold">Pickup</span>
                      </>
                    )}
                    {order.aggregator && (
                      <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        {order.aggregator}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.items?.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {item.quantity}x {item.item_name}
                          {item.variant_name && ` (${item.variant_name})`}
                        </span>
                        <span>{item.subtotal?.toFixed(3)}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <p className="text-sm text-slate-400">+{order.items.length - 3} more items</p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-[#c31c1c]">{order.total?.toFixed(3)} KWD</span>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {order.notes}
                    </div>
                  )}

                  {/* Actions */}
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="mt-4 flex gap-2">
                      {getNextStatus(order.status) && (
                        <Button
                          data-testid={`update-status-${order.id}`}
                          onClick={() => handleStatusUpdate(order.id, getNextStatus(order.status))}
                          className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a]"
                        >
                          {order.status === 'placed' && <><Check className="w-4 h-4 mr-2" /> Accept</>}
                          {order.status === 'accepted' && <><ChefHat className="w-4 h-4 mr-2" /> Start Preparing</>}
                          {order.status === 'preparing' && <><Package className="w-4 h-4 mr-2" /> Ready</>}
                          {order.status === 'ready' && order.order_type === 'delivery' && <><Truck className="w-4 h-4 mr-2" /> Out for Delivery</>}
                          {order.status === 'ready' && order.order_type === 'pickup' && <><Check className="w-4 h-4 mr-2" /> Complete</>}
                          {order.status === 'out_for_delivery' && <><Check className="w-4 h-4 mr-2" /> Complete</>}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                        className="text-red-500 border-red-200 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* New Order Alert Modal */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="new-order-notification"
            onClick={() => {}}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="new-order-card"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-[#c31c1c] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Bell className="w-10 h-10 text-white" />
                </div>
                <h2 className="font-bebas text-4xl text-[#1e3a5f] mb-2">NEW ORDER!</h2>
                <p className="text-2xl font-bold text-[#c31c1c] mb-2">{newOrderAlert.order_number}</p>
                <p className="text-slate-600 mb-2">{newOrderAlert.customer_name}</p>
                <p className="text-3xl font-bold text-[#1e3a5f] mb-6">{newOrderAlert.total?.toFixed(3)} KWD</p>
                
                <div className="flex gap-4">
                  <Button
                    data-testid="accept-new-order-btn"
                    onClick={handleAcceptNewOrder}
                    className="flex-1 bg-green-500 hover:bg-green-600 py-6"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Accept Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewOrderAlert(null);
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                      }
                    }}
                    className="py-6"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
