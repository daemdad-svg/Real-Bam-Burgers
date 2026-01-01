import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, 
  Users, Calendar, Download, Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { reportAPI } from '../../lib/api';
import { toast } from 'sonner';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [salesData, setSalesData] = useState(null);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [salesRes, topItemsRes] = await Promise.all([
        reportAPI.getSales({ start_date: dateRange.start, end_date: dateRange.end }),
        reportAPI.getTopItems({ start_date: dateRange.start, end_date: dateRange.end })
      ]);
      setSalesData(salesRes.data);
      setTopItems(topItemsRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `${(value || 0).toFixed(3)} KWD`;
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(trend)}% vs last period
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-6 admin-theme">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-bebas text-4xl text-[#1e3a5f]">Reports & Analytics</h1>
        
        {/* Date Range */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="w-40"
            />
            <span className="text-slate-400">to</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="w-40"
            />
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Sales"
              value={formatCurrency(salesData?.total_sales)}
              icon={DollarSign}
              color="bg-green-500"
            />
            <StatCard
              title="Total Orders"
              value={salesData?.total_orders || 0}
              icon={ShoppingBag}
              color="bg-blue-500"
            />
            <StatCard
              title="Average Order"
              value={formatCurrency(salesData?.avg_order_value)}
              icon={TrendingUp}
              color="bg-purple-500"
            />
            <StatCard
              title="Active Customers"
              value={Object.keys(salesData?.sales_by_channel || {}).length || '-'}
              icon={Users}
              color="bg-orange-500"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales by Day */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Sales by Day</h3>
              <div className="space-y-3">
                {Object.entries(salesData?.sales_by_day || {}).slice(0, 7).map(([date, data]) => (
                  <div key={date} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-24">{date}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className="h-full bg-[#1e3a5f] rounded-full transition-all"
                        style={{ 
                          width: `${(data.sales / (salesData?.total_sales || 1)) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-24 text-right">
                      {formatCurrency(data.sales)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales by Channel */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Sales by Channel</h3>
              <div className="space-y-3">
                {Object.entries(salesData?.sales_by_channel || {}).map(([channel, data]) => (
                  <div key={channel} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 w-24 capitalize">{channel}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          channel === 'website' ? 'bg-[#c31c1c]' :
                          channel === 'talabat' ? 'bg-orange-500' :
                          channel === 'keeta' ? 'bg-purple-500' :
                          'bg-slate-500'
                        }`}
                        style={{ 
                          width: `${(data.sales / (salesData?.total_sales || 1)) * 100}%` 
                        }}
                      />
                    </div>
                    <div className="text-right w-32">
                      <p className="text-sm font-semibold">{formatCurrency(data.sales)}</p>
                      <p className="text-xs text-slate-500">{data.orders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Items */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-[#1e3a5f] mb-4">Top Selling Items</h3>
            {topItems.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No sales data for this period</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 text-sm font-semibold text-slate-500">Rank</th>
                    <th className="text-left py-3 text-sm font-semibold text-slate-500">Item</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-500">Qty Sold</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-500">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, index) => (
                    <tr key={item.item_id} className="border-b hover:bg-slate-50">
                      <td className="py-3">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-[#d4af37] text-white' :
                          index === 1 ? 'bg-slate-300 text-slate-700' :
                          index === 2 ? 'bg-amber-600 text-white' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-[#1e3a5f]">{item.item_name}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right font-semibold text-[#c31c1c]">
                        {formatCurrency(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
