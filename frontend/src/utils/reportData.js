export const EMPTY_REPORT_DATA = {
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
    dateRange: "all_time",
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

export const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.message === "string") return data.message;

  const firstKey = Object.keys(data)[0];
  const firstValue = data[firstKey];
  if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
  if (typeof firstValue === "string") return firstValue;
  return fallback;
};

export const normalizeReportData = (payload) => {
  const safePayload = payload && typeof payload === "object" ? payload : {};
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
      dateRange: typeof summary.dateRange === "string" ? summary.dateRange : "all_time",
    },
    topSellingProducts: Array.isArray(safePayload.topSellingProducts)
      ? safePayload.topSellingProducts.map((item) => ({
          name: item?.name || "Unnamed product",
          unitsSold: toNumber(item?.unitsSold),
          revenue: toNumber(item?.revenue),
        }))
      : [],
    topCategories: Array.isArray(safePayload.topCategories)
      ? safePayload.topCategories.map((item) => ({
          name: item?.name || "Uncategorized",
          revenue: toNumber(item?.revenue),
          percentage: toNumber(item?.percentage),
        }))
      : [],
    topSuppliers: Array.isArray(safePayload.topSuppliers)
      ? safePayload.topSuppliers.map((item) => ({
          name: item?.name || "Unknown supplier",
          purchaseAmount: toNumber(item?.purchaseAmount),
          orders: toNumber(item?.orders),
        }))
      : [],
    lowStockItems: Array.isArray(safePayload.lowStockItems) ? safePayload.lowStockItems : [],
    outOfStockItems: Array.isArray(safePayload.outOfStockItems) ? safePayload.outOfStockItems : [],
    restockSuggestions: Array.isArray(safePayload.restockSuggestions)
      ? safePayload.restockSuggestions
      : [],
    categoryStock: Array.isArray(safePayload.categoryStock) ? safePayload.categoryStock : [],
    monthlySales: Array.isArray(safePayload.monthlySales)
      ? safePayload.monthlySales.map((item) => ({
          month: item?.month || "Unknown",
          sales: toNumber(item?.sales),
        }))
      : [],
  };
};

export const getRestockPriorityMeta = (priority) => {
  switch (priority) {
    case "High":
      return {
        label: "High Priority",
        order: 0,
        badgeClass: "border border-red-500/30 bg-red-500/20 text-red-300",
        softCardClass: "border-red-500/25 bg-red-500/[0.08]",
        iconClass: "bg-red-500/15 text-red-300",
        accentClass: "from-red-500 via-rose-500 to-orange-500",
        textClass: "text-red-300",
        dotClass: "bg-red-400",
        message: "Restock immediately to reduce the risk of missed sales.",
      };
    case "Medium":
      return {
        label: "Medium Priority",
        order: 1,
        badgeClass: "border border-amber-500/30 bg-amber-500/20 text-amber-300",
        softCardClass: "border-amber-500/25 bg-amber-500/[0.08]",
        iconClass: "bg-amber-500/15 text-amber-300",
        accentClass: "from-amber-400 via-orange-400 to-yellow-500",
        textClass: "text-amber-300",
        dotClass: "bg-amber-400",
        message: "Plan the reorder soon so stock stays ahead of demand.",
      };
    case "Low":
      return {
        label: "Low Priority",
        order: 2,
        badgeClass: "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
        softCardClass: "border-emerald-500/25 bg-emerald-500/[0.08]",
        iconClass: "bg-emerald-500/15 text-emerald-300",
        accentClass: "from-emerald-400 via-teal-400 to-cyan-500",
        textClass: "text-emerald-300",
        dotClass: "bg-emerald-400",
        message: "This can be grouped with your next planned supplier order.",
      };
    default:
      return {
        label: "Watch",
        order: 3,
        badgeClass: "border border-slate-400/30 bg-slate-500/20 text-slate-200",
        softCardClass: "border-white/10 bg-white/5",
        iconClass: "bg-white/10 text-white",
        accentClass: "from-slate-400 via-slate-300 to-slate-500",
        textClass: "text-white/70",
        dotClass: "bg-slate-300",
        message: "Keep an eye on this item as new activity comes in.",
      };
  }
};
