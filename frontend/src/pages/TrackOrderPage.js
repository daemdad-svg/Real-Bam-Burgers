import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Clock, ChefHat, Package, Truck, Home, ArrowLeft, Phone, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { orderAPI } from '../lib/api';
import { supabase } from '../lib/supabase';

const TrackOrderPage = () => {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const statuses = [
    { key: 'placed', label: 'Order Placed', icon: Check, timestamp_key: 'created_at' },
    { key: 'accepted', label: 'Order Accepted', icon: Clock, timestamp_key: 'accepted_at' },
    { key: 'preparing', label: 'Preparing', icon: ChefHat, timestamp_key: 'preparing_at' },
    { key: 'ready', label: 'Ready', icon: Package, timestamp_key: 'ready_at' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, timestamp_key: 'out_for_delivery_at' },
    { key: 'completed', label: 'Delivered', icon: Home, timestamp_key: 'completed_at' },
  ];

  useEffect(() => {
    fetchOrder();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${orderNumber}`
        },
        (payload) => {
          setOrder(payload.new);
        }
      )
      .subscribe();

    // Polling fallback
    const pollInterval = setInterval(fetchOrder, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [orderNumber]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.track(orderNumber);
      setOrder(response.data);
      setError(null);
    } catch (err) {
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndex = () => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    return statuses.findIndex(s => s.key === order.status);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf2f1] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#faf2f1] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Package className="w-20 h-20 mx-auto text-slate-300 mb-6" />
          <h2 className="font-bebas text-3xl text-[#1e3a5f] mb-2">Order Not Found</h2>
          <p className="text-slate-500 mb-6">We couldn't find an order with this number</p>
          <Link to="/menu">
            <Button className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-8">
              Browse Menu
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex();

  return (
    <div className="min-h-screen bg-[#faf2f1] pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link 
            to="/menu"
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bebas text-2xl text-[#1e3a5f]">Track Order</h1>
            <p className="text-sm text-slate-500">{order.order_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 text-center ${
            order.status === 'cancelled' 
              ? 'bg-red-100' 
              : order.status === 'completed'
              ? 'bg-green-100'
              : 'bg-[#c31c1c]'
          }`}
        >
          {order.status === 'cancelled' ? (
            <>
              <h2 className="font-bebas text-3xl text-red-700">Order Cancelled</h2>
              {order.cancellation_reason && (
                <p className="text-red-600 mt-2">{order.cancellation_reason}</p>
              )}
            </>
          ) : order.status === 'completed' ? (
            <>
              <Check className="w-16 h-16 mx-auto text-green-600 mb-2" />
              <h2 className="font-bebas text-3xl text-green-700">Order Delivered!</h2>
              <p className="text-green-600 mt-2">Thank you for ordering with us</p>
            </>
          ) : (
            <>
              <h2 className="font-bebas text-3xl text-white">
                {statuses[currentStatusIndex]?.label || 'Processing'}
              </h2>
              <p className="text-white/80 mt-2">
                {order.order_type === 'delivery' 
                  ? 'Your order is on its way!' 
                  : 'Your order will be ready for pickup soon'}
              </p>
            </>
          )}
        </motion.div>

        {/* Progress Tracker */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#1e3a5f] mb-6">Order Progress</h3>
            
            <div className="space-y-0">
              {statuses.map((status, index) => {
                // Skip 'out_for_delivery' for pickup orders
                if (order.order_type === 'pickup' && status.key === 'out_for_delivery') {
                  return null;
                }

                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const timestamp = order[status.timestamp_key];
                const Icon = status.icon;

                return (
                  <div key={status.key} className="tracking-step">
                    <div className={`tracking-dot ${isCurrent ? 'active' : isCompleted ? 'completed' : 'pending'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="ml-4 pb-8">
                      <p className={`font-semibold ${isCompleted || isCurrent ? 'text-[#1e3a5f]' : 'text-slate-400'}`}>
                        {status.label}
                      </p>
                      {timestamp && (
                        <p className="text-sm text-slate-500">{formatTime(timestamp)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-[#1e3a5f] mb-4">Order Details</h3>
          
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {item.quantity}x {item.item_name}
                  {item.variant_name && ` (${item.variant_name})`}
                </span>
                <span>{item.subtotal?.toFixed(3)} KWD</span>
              </div>
            ))}
            
            <div className="pt-3 border-t mt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-[#c31c1c]">{order.total?.toFixed(3)} KWD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact / Support */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-[#1e3a5f] mb-4">Need Help?</h3>
          <a 
            href="tel:+96594745424"
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-12 h-12 bg-[#c31c1c] rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#1e3a5f]">Call Restaurant</p>
              <p className="text-sm text-slate-500">+965 9474 5424</p>
            </div>
          </a>
        </div>

        {/* Order Again */}
        <Link to="/menu">
          <Button 
            data-testid="order-again-btn"
            className="w-full bg-[#c31c1c] hover:bg-[#a61818] rounded-full py-6 font-bebas text-xl"
          >
            Order Again
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default TrackOrderPage;
