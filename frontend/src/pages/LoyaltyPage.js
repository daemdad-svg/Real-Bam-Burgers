import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gift, Star, Trophy, ArrowRight, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { loyaltyAPI } from '../lib/api';

const LoyaltyPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [balance, setBalance] = useState({ points: 0, value: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsRes = await loyaltyAPI.getSettings();
        setSettings(settingsRes.data);
        
        if (user) {
          const balanceRes = await loyaltyAPI.getBalance();
          setBalance(balanceRes.data);
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const tiers = [
    { name: 'Bronze', minPoints: 0, benefits: ['Earn 10 points per KWD', 'Birthday reward'], color: '#CD7F32' },
    { name: 'Silver', minPoints: 500, benefits: ['Earn 12 points per KWD', 'Free delivery on orders over 5 KWD', 'Birthday reward'], color: '#C0C0C0' },
    { name: 'Gold', minPoints: 1000, benefits: ['Earn 15 points per KWD', 'Free delivery on all orders', 'Priority support', 'Exclusive offers'], color: '#D4AF37' },
  ];

  const getCurrentTier = () => {
    if (balance.points >= 1000) return tiers[2];
    if (balance.points >= 500) return tiers[1];
    return tiers[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf2f1] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf2f1] pb-24">
      {/* Hero Section */}
      <section className="bg-[#1e3a5f] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 bg-[#d4af37] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-bebas text-5xl sm:text-6xl text-white mb-4">
              BAM Rewards
            </h1>
            <p className="text-white/80 text-lg max-w-xl mx-auto">
              Earn points with every order and unlock exclusive rewards and benefits
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Points Balance Card */}
        {user ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg p-8 -mt-12 relative z-10"
          >
            <div className="text-center">
              <p className="text-slate-500">Your Points Balance</p>
              <h2 className="font-bebas text-6xl text-[#d4af37] mt-2">{balance.points}</h2>
              <p className="text-slate-600 mt-1">Worth {balance.value.toFixed(3)} KWD</p>
              
              <div className="mt-6 pt-6 border-t flex items-center justify-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getCurrentTier().color }}
                >
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#1e3a5f]">{getCurrentTier().name} Member</p>
                  <p className="text-sm text-slate-500">
                    {balance.points < 500 
                      ? `${500 - balance.points} points to Silver`
                      : balance.points < 1000
                      ? `${1000 - balance.points} points to Gold`
                      : 'Top tier achieved!'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg p-8 -mt-12 relative z-10 text-center"
          >
            <Star className="w-16 h-16 mx-auto text-[#d4af37] mb-4" />
            <h2 className="font-bebas text-3xl text-[#1e3a5f] mb-2">Join BAM Rewards</h2>
            <p className="text-slate-500 mb-6">Create an account to start earning points</p>
            <Link to="/register">
              <Button 
                data-testid="join-rewards-btn"
                className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-8"
              >
                Sign Up Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* How It Works */}
        <section className="mt-12">
          <h2 className="font-bebas text-3xl text-[#1e3a5f] mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🍔', title: 'Order', desc: 'Place an order online or in-store' },
              { icon: '⭐', title: 'Earn', desc: `Get ${settings?.points_per_kwd || 10} points for every KWD spent` },
              { icon: '🎁', title: 'Redeem', desc: 'Use points for discounts on future orders' },
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm text-center"
              >
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-bebas text-2xl text-[#1e3a5f] mb-2">{step.title}</h3>
                <p className="text-slate-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Membership Tiers */}
        <section className="mt-12">
          <h2 className="font-bebas text-3xl text-[#1e3a5f] mb-6">Membership Tiers</h2>
          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
                  getCurrentTier()?.name === tier.name ? 'border-[#d4af37]' : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: tier.color }}
                  >
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bebas text-2xl text-[#1e3a5f]">{tier.name}</h3>
                      {tier.minPoints > 0 && (
                        <span className="text-sm text-slate-500">
                          {tier.minPoints}+ points
                        </span>
                      )}
                      {getCurrentTier()?.name === tier.name && (
                        <span className="bg-[#d4af37] text-white text-xs px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <ul className="mt-3 space-y-2">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-600">
                          <Check className="w-4 h-4 text-green-500" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Redemption Info */}
        <section className="mt-12 bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="font-bebas text-3xl text-[#1e3a5f] mb-4">How to Redeem</h2>
          <div className="text-slate-600 space-y-4">
            <p>
              Use your points at checkout to get a discount on your order. 
              Every <strong>100 points = 1.000 KWD</strong> discount.
            </p>
            <p>
              Minimum redemption: <strong>{settings?.min_points_redemption || 100} points</strong>
            </p>
            {settings?.max_points_per_order && (
              <p>
                Maximum points per order: <strong>{settings.max_points_per_order} points</strong>
              </p>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 text-center">
          <Link to="/menu">
            <Button 
              data-testid="start-earning-btn"
              className="bg-[#c31c1c] hover:bg-[#a61818] rounded-full px-8 py-6 font-bebas text-xl"
            >
              Start Earning Points
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default LoyaltyPage;
