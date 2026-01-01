import { useState, useEffect } from 'react';
import { Gift, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loyaltyAPI } from '@/lib/api';
import { toast } from 'sonner';

const LoyaltySettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    points_per_kwd: 10,
    kwd_per_point: 0.01,
    min_points_redemption: 100
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await loyaltyAPI.getSettings();
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to load loyalty settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await loyaltyAPI.updateSettings(settings);
      toast.success('Loyalty settings updated successfully');
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
        <h1 className="font-bebas text-4xl text-[#1e3a5f]">Loyalty Program Settings</h1>
        <p className="text-slate-500">Configure customer loyalty points and rewards</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#c31c1c]/10 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-[#c31c1c]" />
            </div>
            <div>
              <h2 className="font-bebas text-2xl text-[#1e3a5f]">Loyalty Rules</h2>
              <p className="text-sm text-slate-500">Define how customers earn and redeem points</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Points Earning */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Points per KWD Spent
              </label>
              <Input
                type="number"
                min="1"
                value={settings.points_per_kwd}
                onChange={(e) =>
                  setSettings({ ...settings, points_per_kwd: parseInt(e.target.value) })
                }
                placeholder="10"
              />
              <p className="text-xs text-slate-500 mt-1">
                Customers earn {settings.points_per_kwd} points for every 1 KWD spent
              </p>
            </div>

            {/* Points Value */}
            <div>
              <label className="block text-sm font-medium mb-2">
                KWD per Point (Redemption Value)
              </label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={settings.kwd_per_point}
                onChange={(e) =>
                  setSettings({ ...settings, kwd_per_point: parseFloat(e.target.value) })
                }
                placeholder="0.010"
              />
              <p className="text-xs text-slate-500 mt-1">
                Each point is worth {settings.kwd_per_point} KWD when redeemed
              </p>
            </div>

            {/* Minimum Redemption */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Minimum Points for Redemption
              </label>
              <Input
                type="number"
                min="1"
                value={settings.min_points_redemption}
                onChange={(e) =>
                  setSettings({ ...settings, min_points_redemption: parseInt(e.target.value) })
                }
                placeholder="100"
              />
              <p className="text-xs text-slate-500 mt-1">
                Customers need at least {settings.min_points_redemption} points to redeem
                ({(settings.min_points_redemption * settings.kwd_per_point).toFixed(3)} KWD value)
              </p>
            </div>

            {/* Example Calculation */}
            <div className="bg-[#faf2f1] rounded-lg p-4 border border-[#c31c1c]/20">
              <h3 className="font-semibold text-[#1e3a5f] mb-2">Example</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Customer spends 10 KWD → Earns {settings.points_per_kwd * 10} points</li>
                <li>• {settings.min_points_redemption} points = {(settings.min_points_redemption * settings.kwd_per_point).toFixed(3)} KWD discount</li>
                <li>• 1000 points = {(1000 * settings.kwd_per_point).toFixed(3)} KWD discount</li>
              </ul>
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
              Save Settings
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoyaltySettingsPage;