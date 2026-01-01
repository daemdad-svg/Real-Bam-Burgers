import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loyaltyAPI } from '@/lib/api';
import { toast } from 'sonner';

const LoyaltySettingsPage = () => {
  const [settings, setSettings] = useState({
    points_per_kwd: 10,
    kwd_per_point: 0.01,
    min_points_redemption: 100
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await loyaltyAPI.getSettings();
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await loyaltyAPI.updateSettings(settings);
      toast.success('Loyalty settings saved');
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
        <h1 className="font-bebas text-4xl text-[#1e3a5f]">Loyalty Program</h1>
        <p className="text-slate-500">Configure your customer loyalty program</p>
      </div>

      <div className="max-w-2xl">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-xl p-6 text-white mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-8 h-8 text-[#d4af37]" />
            <h2 className="font-bebas text-2xl">BAM Rewards</h2>
          </div>
          <p className="text-white/80">
            Customers earn points with every purchase. Points can be redeemed for discounts on future orders.
          </p>
        </motion.div>

        {/* Settings Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="font-semibold text-[#1e3a5f] mb-6">Program Settings</h3>

          <div className="space-y-6">
            {/* Points Per KWD */}
            <div>
              <label className="block text-sm font-medium mb-2">Points Earned per KWD Spent</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={settings.points_per_kwd}
                  onChange={(e) => setSettings({...settings, points_per_kwd: parseInt(e.target.value) || 0})}
                  className="w-32"
                />
                <span className="text-slate-500">points per 1 KWD</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Example: Customer spends 5 KWD → earns {5 * settings.points_per_kwd} points
              </p>
            </div>

            {/* KWD Per Point */}
            <div>
              <label className="block text-sm font-medium mb-2">Redemption Value (KWD per Point)</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  step="0.001"
                  value={settings.kwd_per_point}
                  onChange={(e) => setSettings({...settings, kwd_per_point: parseFloat(e.target.value) || 0})}
                  className="w-32"
                />
                <span className="text-slate-500">KWD per point</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Example: 100 points = {(100 * settings.kwd_per_point).toFixed(3)} KWD discount
              </p>
            </div>

            {/* Min Redemption */}
            <div>
              <label className="block text-sm font-medium mb-2">Minimum Points for Redemption</label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={settings.min_points_redemption}
                  onChange={(e) => setSettings({...settings, min_points_redemption: parseInt(e.target.value) || 0})}
                  className="w-32"
                />
                <span className="text-slate-500">points minimum</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Customers must have at least this many points to redeem
              </p>
            </div>
          </div>

          {/* Calculation Preview */}
          <div className="mt-8 p-4 bg-[#f5f7fa] rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-[#1e3a5f]" />
              <span className="font-medium text-[#1e3a5f]">Calculation Preview</span>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p>• Customer spends <strong>10 KWD</strong> → earns <strong>{10 * settings.points_per_kwd} points</strong></p>
              <p>• Customer redeems <strong>{settings.min_points_redemption} points</strong> → gets <strong>{(settings.min_points_redemption * settings.kwd_per_point).toFixed(3)} KWD</strong> off</p>
              <p>• Break-even spend: <strong>{((settings.min_points_redemption / settings.points_per_kwd)).toFixed(2)} KWD</strong> to reach minimum redemption</p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 bg-[#1e3a5f] hover:bg-[#162d4a]"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default LoyaltySettingsPage;
