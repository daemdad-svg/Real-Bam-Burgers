import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Image, Search, GripVertical } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { menuAPI } from '../../lib/api';
import { toast } from 'sonner';

const MenuManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '', name_ar: '', description: '', price: '', image_url: '',
    category_id: '', is_popular: false, available: true, variants: []
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '', name_ar: '', description: '', image_url: '', display_order: 0, available: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        menuAPI.getAllCategories(),
        menuAPI.getAllItems()
      ]);
      setCategories(categoriesRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      toast.error('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    try {
      const data = {
        ...itemForm,
        price: parseFloat(itemForm.price) || 0,
        variants: itemForm.variants.map(v => ({
          ...v,
          price: parseFloat(v.price) || 0
        }))
      };

      if (editingItem) {
        await menuAPI.updateItem(editingItem.id, data);
        toast.success('Item updated');
      } else {
        await menuAPI.createItem(data);
        toast.success('Item created');
      }
      
      setShowItemModal(false);
      resetItemForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await menuAPI.deleteItem(id);
      toast.success('Item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleSaveCategory = async () => {
    try {
      const data = {
        ...categoryForm,
        display_order: parseInt(categoryForm.display_order) || 0
      };

      if (editingCategory) {
        await menuAPI.updateCategory(editingCategory.id, data);
        toast.success('Category updated');
      } else {
        await menuAPI.createCategory(data);
        toast.success('Category created');
      }
      
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure? This will affect items in this category.')) return;
    
    try {
      await menuAPI.deleteCategory(id);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const resetItemForm = () => {
    setItemForm({
      name: '', name_ar: '', description: '', price: '', image_url: '',
      category_id: '', is_popular: false, available: true, variants: []
    });
    setEditingItem(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '', name_ar: '', description: '', image_url: '', display_order: 0, available: true
    });
    setEditingCategory(null);
  };

  const openEditItem = (item) => {
    setItemForm({
      name: item.name || '',
      name_ar: item.name_ar || '',
      description: item.description || '',
      price: item.price?.toString() || '',
      image_url: item.image_url || '',
      category_id: item.category_id || '',
      is_popular: item.is_popular || false,
      available: item.available !== false,
      variants: item.variants || []
    });
    setEditingItem(item);
    setShowItemModal(true);
  };

  const openEditCategory = (category) => {
    setCategoryForm({
      name: category.name || '',
      name_ar: category.name_ar || '',
      description: category.description || '',
      image_url: category.image_url || '',
      display_order: category.display_order || 0,
      available: category.available !== false
    });
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const addVariant = () => {
    setItemForm({
      ...itemForm,
      variants: [...itemForm.variants, { id: Date.now().toString(), name: '', price: '', available: true }]
    });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...itemForm.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setItemForm({ ...itemForm, variants: newVariants });
  };

  const removeVariant = (index) => {
    setItemForm({
      ...itemForm,
      variants: itemForm.variants.filter((_, i) => i !== index)
    });
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 admin-theme">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bebas text-4xl text-[#1e3a5f]">Menu Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'items' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-600'
          }`}
        >
          Menu Items ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'categories' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-600'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              data-testid="add-item-btn"
              onClick={() => { resetItemForm(); setShowItemModal(true); }}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Item
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Item</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Category</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Price</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.image_url || 'https://via.placeholder.com/48'}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-semibold text-[#1e3a5f]">{item.name}</p>
                          {item.is_popular && (
                            <span className="text-xs bg-[#d4af37] text-white px-2 py-0.5 rounded-full">Popular</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {categories.find(c => c.id === item.category_id)?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#c31c1c]">
                      {item.price.toFixed(3)} KWD
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditItem(item)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-end mb-6">
            <Button
              data-testid="add-category-btn"
              onClick={() => { resetCategoryForm(); setShowCategoryModal(true); }}
              className="bg-[#1e3a5f] hover:bg-[#162d4a]"
            >
              <Plus className="w-5 h-5 mr-2" /> Add Category
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div className="h-32 overflow-hidden">
                  <img 
                    src={category.image_url || 'https://via.placeholder.com/300x150'}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1e3a5f]">{category.name}</h3>
                      {category.name_ar && <p className="text-sm text-slate-500">{category.name_ar}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      category.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {category.available ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {items.filter(i => i.category_id === category.id).length} items
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditCategory(category)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl text-[#1e3a5f]">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name (English) *</label>
                <Input
                  value={itemForm.name}
                  onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  placeholder="Burger"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Name (Arabic)</label>
                <Input
                  value={itemForm.name_ar}
                  onChange={(e) => setItemForm({...itemForm, name_ar: e.target.value})}
                  placeholder="برجر"
                  dir="rtl"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                placeholder="Delicious beef burger..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Base Price (KWD) *</label>
                <Input
                  type="number"
                  step="0.001"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                  placeholder="2.500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <Select 
                  value={itemForm.category_id} 
                  onValueChange={(value) => setItemForm({...itemForm, category_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={itemForm.image_url}
                onChange={(e) => setItemForm({...itemForm, image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemForm.available}
                  onCheckedChange={(checked) => setItemForm({...itemForm, available: checked})}
                />
                <label className="text-sm">Available</label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemForm.is_popular}
                  onCheckedChange={(checked) => setItemForm({...itemForm, is_popular: checked})}
                />
                <label className="text-sm">Mark as Popular</label>
              </div>
            </div>

            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Variants (Optional)</label>
                <Button size="sm" variant="outline" onClick={addVariant}>
                  <Plus className="w-4 h-4 mr-1" /> Add Variant
                </Button>
              </div>
              {itemForm.variants.map((variant, index) => (
                <div key={variant.id || index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Name (e.g., Single)"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Price"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, 'price', e.target.value)}
                    className="w-32"
                  />
                  <Button size="sm" variant="outline" onClick={() => removeVariant(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleSaveItem}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a]"
              >
                {editingItem ? 'Update Item' : 'Create Item'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setShowItemModal(false); resetItemForm(); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bebas text-2xl text-[#1e3a5f]">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name (English) *</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                placeholder="Burgers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Name (Arabic)</label>
              <Input
                value={categoryForm.name_ar}
                onChange={(e) => setCategoryForm({...categoryForm, name_ar: e.target.value})}
                placeholder="برجر"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={categoryForm.image_url}
                onChange={(e) => setCategoryForm({...categoryForm, image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Display Order</label>
              <Input
                type="number"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={categoryForm.available}
                onCheckedChange={(checked) => setCategoryForm({...categoryForm, available: checked})}
              />
              <label className="text-sm">Active</label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={handleSaveCategory}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#162d4a]"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setShowCategoryModal(false); resetCategoryForm(); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagementPage;
