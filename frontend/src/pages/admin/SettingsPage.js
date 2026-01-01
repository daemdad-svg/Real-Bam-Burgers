import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Store, CreditCard, Truck, Bell, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { settingsAPI, branchAPI } from '@/lib/api';
import { toast } from 'sonner';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);

  const [businessSettings, setBusinessSettings] = useState({
    business_name: 'Bam Burgers',
    business_name_ar: 'بام برجر',
    address: '',
    phone: '',
    email: '',
    currency: 'KWD',
    tax_rate: 0,
    delivery_fee: 0.5,
    min_order_amount: 3.0,
    payment_terms: ''
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    myfatoorah_api_key: '',
    myfatoorah_test_mode: true,
    upay_api_key: '',
    armada_api_key: '',
    wiyak_api_key: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [businessRes, integrationsRes, branchesRes] = await Promise.all([
        settingsAPI.getBusiness?.() || Promise.resolve({ data: {} }),
        settingsAPI.getIntegrations(),
        branchAPI.getAllAdmin()
      ]);
      
      if (businessRes?.data && Object.keys(businessRes.data).length > 0) {
        setBusinessSettings({...businessSettings, ...businessRes.data});
      }
      if (integrationsRes?.data) {
        setIntegrationSettings({...integrationSettings, ...integrationsRes.data});
      }
      setBranches(branchesRes?.data || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateBusiness?.(businessSettings);
      toast.success('Business settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIntegrations = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateIntegrations(integrationSettings);
      toast.success('Integration settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="spinner" /></div>;
  }

  return (
    <div className="p-6 admin-theme">
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-[#1e3a5f]">Settings</h1>
        <p className="text-slate-500">Manage your business and integration settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl">
        <TabsList className="mb-6">
          <TabsTrigger value="business" className="gap-2">
            <Store className="w-4 h-4" /> Business
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-2">
            <Truck className="w-4 h-4" /> Delivery
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Key className="w-4 h-4" /> Integrations
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="font-semibold text-[#1e3a5f] mb-6">Business Information</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name (English)</label>
                  <Input
                    value={businessSettings.business_name}
                    onChange={(e) => setBusinessSettings({...businessSettings, business_name: e.target.value})}
                    placeholder="Bam Burgers"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name (Arabic)</label>
                  <Input
                    value={businessSettings.business_name_ar}
                    onChange={(e) => setBusinessSettings({...businessSettings, business_name_ar: e.target.value})}
                    placeholder="بام برجر"
                    dir="rtl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <Input
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({...businessSettings, address: e.target.value})}
                  placeholder="Business address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({...businessSettings, phone: e.target.value})}
                    placeholder="+965 XXXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({...businessSettings, email: e.target.value})}
                    placeholder="info@bamburgers.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Currency</label>
                  <Input
                    value={businessSettings.currency}
                    onChange={(e) => setBusinessSettings({...businessSettings, currency: e.target.value})}
                    placeholder="KWD"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={businessSettings.tax_rate}
                    onChange={(e) => setBusinessSettings({...businessSettings, tax_rate: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Terms</label>
                <Textarea
                  value={businessSettings.payment_terms}
                  onChange={(e) => setBusinessSettings({...businessSettings, payment_terms: e.target.value})}
                  placeholder="Payment terms and conditions..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveBusiness} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#162d4a]">
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Business Settings'}
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="font-semibold text-[#1e3a5f] mb-6">Delivery Settings</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Default Delivery Fee (KWD)</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={businessSettings.delivery_fee}
                    onChange={(e) => setBusinessSettings({...businessSettings, delivery_fee: parseFloat(e.target.value) || 0})}
                    placeholder="0.500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Order Amount (KWD)</label>
                  <Input
                    type="number"
                    step="0.001"
                    value={businessSettings.min_order_amount}
                    onChange={(e) => setBusinessSettings({...businessSettings, min_order_amount: parseFloat(e.target.value) || 0})}
                    placeholder="3.000"
                  />
                </div>
              </div>

              {/* Branches */}
              <div className="pt-6 border-t">
                <h4 className="font-semibold text-[#1e3a5f] mb-4">Branches</h4>
                {branches.length === 0 ? (
                  <p className="text-slate-500">No branches configured</p>
                ) : (
                  <div className="space-y-3">
                    {branches.map((branch) => (
                      <div key={branch.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#1e3a5f]">{branch.name}</p>
                            <p className="text-sm text-slate-500">{branch.address}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200'
                          }`}>
                            {branch.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          Delivery Fee: {branch.delivery_fee} KWD | Min Order: {branch.min_order_amount} KWD
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSaveBusiness} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#162d4a]">
                <Save className="w-5 h-5 mr-2" />
                {saving ? 'Saving...' : 'Save Delivery Settings'}
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Payment Gateways */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5 text-[#1e3a5f]" />
                <h3 className="font-semibold text-[#1e3a5f]">Payment Gateways</h3>
              </div>
              
              <div className="space-y-6">
                {/* MyFatoorah */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold">MyFatoorah</p>
                      <p className="text-xs text-slate-500">Accept KNET, Visa, MasterCard</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Test Mode</span>
                      <Switch
                        checked={integrationSettings.myfatoorah_test_mode}
                        onCheckedChange={(v) => setIntegrationSettings({...integrationSettings, myfatoorah_test_mode: v})}
                      />
                    </div>
                  </div>
                  <Input
                    type="password"
                    value={integrationSettings.myfatoorah_api_key}
                    onChange={(e) => setIntegrationSettings({...integrationSettings, myfatoorah_api_key: e.target.value})}
                    placeholder="MyFatoorah API Key"
                  />
                </div>

                {/* UPay */}
                <div className="p-4 border rounded-lg">
                  <div className="mb-4">
                    <p className="font-semibold">UPay</p>
                    <p className="text-xs text-slate-500">Mobile payment gateway</p>
                  </div>
                  <Input
                    type="password"
                    value={integrationSettings.upay_api_key}
                    onChange={(e) => setIntegrationSettings({...integrationSettings, upay_api_key: e.target.value})}
                    placeholder="UPay API Key"
                  />
                </div>
              </div>
            </div>

            {/* Delivery APIs */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6">
                <Truck className="w-5 h-5 text-[#1e3a5f]" />
                <h3 className="font-semibold text-[#1e3a5f]">Delivery Services</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Armada API Key</label>
                  <Input
                    type="password"
                    value={integrationSettings.armada_api_key}
                    onChange={(e) => setIntegrationSettings({...integrationSettings, armada_api_key: e.target.value})}
                    placeholder="Armada API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Wiyak API Key</label>
                  <Input
                    type="password"
                    value={integrationSettings.wiyak_api_key}
                    onChange={(e) => setIntegrationSettings({...integrationSettings, wiyak_api_key: e.target.value})}
                    placeholder="Wiyak API Key"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSaveIntegrations} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#162d4a]">
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Integration Settings'}
            </Button>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
