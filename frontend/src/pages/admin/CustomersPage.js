import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Phone, Gift, ShoppingBag, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { customerAPI } from '@/lib/api';
import { toast } from 'sonner';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll({ search: searchQuery });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const viewCustomer = async (customerId) => {
    try {
      const response = await customerAPI.get(customerId);
      setSelectedCustomer(response.data);
    } catch (error) {
      toast.error('Failed to load customer details');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  }

  return (
    <div className="p-6 admin-theme">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-[#1e3a5f]">Customers</h1>
          <p className="text-slate-500">{customers.length} customers</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#162d4a]">
            Search
          </Button>
        </div>
      </form>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Customer</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Contact</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Loyalty Points</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-semibold">
                        {(customer.name || customer.email || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1e3a5f]">{customer.name || 'Guest Customer'}</p>
                        <p className="text-xs text-slate-400">ID: {customer.id?.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <Phone className="w-4 h-4" />
                          {customer.phone}
                        </div>
                      )}
                      {!customer.email && !customer.phone && (
                        <span className="text-slate-400 text-sm">No contact info</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[#d4af37]" />
                      <span className="font-semibold">{customer.loyalty_points || 0}</span>
                      <span className="text-slate-400 text-sm">points</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {customer.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewCustomer(customer.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl text-[#1e3a5f]">Customer Details</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="mt-4 space-y-6">
              {/* Customer Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                  {(selectedCustomer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-xl text-[#1e3a5f]">{selectedCustomer.name || 'Guest Customer'}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                    {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <Gift className="w-6 h-6 mx-auto text-[#d4af37] mb-2" />
                  <p className="text-2xl font-bold text-[#1e3a5f]">{selectedCustomer.loyalty_points || 0}</p>
                  <p className="text-xs text-slate-500">Loyalty Points</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <ShoppingBag className="w-6 h-6 mx-auto text-[#c31c1c] mb-2" />
                  <p className="text-2xl font-bold text-[#1e3a5f]">{selectedCustomer.recent_orders?.length || 0}</p>
                  <p className="text-xs text-slate-500">Total Orders</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <span className="text-2xl mb-2 block">💰</span>
                  <p className="text-2xl font-bold text-[#1e3a5f]">
                    {(selectedCustomer.wallet_balance || 0).toFixed(3)}
                  </p>
                  <p className="text-xs text-slate-500">Wallet Balance</p>
                </div>
              </div>

              {/* Recent Orders */}
              {selectedCustomer.recent_orders && selectedCustomer.recent_orders.length > 0 && (
                <div>
                  <h4 className="font-semibold text-[#1e3a5f] mb-3">Recent Orders</h4>
                  <div className="space-y-2">
                    {selectedCustomer.recent_orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-semibold">{order.order_number}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#c31c1c]">{order.total?.toFixed(3)} KWD</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
