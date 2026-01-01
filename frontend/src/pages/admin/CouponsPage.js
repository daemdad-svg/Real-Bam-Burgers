import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Tag, Calendar, Percent, DollarSign, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { couponAPI } from '@/lib/api';
import { toast } from 'sonner';

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description_en: '',
    description_ar: '',
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
      setCoupons(response.data);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_order_amount: parseFloat(formData.min_order_amount) || 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString()
      };

      if (editingCoupon) {
        await couponAPI.update(editingCoupon.id, data);
        toast.success('Coupon updated successfully');
      } else {
        await couponAPI.create(data);
        toast.success('Coupon created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save coupon');
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description_en: coupon.description_en || '',
      description_ar: coupon.description_ar || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount?.toString() || '',
      max_discount: coupon.max_discount?.toString() || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      valid_from: coupon.valid_from?.split('T')[0] || '',
      valid_until: coupon.valid_until?.split('T')[0] || '',
      is_active: coupon.is_active
    });
    setIsDialogOpen(true);
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

  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      description_en: '',
      description_ar: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_discount: '',
      usage_limit: '',
      valid_from: '',
      valid_until: '',
      is_active: true
    });
  };

  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="p-6 admin-theme">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-[#1e3a5f]">Coupons</h1>
          <p className="text-slate-500">Manage discount codes and promotions</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="bg-[#c31c1c] hover:bg-[#a61818]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Tag className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">No coupons yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {coupons.map((coupon) => (
              <motion.div
                key={coupon.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
                  coupon.is_active && !isExpired(coupon.valid_until)
                    ? 'border-green-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#c31c1c]" />
                    <span className="font-bebas text-2xl text-[#1e3a5f]">
                      {coupon.code}
                    </span>
                  </div>
                  {coupon.is_active && !isExpired(coupon.valid_until) ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                      {isExpired(coupon.valid_until) ? 'Expired' : 'Inactive'}
                    </span>
                  )}
                </div>

                <p className="text-slate-600 text-sm mb-4">
                  {coupon.description_en || coupon.description || 'No description'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    {coupon.discount_type === 'percentage' ? (
                      <Percent className="w-4 h-4 text-[#c31c1c]" />
                    ) : (
                      <DollarSign className="w-4 h-4 text-[#c31c1c]" />
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Discount</p>
                      <p className="font-semibold">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `${coupon.discount_value} KWD`}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500">Min. Order</p>
                    <p className="font-semibold">{coupon.min_order_amount} KWD</p>
                  </div>
                </div>

                {coupon.usage_limit && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-1">Usage</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-[#c31c1c] h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              ((coupon.used_count || 0) / coupon.usage_limit) * 100,
                              100
                            )}%`
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold">
                        {coupon.used_count || 0}/{coupon.usage_limit}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(coupon.valid_from).toLocaleDateString()} -{' '}
                    {new Date(coupon.valid_until).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(coupon)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(coupon.id)}
                    className="text-red-500 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas text-3xl text-[#1e3a5f]">
              {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Coupon Code *</label>
              <Input
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="SUMMER2024"
                className="uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Description (English)</label>
                <Input
                  value={formData.description_en}
                  onChange={(e) =>
                    setFormData({ ...formData, description_en: e.target.value })
                  }
                  placeholder="10% off for new customers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (Arabic)</label>
                <Input
                  value={formData.description_ar}
                  onChange={(e) =>
                    setFormData({ ...formData, description_ar: e.target.value })
                  }
                  placeholder="خصم 10% للعملاء الجدد"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Discount Type *</label>
                <select
                  required
                  value={formData.discount_type}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (KWD)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Discount Value *</label>
                <Input
                  required
                  type="number"
                  step="0.001"
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_value: e.target.value })
                  }
                  placeholder={formData.discount_type === 'percentage' ? '10' : '2.500'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Min. Order Amount (KWD)
                </label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.min_order_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, min_order_amount: e.target.value })
                  }
                  placeholder="5.000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max. Discount (KWD)
                  <span className="text-xs text-slate-500 ml-1">(optional)</span>
                </label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.max_discount}
                  onChange={(e) =>
                    setFormData({ ...formData, max_discount: e.target.value })
                  }
                  placeholder="2.000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Usage Limit <span className="text-xs text-slate-500">(optional)</span>
              </label>
              <Input
                type="number"
                value={formData.usage_limit}
                onChange={(e) =>
                  setFormData({ ...formData, usage_limit: e.target.value })
                }
                placeholder="100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Valid From *</label>
                <Input
                  required
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_from: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Valid Until *</label>
                <Input
                  required
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_until: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Active (coupon can be used)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-[#c31c1c] hover:bg-[#a61818]"
              >
                <Check className="w-4 h-4 mr-2" />
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponsPage;
