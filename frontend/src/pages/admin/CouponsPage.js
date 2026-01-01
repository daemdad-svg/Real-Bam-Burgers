import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Tag, Calendar, Percent, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { couponAPI } from '@/lib/api';
import { toast } from 'sonner';

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '',
    max_discount: '',
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await couponAPI.getAll();
      setCoupons(response.data || []);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.discount_value) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      const data = {
        ...formData,
        discount_value: parseFloat(formData.discount_value) || 0,
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString()
      };

      if (editingCoupon) {
        await couponAPI.update(editingCoupon.id, data);
        toast.success('Coupon updated');
      } else {
        await couponAPI.create(data);
        toast.success('Coupon created');
      }

      setShowModal(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await couponAPI.delete(id);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await couponAPI.update(coupon.id, { is_active: !coupon.is_active });
      toast.success(`Coupon ${coupon.is_active ? 'deactivated' : 'activated'}`);
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to update coupon');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_discount: '',
      usage_limit: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true
    });
    setEditingCoupon(null);
  };

  const openEdit = (coupon) => {
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value?.toString() || '',
      min_order_amount: coupon.min_order_amount?.toString() || '',
      max_discount: coupon.max_discount?.toString() || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      valid_from: coupon.valid_from?.split('T')[0] || '',
      valid_until: coupon.valid_until?.split('T')[0] || '',
      is_active: coupon.is_active
    });
    setEditingCoupon(coupon);
    setShowModal(true);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  }

  return (
    <div className="p-6 admin-theme">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-[#1e3a5f]">Coupons</h1>
          <p className="text-slate-500">{coupons.length} coupons</p>
        </div>
        <Button
          data-testid="add-coupon-btn"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#1e3a5f] hover:bg-[#162d4a]"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Coupon
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search coupons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCoupons.map((coupon) => {
          const isExpired = new Date(coupon.valid_until) < new Date();
          
          return (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${
                !coupon.is_active ? 'border-slate-300 opacity-60' :
                isExpired ? 'border-red-400' : 'border-[#d4af37]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#d4af37]" />
                  <span className="font-bebas text-2xl text-[#1e3a5f]">{coupon.code}</span>
                </div>
                <Switch
                  checked={coupon.is_active}
                  onCheckedChange={() => handleToggleActive(coupon)}
                />
              </div>

              <p className="text-slate-500 text-sm mb-3">{coupon.description || 'No description'}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {coupon.discount_type === 'percentage' ? (
                    <Percent className="w-4 h-4 text-slate-400" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-semibold text-[#c31c1c]">
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}% off`
                      : `${coupon.discount_value} KWD off`
                    }
                  </span>
                </div>
                
                {coupon.min_order_amount > 0 && (
                  <p className="text-slate-500">Min order: {coupon.min_order_amount} KWD</p>
                )}
                
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(coupon.valid_from).toLocaleDateString()} - {new Date(coupon.valid_until).toLocaleDateString()}
                  </span>
                </div>

                {coupon.usage_limit && (
                  <p className="text-slate-500">
                    Used: {coupon.used_count || 0} / {coupon.usage_limit}
                  </p>
                )}
              </div>

              {isExpired && coupon.is_active && (
                <div className="mt-3 px-2 py-1 bg-red-50 text-red-600 text-xs rounded">
                  Expired
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button size="sm" variant="outline" onClick={() => openEdit(coupon)} className="flex-1">
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(coupon.id)} className="text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {filteredCoupons.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl">
            <Tag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">No coupons found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl text-[#1e3a5f]">
              {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Coupon Code *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="WELCOME10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="10% off for new customers"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Discount Type</label>
                <Select value={formData.discount_type} onValueChange={(v) => setFormData({...formData, discount_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (KWD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Discount Value *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Min Order (KWD)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({...formData, min_order_amount: e.target.value})}
                  placeholder="5.000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Discount (KWD)</label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({...formData, max_discount: e.target.value})}
                  placeholder="2.000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Usage Limit</label>
              <Input
                type="number"
                value={formData.usage_limit}
                onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                placeholder="100 (empty = unlimited)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Valid From</label>
                <Input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Valid Until</label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({...formData, is_active: v})}
              />
              <label className="text-sm">Active</label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSubmit} className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a]">
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponsPage;
