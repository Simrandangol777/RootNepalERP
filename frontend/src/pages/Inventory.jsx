import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import StockAdjustmentModal from "../components/StockAdjustmentModal";
import api from "../api/axios";

const buildApiOrigin = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envBaseUrl) return "http://127.0.0.1:8000";
  return envBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
};

const API_ORIGIN = buildApiOrigin();

const toMediaUrl = (imagePath) => {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return imagePath.startsWith("/")
    ? `${API_ORIGIN}${imagePath}`
    : `${API_ORIGIN}/${imagePath}`;
};

const mapApiInventoryToUi = (item) => ({
  id: item.id,
  name: item.name || "",
  description: item.description || "",
  image: toMediaUrl(item.image),
  currentStock: Number(item.currentStock || 0),
  minimumStock: Number(item.minimumStock || 0),
  variance: Number(item.variance || 0),
  status: item.status || "Healthy",
  alert: item.alert || null,
});

const getApiErrorMessage = (error, fallback) => {
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

const Inventory = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [inventory, setInventory] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const itemsPerPage = 10;

  const fetchInventory = async () => {
    setIsFetching(true);
    try {
      const res = await api.get("inventory/");
      const list = Array.isArray(res.data) ? res.data : [];
      setInventory(list.map(mapApiInventoryToUi));
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to load inventory."),
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!location.state || Object.keys(location.state).length === 0) return;

    if (location.state.scrollToTop) {
      window.scrollTo(0, 0);
    }

    if (location.state.openAdjustStock && !isFetching) {
      if (inventory.length > 0) {
        setAdjustingProduct(inventory[0]);
        setIsAdjustModalOpen(true);
      } else {
        setMessage({ type: "error", text: "No inventory items available to adjust." });
      }
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, isFetching, inventory.length]);

  const handleAdjustStock = (product) => {
    setAdjustingProduct(product);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (adjustmentData) => {
    try {
      await api.post("inventory/adjust/", adjustmentData);
      setMessage({ type: "success", text: "Stock adjusted successfully." });
      setIsAdjustModalOpen(false);
      setAdjustingProduct(null);
      await fetchInventory();
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to adjust stock."),
      });
      throw error;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Healthy":
        return "bg-green-500/20 text-green-400";
      case "Low Stock":
        return "bg-yellow-500/20 text-yellow-400";
      case "Out of Stock":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const keyword = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Inventory</h2>
          <p className="text-white/70">Monitor and manage your stock levels</p>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-300"
                : "bg-red-500/10 border border-red-500/20 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 mb-6">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="mt-4 text-white/60 text-sm">
            Showing {paginatedInventory.length} of {filteredInventory.length} items
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Product</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Stock</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-white/70 font-semibold text-sm uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isFetching ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-white/60">
                      Loading inventory...
                    </td>
                  </tr>
                ) : paginatedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-white/60">
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  paginatedInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="text-white font-semibold text-base mb-1">{item.name}</div>
                            <div className="text-white/50 text-sm line-clamp-1">{item.description}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-white font-medium">
                            On hand: <span className="font-bold">{item.currentStock}</span>
                          </div>
                          <div className="text-white/50 text-sm">
                            Minimum: {item.minimumStock}
                          </div>
                          <div className={`text-sm ${item.variance >= 0 ? "text-green-400" : "text-red-400"}`}>
                            Variance: {item.variance >= 0 ? "+" : ""}
                            {item.variance}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(item.status)}`}>
                            {item.status}
                          </span>
                          {item.alert && (
                            <div className="text-red-400 text-xs flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {item.alert}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleAdjustStock(item)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-medium"
                          >
                            Adjust Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-white/10 px-6 py-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    safeCurrentPage === index + 1
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                      : "bg-white/5 hover:bg-white/10 text-white"
                  }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdjustModalOpen && adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setAdjustingProduct(null);
          }}
          onSave={handleSaveAdjustment}
        />
      )}
    </DashboardLayout>
  );
};

export default Inventory;
