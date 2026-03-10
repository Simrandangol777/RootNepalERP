import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import api from "../api/axios";
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Legend, Cell} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("This Month");
  
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filterMap = {
    "Today": "today",
    "This Week": "this_week",
    "Last 7 days": "last_7_days",
    "This Month": "this_month",
    "Last 30 days": "last_30_days",
    "Last 6 months": "last_6_months",
    "All Time": "all_time",
  };

  const fetchDashboard = async (selectedFilter) => {
    setIsLoading(true);
    setError("");
    try {
      const dateRange = filterMap[selectedFilter] || "all_time";
      const res = await api.get("dashboard/overview/", {
        params: { date_range: dateRange },
      });
      setData(res.data);
    } catch (err) {
      console.error("Dashboard error", err);
      setError("Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(filter);
  }, [filter]);

  /* ---------------- KPI DATA ---------------- */
  const kpis = {
    revenue: Number(data?.kpis?.revenue ?? 0),
    purchases: Number(data?.kpis?.purchases ?? 0),
    profit: Number(data?.kpis?.profit ?? 0),
    inventoryValue: Number(data?.kpis?.inventory_value ?? 0),
    lowStock: Number(data?.kpis?.low_stock ?? 0),
    outOfStock: Number(data?.kpis?.out_of_stock ?? 0)
  };

  const buildFlatTrend = (value) => Array(6).fill(Number(value || 0));

  const kpiTrends = {
    revenue: buildFlatTrend(kpis.revenue),
    purchases: buildFlatTrend(kpis.purchases),
    profit: buildFlatTrend(kpis.profit),
    inventoryValue: buildFlatTrend(kpis.inventoryValue),
    lowStock: buildFlatTrend(kpis.lowStock),
    outOfStock: buildFlatTrend(kpis.outOfStock)
  };

  const renderSparkline = (series, color) => (
    <div className="h-10 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series.map((value, index) => ({ index, value }))}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  /* ---------------- CHART DATA ---------------- */
  const salesTrendData = Array.isArray(data?.sales_trend) ? data.sales_trend : [];

  const inventoryTrend = Array.isArray(data?.inventory_trend) ? data.inventory_trend : [];

  const paymentData = Array.isArray(data?.payment_distribution) ? data.payment_distribution : [];

  const stockStatus = Array.isArray(data?.stock_status) ? data.stock_status : [];

  const topProducts = Array.isArray(data?.top_products) ? data.top_products : [];

  const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

  /* ---------------- ACTIVITY ---------------- */
  const activities = Array.isArray(data?.activities) ? data.activities : [];

  const restockAlerts = Array.isArray(data?.restock_alerts) ? data.restock_alerts : [];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-white/70">Real-time business overview and analytics</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="Today" className="bg-slate-800">Today</option>
              <option value="This Week" className="bg-slate-800">This Week</option>
              <option value="Last 7 days" className="bg-slate-800">Last 7 days</option>
              <option value="This Month" className="bg-slate-800">This Month</option>
              <option value="Last 30 days" className="bg-slate-800">Last 30 days</option>
              <option value="Last 6 months" className="bg-slate-800">Last 6 months</option>
              <option value="All Time" className="bg-slate-800">All Time</option>
            </select>

            <button
              onClick={() => fetchDashboard(filter)}
              className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
            Loading dashboard data...
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-1">Revenue</p>
            <h2 className="text-white text-xl font-bold">Rs. {(kpis.revenue / 1000).toFixed(0)}K</h2>
            {renderSparkline(kpiTrends.revenue, "#22c55e")}
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-1">Purchases</p>
            <h2 className="text-white text-xl font-bold">Rs. {(kpis.purchases / 1000).toFixed(0)}K</h2>
            {renderSparkline(kpiTrends.purchases, "#ef4444")}
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-1">Profit</p>
            <h2 className="text-green-400 text-xl font-bold">Rs. {(kpis.profit / 1000).toFixed(0)}K</h2>
            {renderSparkline(kpiTrends.profit, "#3b82f6")}
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-1">Inventory Value</p>
            <h2 className="text-white text-xl font-bold">Rs. {(kpis.inventoryValue / 1000).toFixed(0)}K</h2>
            {renderSparkline(kpiTrends.inventoryValue, "#6366f1")}
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-1">Low Stock</p>
            <h2 className="text-orange-400 text-xl font-bold">{kpis.lowStock}</h2>
            {renderSparkline(kpiTrends.lowStock, "#f59e0b")}
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-1">Out of Stock</p>
            <h2 className="text-red-400 text-xl font-bold">{kpis.outOfStock}</h2>
            {renderSparkline(kpiTrends.outOfStock, "#ef4444")}
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sales vs Purchases */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Sales vs Purchases</h2>
            {salesTrendData.length === 0 ? (
              <div className="text-white/60 text-sm">No sales trend data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="#ffffff60" />
                  <YAxis stroke="#ffffff60" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={3} />
                  <Line type="monotone" dataKey="purchases" stroke="#ef4444" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Inventory Value Trend */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Inventory Value Trend</h2>
            {inventoryTrend.length === 0 ? (
              <div className="text-white/60 text-sm">No inventory value trend yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={inventoryTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="#ffffff60" />
                  <YAxis stroke="#ffffff60" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Top Selling Products</h2>
            {topProducts.length === 0 ? (
              <div className="text-white/60 text-sm">No top products yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts}>
                  <XAxis dataKey="name" stroke="#ffffff60" />
                  <YAxis stroke="#ffffff60" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="sales" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Payment Methods</h2>
            {paymentData.length === 0 ? (
              <div className="text-white/60 text-sm">No payment distribution data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stock Status */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Stock Status</h2>
            {stockStatus.length === 0 ? (
              <div className="text-white/60 text-sm">No stock status data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stockStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {stockStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ color: '#fff' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Operational Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Restock Alerts */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-white font-semibold">Smart Restock Alerts</h2>
            </div>

            <div className="space-y-3">
              {restockAlerts.length === 0 ? (
                <div className="text-white/60 text-sm">No restock alerts yet.</div>
              ) : (
                restockAlerts.map((item, i) => (
                  <div key={i} className="border-b border-white/10 pb-3 last:border-0">
                    <p className="text-white font-semibold text-sm">{item.product}</p>
                    <div className="mt-1 space-y-1 text-xs">
                      <p className="text-white/60">Stock: <span className="text-yellow-400 font-semibold">{item.stock}</span></p>
                      <p className="text-white/60">Reorder Level: {item.reorder}</p>
                      <p className="text-green-400 font-semibold">Suggested: +{item.suggested}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <div className="text-white/60 text-sm">No recent activity yet.</div>
              ) : (
                activities.map((activity, i) => (
                  <p key={i} className="text-white/70 text-sm py-1 flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>{activity}</span>
                  </p>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate('/products', { state: { openAddProduct: true, scrollToTop: true } })}
                className="bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Add Product
              </button>

              <button 
                onClick={() => navigate('/sales', { state: { scrollToTop: true } })}
                className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Record Sale
              </button>

              <button 
                onClick={() => navigate('/purchase', { state: { scrollToTop: true } })}
                className="bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Record Purchase
              </button>

              <button 
                onClick={() => navigate('/inventory', { state: { openAdjustStock: true, scrollToTop: true } })}
                className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Adjust Stock
              </button>

              <button 
                onClick={() => navigate('/categories', { state: { openAddCategory: true, scrollToTop: true } })}
                className="bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
