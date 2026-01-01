import { useState, useEffect } from 'react';
import { Users, Search, Phone, Mail, MapPin, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { customerAPI } from '@/lib/api';
import { toast } from 'sonner';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.customers || []);
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  });

  return (
    <div className="p-6 admin-theme">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-[#1e3a5f]">Customers</h1>
          <p className="text-slate-500">{customers.length} registered customers</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              {/* Customer Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#c31c1c]/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#c31c1c]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1e3a5f]">{customer.name}</h3>
                  <p className="text-sm text-slate-500">
                    Member since {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{customer.email}</span>
                  </div>
                )}
                {customer.area && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{customer.area}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-slate-500">Total Orders</p>
                  <p className="font-semibold text-[#1e3a5f]">
                    {customer.total_orders || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Spent</p>
                  <p className="font-semibold text-[#c31c1c]">
                    {(customer.total_spent || 0).toFixed(3)} KWD
                  </p>
                </div>
              </div>

              {/* Loyalty Points */}
              {customer.loyalty_points !== undefined && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-sm text-slate-600">Loyalty Points</span>
                    </div>
                    <span className="font-semibold text-[#d4af37]">
                      {customer.loyalty_points}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomersPage;