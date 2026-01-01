import { useState, useEffect } from 'react';
import { Save, Key, CreditCard, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { settingsAPI } from '@/lib/api';
import { toast } from 'sonner';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState({
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
      const response = await settingsAPI.getIntegrations();
      setIntegrations(response.data);
    } catch (error) {
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.updateIntegrations(integrations);
      toast.success('Integration settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 admin-theme">
      <div className="mb-6">
        <h1 className="font-bebas text-4xl text-[#1e3a5f]">Integration Settings</h1>
        <p className="text-slate-500">Manage third-party API keys and integrations</p>
      </div>

      <div className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Gateways */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#c31c1c]/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#c31c1c]" />
              </div>
              <div>
                <h2 className="font-bebas text-2xl text-[#1e3a5f]">Payment Gateways</h2>
                <p className="text-sm text-slate-500">Configure payment processing</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* MyFatoorah */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  MyFatoorah API Key
                </label>
                <Input
                  type="password"
                  value={integrations.myfatoorah_api_key || ''}
                  onChange={(e) =>
                    setIntegrations({ ...integrations, myfatoorah_api_key: e.target.value })
                  }
                  placeholder="Enter your MyFatoorah API key"
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="myfatoorah_test"
                    checked={integrations.myfatoorah_test_mode}
                    onChange={(e) =>
                      setIntegrations({ ...integrations, myfatoorah_test_mode: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <label htmlFor="myfatoorah_test" className="text-sm text-slate-600">
                    Test Mode (Use sandbox environment)
                  </label>
                </div>
              </div>

              {/* UPay */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  UPay API Key
                </label>
                <Input
                  type="password"
                  value={integrations.upay_api_key || ''}
                  onChange={(e) =>
                    setIntegrations({ ...integrations, upay_api_key: e.target.value })
                  }
                  placeholder="Enter your UPay API key"
                />
              </div>
            </div>
          </div>

          {/* Delivery Partners */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#c31c1c]/10 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-[#c31c1c]" />
              </div>
              <div>
                <h2 className="font-bebas text-2xl text-[#1e3a5f]">Delivery Partners</h2>
                <p className="text-sm text-slate-500">Configure delivery integrations</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Armada */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Armada API Key
                </label>
                <Input
                  type="password"
                  value={integrations.armada_api_key || ''}
                  onChange={(e) =>
                    setIntegrations({ ...integrations, armada_api_key: e.target.value })
                  }
                  placeholder="Enter your Armada API key"
                />
              </div>

              {/* Wiyak */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Key className="w-4 h-4 inline mr-2" />
                  Wiyak API Key
                </label>
                <Input
                  type="password"
                  value={integrations.wiyak_api_key || ''}
                  onChange={(e) =>
                    setIntegrations({ ...integrations, wiyak_api_key: e.target.value })
                  }
                  placeholder="Enter your Wiyak API key"
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">🔒 Security Note</h3>
            <p className="text-sm text-blue-800">
              API keys are encrypted and stored securely. They are masked with *** in the interface
              for security. Only enter new keys when you want to update them.
            </p>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-[#c31c1c] hover:bg-[#a61818]"
          >
            {saving ? (
              <div className="spinner mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Integration Settings
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;