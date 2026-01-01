import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { toast } from 'sonner';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(credentials.username, credentials.password);
      toast.success('Welcome to RIWA POS');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4 admin-theme">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1e3a5f] rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="font-bebas text-2xl text-white">RP</span>
            </div>
            <h1 className="font-bebas text-3xl text-[#1e3a5f]">RIWA POS</h1>
            <p className="text-[#d4af37] font-semibold">Bam Burgers</p>
            <p className="text-slate-500 mt-2 text-sm">Admin Panel</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                data-testid="admin-username-input"
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="pl-12 py-6 rounded-xl bg-[#f5f7fa] border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                data-testid="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                className="pl-12 pr-12 py-6 rounded-xl bg-[#f5f7fa] border-slate-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              data-testid="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] rounded-xl py-6 font-semibold"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            © 2025 RIWA POS - Restaurant Management System
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
