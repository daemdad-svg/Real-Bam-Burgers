import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check, ChefHat, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { orderAPI } from '../../lib/api';
import { toast } from 'sonner';

const KDSPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('preparing');

  const fetchOrders = useCallback(async () => {
    try {
      const response = await orderAPI.getActive();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleBump = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'accepted' ? 'preparing' : 
                       currentStatus === 'preparing' ? 'ready' : null;
    
    if (!nextStatus) return;

    try {
      await orderAPI.updateStatus(orderId, nextStatus);
      toast.success(`Order bumped to ${nextStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to bump order');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return ['accepted', 'preparing', 'ready'].includes(order.status);
    return order.status === filter;
  });

  const getTimeSinceOrder = (timestamp) => {
    if (!timestamp) return { text: '', urgent: false };
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    return {
      text: diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`,
      urgent: diffMins > 15
    };
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bebas text-4xl text-white">Kitchen Display</h1>
        <div className="flex gap-2">
          {['all', 'accepted', 'preparing', 'ready'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status 
                  ? status === 'accepted' ? 'bg-yellow-500 text-black' :
                    status === 'preparing' ? 'bg-orange-500 text-white' :
                    status === 'ready' ? 'bg-green-500 text-white' :
                    'bg-white text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-500">No orders in kitchen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredOrders.map((order) => {
              const timeInfo = getTimeSinceOrder(order.created_at);
              
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`kds-ticket ${order.status} ${timeInfo.urgent ? 'delayed' : ''}`}
                  data-testid={`kds-ticket-${order.id}`}
                >
                  {/* Ticket Header */}
                  <div className="kds-ticket-header flex items-center justify-between">
                    <div>
                      <p className="font-bebas text-2xl">{order.order_number}</p>
                      <p className="text-sm text-white/70">{order.customer_name}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                      timeInfo.urgent ? 'bg-red-500 animate-pulse' : 'bg-white/20'
                    }`}>
                      {timeInfo.urgent && <AlertTriangle className="w-4 h-4" />}
                      <Clock className="w-4 h-4" />
                      {timeInfo.text}
                    </div>
                  </div>

                  {/* Ticket Body */}
                  <div className="p-4">
                    {/* Order Type Badge */}
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        order.order_type === 'delivery' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.order_type.toUpperCase()}
                      </span>
                      {order.aggregator && (
                        <span className="ml-2 inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100">
                          {order.aggregator}
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                      {order.items?.map((item, index) => (
                        <div 
                          key={index} 
                          className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg"
                        >
                          <span className="w-8 h-8 bg-[#1e3a5f] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                            {item.quantity}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-[#1e3a5f]">
                              {item.item_name}
                            </p>
                            {item.variant_name && (
                              <p className="text-sm text-slate-500">{item.variant_name}</p>
                            )}
                            {item.special_instructions && (
                              <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {item.special_instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {order.notes}
                      </div>
                    )}

                    {/* Bump Button */}
                    <Button
                      data-testid={`bump-order-${order.id}`}
                      onClick={() => handleBump(order.id, order.status)}
                      className={`w-full mt-4 py-6 font-bebas text-xl ${
                        order.status === 'accepted' 
                          ? 'bg-orange-500 hover:bg-orange-600' 
                          : order.status === 'preparing'
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-slate-300 cursor-not-allowed'
                      }`}
                      disabled={order.status === 'ready'}
                    >
                      {order.status === 'accepted' && <><ChefHat className="w-5 h-5 mr-2" /> Start Preparing</>}
                      {order.status === 'preparing' && <><Check className="w-5 h-5 mr-2" /> Mark Ready</>}
                      {order.status === 'ready' && <><Check className="w-5 h-5 mr-2" /> Ready for Pickup</>}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default KDSPage;
