import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';

const EMPTY_REPORT_DATA = {
  summaryData: {
    totalRevenue: 0,
    totalPurchaseCost: 0,
    grossProfit: 0,
    totalProducts: 0,
    healthyStockItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    inventoryValue: 0,
    restockSuggestions: 0,
    totalPurchaseOrders: 0,
    averagePurchaseOrderValue: 0,
    dateRange: 'all_time',
  },
  topSellingProducts: [],
  topCategories: [],
  topSuppliers: [],
  lowStockItems: [],
  outOfStockItems: [],
  restockSuggestions: [],
  categoryStock: [],
  monthlySales: [],
};

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string') return data.message;

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
  if (typeof firstValue === 'string') return firstValue;
  return fallback;
};

const normalizeReportData = (payload) => {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const summary = safePayload.summaryData || {};

  return {
    summaryData: {
      ...EMPTY_REPORT_DATA.summaryData,
      totalRevenue: toNumber(summary.totalRevenue),
      totalPurchaseCost: toNumber(summary.totalPurchaseCost),
      grossProfit: toNumber(summary.grossProfit),
      totalProducts: toNumber(summary.totalProducts),
      healthyStockItems: toNumber(summary.healthyStockItems),
      lowStockItems: toNumber(summary.lowStockItems),
      outOfStockItems: toNumber(summary.outOfStockItems),
      inventoryValue: toNumber(summary.inventoryValue),
      restockSuggestions: toNumber(summary.restockSuggestions),
      totalPurchaseOrders: toNumber(summary.totalPurchaseOrders),
      averagePurchaseOrderValue: toNumber(summary.averagePurchaseOrderValue),
      dateRange: typeof summary.dateRange === 'string' ? summary.dateRange : 'all_time',
    },
    topSellingProducts: Array.isArray(safePayload.topSellingProducts)
      ? safePayload.topSellingProducts.map((item) => ({
          name: item?.name || 'Unnamed product',
          unitsSold: toNumber(item?.unitsSold),
          revenue: toNumber(item?.revenue),
        }))
      : [],
    topCategories: Array.isArray(safePayload.topCategories)
      ? safePayload.topCategories.map((item) => ({
          name: item?.name || 'Uncategorized',
          revenue: toNumber(item?.revenue),
          percentage: toNumber(item?.percentage),
        }))
      : [],
    topSuppliers: Array.isArray(safePayload.topSuppliers)
      ? safePayload.topSuppliers.map((item) => ({
          name: item?.name || 'Unknown supplier',
          purchaseAmount: toNumber(item?.purchaseAmount),
          orders: toNumber(item?.orders),
        }))
      : [],
    lowStockItems: Array.isArray(safePayload.lowStockItems) ? safePayload.lowStockItems : [],
    outOfStockItems: Array.isArray(safePayload.outOfStockItems) ? safePayload.outOfStockItems : [],
    restockSuggestions: Array.isArray(safePayload.restockSuggestions) ? safePayload.restockSuggestions : [],
    categoryStock: Array.isArray(safePayload.categoryStock) ? safePayload.categoryStock : [],
    monthlySales: Array.isArray(safePayload.monthlySales)
      ? safePayload.monthlySales.map((item) => ({
          month: item?.month || 'Unknown',
          sales: toNumber(item?.sales),
        }))
      : [],
  };
};

const Reports = () => {
  const [dateFilter, setDateFilter] = useState('all_time');
  const [reportType, setReportType] = useState('all');
  const [reportData, setReportData] = useState(EMPTY_REPORT_DATA);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  const {
    summaryData,
    topSellingProducts,
    topCategories,
    topSuppliers,
    lowStockItems,
    outOfStockItems,
    restockSuggestions,
    categoryStock,
    monthlySales,
  } = reportData;

  const monthlySalesMax = useMemo(() => {
    const maxValue = monthlySales.reduce((max, item) => Math.max(max, toNumber(item.sales)), 0);
    return maxValue > 0 ? maxValue : 1;
  }, [monthlySales]);

  const healthyStockCount = useMemo(() => {
    if (summaryData.healthyStockItems > 0) return summaryData.healthyStockItems;
    return Math.max(
      summaryData.totalProducts - summaryData.lowStockItems - summaryData.outOfStockItems,
      0
    );
  }, [summaryData]);

  const grossMarginPercentage = useMemo(() => {
    if (!summaryData.totalRevenue) return 0;
    return (summaryData.grossProfit / summaryData.totalRevenue) * 100;
  }, [summaryData.grossProfit, summaryData.totalRevenue]);

  const fetchReports = async (range = dateFilter) => {
    setIsFetching(true);
    try {
      const res = await api.get('reports/dashboard/', { params: { date_range: range } });
      setReportData(normalizeReportData(res.data));
      setMessage((prev) => (prev.type === 'error' ? { type: '', text: '' } : prev));
    } catch (error) {
      setReportData(EMPTY_REPORT_DATA);
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to load reports from server.'),
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchReports(dateFilter);
  }, [dateFilter]);

  const handleExportReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      dateRange: dateFilter,
      ...reportData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports-${dateFilter}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage({ type: 'success', text: 'Report exported successfully.' });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500/20 text-red-400';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Low':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h2>
          <p className="text-white/70">Comprehensive insights into sales, purchases, and inventory</p>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  <option value="all_time" className="bg-slate-800">All Time</option>
                  <option value="this_month" className="bg-slate-800">This Month</option>
                  <option value="this_week" className="bg-slate-800">This Week</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/60">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  <option value="all" className="bg-slate-800">All Reports</option>
                  <option value="sales" className="bg-slate-800">Sales</option>
                  <option value="purchases" className="bg-slate-800">Purchases</option>
                  <option value="inventory" className="bg-slate-800">Inventory</option>
                  <option value="restock" className="bg-slate-800">Smart Restock</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleExportReport}
              className="group relative px-6 py-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Report
              </div>
            </button>
          </div>
          <p className="mt-4 text-white/60 text-sm">
            {isFetching ? 'Loading reports...' : `Loaded live data for ${dateFilter.replace(/_/g, ' ')}`}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Revenue */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Total Revenue</h3>
            <p className="text-white text-2xl font-bold">Rs. {summaryData.totalRevenue.toLocaleString()}</p>
            <p className="text-green-400 text-sm mt-2">Based on selected date range</p>
          </div>

          {/* Total Purchase Cost */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Total Purchase Cost</h3>
            <p className="text-white text-2xl font-bold">Rs. {summaryData.totalPurchaseCost.toLocaleString()}</p>
            <p className="text-red-400 text-sm mt-2">Based on selected date range</p>
          </div>

          {/* Gross Profit */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Gross Profit</h3>
            <p className="text-white text-2xl font-bold">Rs. {summaryData.grossProfit.toLocaleString()}</p>
            <p className="text-blue-400 text-sm mt-2">{grossMarginPercentage.toFixed(1)}% margin</p>
          </div>

          {/* Total Products */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Total Products</h3>
            <p className="text-white text-2xl font-bold">{summaryData.totalProducts}</p>
            <p className="text-white/50 text-sm mt-2">Active in inventory</p>
          </div>

          {/* Low Stock Items */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Low Stock Items</h3>
            <p className="text-white text-2xl font-bold">{summaryData.lowStockItems}</p>
            <p className="text-yellow-400 text-sm mt-2">Needs attention</p>
          </div>

          {/* Out of Stock */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Out of Stock</h3>
            <p className="text-white text-2xl font-bold">{summaryData.outOfStockItems}</p>
            <p className="text-red-400 text-sm mt-2">Urgent action required</p>
          </div>

          {/* Inventory Value */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Inventory Value</h3>
            <p className="text-white text-2xl font-bold">Rs. {summaryData.inventoryValue.toLocaleString()}</p>
            <p className="text-white/50 text-sm mt-2">Current worth</p>
          </div>

          {/* Restock Suggestions */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <h3 className="text-white/60 text-sm mb-1">Restock Suggestions</h3>
            <p className="text-white text-2xl font-bold">{summaryData.restockSuggestions}</p>
            <p className="text-cyan-400 text-sm mt-2">AI predictions</p>
          </div>
        </div>

        {/* Sales Analytics */}
        {(reportType === 'all' || reportType === 'sales') && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-bold text-white mb-6">Sales Analytics</h3>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Monthly Sales Performance */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4">Monthly Sales Performance</h4>
                <div className="space-y-3">
                  {monthlySales.length === 0 ? (
                    <p className="text-white/60 text-sm">No monthly sales data available.</p>
                  ) : (
                    monthlySales.map((item) => (
                      <div key={item.month}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-white/70">{item.month}</span>
                          <span className="text-white font-medium">Rs. {item.sales.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.max((toNumber(item.sales) / monthlySalesMax) * 100, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4">Top Selling Products</h4>
                <div className="space-y-3">
                  {topSellingProducts.length === 0 ? (
                    <p className="text-white/60 text-sm">No top-selling product data available.</p>
                  ) : (
                    topSellingProducts.map((product, index) => (
                      <div key={`${product.name}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-white/50 text-xs">{product.unitsSold} units sold</p>
                          </div>
                        </div>
                        <p className="text-white font-semibold">Rs. {product.revenue.toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Categories by Revenue */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 lg:col-span-2">
                <h4 className="text-white font-semibold mb-4">Top Categories by Revenue</h4>
                <div className="space-y-4">
                  {topCategories.length === 0 ? (
                    <p className="text-white/60 text-sm">No category revenue data available.</p>
                  ) : (
                    topCategories.map((category, index) => (
                      <div key={`${category.name}-${index}`}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-white">{category.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-white/60">{category.percentage}%</span>
                            <span className="text-white font-semibold">Rs. {category.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(Math.max(category.percentage, 0), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Analytics */}
        {(reportType === 'all' || reportType === 'purchases') && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-bold text-white mb-6">Purchase Analytics</h3>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top Suppliers */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4">Top Suppliers by Purchase Amount</h4>
                <div className="space-y-4">
                  {topSuppliers.length === 0 ? (
                    <p className="text-white/60 text-sm">No supplier purchase data available.</p>
                  ) : (
                    topSuppliers.map((supplier, index) => (
                      <div key={`${supplier.name}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{supplier.name}</p>
                            <p className="text-white/50 text-xs">{supplier.orders} orders</p>
                          </div>
                        </div>
                        <p className="text-white font-semibold">Rs. {supplier.purchaseAmount.toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Purchase Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4">Purchase Summary</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white/60 text-sm">Total Purchases</p>
                      <p className="text-white text-xl font-bold">Rs. {summaryData.totalPurchaseCost.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white/60 text-sm">Total Orders</p>
                      <p className="text-white text-xl font-bold">{summaryData.totalPurchaseOrders}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-white/60 text-sm">Average Order Value</p>
                      <p className="text-white text-xl font-bold">Rs. {summaryData.averagePurchaseOrderValue.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Analytics */}
        {(reportType === 'all' || reportType === 'inventory') && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-bold text-white mb-6">Inventory Analytics</h3>
            
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Category-wise Stock */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4">Stock Value by Category</h4>
                <div className="space-y-3">
                  {categoryStock.length === 0 ? (
                    <p className="text-white/60 text-sm">No category stock data available.</p>
                  ) : (
                    categoryStock.map((cat, index) => (
                      <div key={`${cat.category}-${index}`} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{cat.category}</span>
                          <span className="text-white font-bold">Rs. {toNumber(cat.value).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>{toNumber(cat.products)} products</span>
                          <span>{toNumber(cat.totalStock)} units</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inventory Health */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4">Inventory Health</h4>
                <div className="space-y-3">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-green-400 font-semibold">Healthy Stock</p>
                          <p className="text-green-300/60 text-xs">Above reorder level</p>
                        </div>
                      </div>
                      <p className="text-green-400 text-2xl font-bold">{healthyStockCount}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-yellow-400 font-semibold">Low Stock</p>
                          <p className="text-yellow-300/60 text-xs">Below reorder level</p>
                        </div>
                      </div>
                      <p className="text-yellow-400 text-2xl font-bold">{summaryData.lowStockItems}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-red-400 font-semibold">Out of Stock</p>
                          <p className="text-red-300/60 text-xs">Zero inventory</p>
                        </div>
                      </div>
                      <p className="text-red-400 text-2xl font-bold">{summaryData.outOfStockItems}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Alerts Tables */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Low Stock Alerts */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Low Stock Alerts
                </h4>
                <div className="space-y-2">
                  {lowStockItems.length === 0 ? (
                    <p className="text-white/60 text-sm">No low stock alerts.</p>
                  ) : (
                    lowStockItems.map((item, index) => (
                      <div key={`${item.product}-${index}`} className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{item.product}</span>
                          <span className="text-yellow-400 text-xs font-semibold">{item.category}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Stock: <span className="text-yellow-400 font-semibold">{item.currentStock}</span></span>
                          <span className="text-white/60">Reorder: {item.reorderLevel}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Out of Stock Alerts */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Out of Stock Alerts
                </h4>
                <div className="space-y-2">
                  {outOfStockItems.length === 0 ? (
                    <p className="text-white/60 text-sm">No out-of-stock alerts.</p>
                  ) : (
                    outOfStockItems.map((item, index) => (
                      <div key={`${item.product}-${index}`} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{item.product}</span>
                          <span className="text-red-400 text-xs font-semibold">{item.category}</span>
                        </div>
                        <div className="text-xs text-white/60">
                          Last in stock: <span className="text-red-400">{item.lastStock}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Restock Suggestions */}
        {(reportType === 'all' || reportType === 'restock') && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Smart Restock Suggestions</h3>
                <p className="text-white/60 text-sm">AI-powered predictions based on sales trends and stock levels</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Product</th>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Current Stock</th>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Reorder Level</th>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Predicted Demand</th>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Suggested Qty</th>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Lead Time</th>
                    <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {restockSuggestions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-white/60">
                        No restock suggestions currently.
                      </td>
                    </tr>
                  ) : (
                    restockSuggestions.map((item, index) => (
                      <tr key={`${item.product}-${index}`} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-white font-medium">{item.product}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.currentStock < item.reorderLevel 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {item.currentStock} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white/70">{item.reorderLevel}</td>
                        <td className="px-6 py-4 text-white font-semibold">{item.predictedDemand} units</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                            {item.suggestedQty} units
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white/70">{item.leadTime}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="text-cyan-400 font-semibold mb-1">AI-Powered Predictions</p>
                  <p className="text-cyan-300/80">
                    These suggestions are based on historical sales data, current trends, and seasonal patterns. 
                    High priority items should be reordered within 2-3 days to avoid stockouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
