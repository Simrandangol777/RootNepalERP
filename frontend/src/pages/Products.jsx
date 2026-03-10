import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import ProductDetailModal from "../components/ProductDetailModal.jsx";
import AddEditProductModal from "../components/AddEditProductModal";
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
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

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const mapApiProductToUi = (product) => ({
  id: product.id,
  name: product.name || "",
  description: product.description || "",
  category: product.category || "",
  categoryName: product.category_name || "",
  skuNumber: product.sku_number || "",
  price: Number(product.price || 0),
  stock: Number(product.stock || 0),
  image: toMediaUrl(product.image),
  supplier: product.supplier || "",
  reorderLevel: Number(product.reorder_level || 0),
  tags: normalizeTags(product.tags),
  status: product.status || "Active",
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

const buildProductFormData = (productData) => {
  const formData = new FormData();
  formData.append("name", productData.name || "");
  formData.append("description", productData.description || "");
  formData.append("category", productData.category || "");
  formData.append("sku_number", productData.skuNumber || "");
  formData.append("price", String(Number(productData.price || 0)));
  formData.append("stock", String(Number(productData.stock || 0)));
  formData.append("supplier", productData.supplier || "");
  formData.append("reorder_level", String(Number(productData.reorderLevel || 0)));
  formData.append("tags", (productData.tags || []).join(", "));
  formData.append("status", productData.status || "Active");

  if (productData.imageFile) {
    formData.append("image", productData.imageFile);
  } else if (productData.removeImage) {
    formData.append("image", "");
  }

  return formData;
};

const Products = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const itemsPerPage = 10;

  const fetchProducts = async () => {
    setIsFetching(true);
    try {
      const res = await api.get("products/");
      const list = Array.isArray(res.data) ? res.data : [];
      setProducts(list.map(mapApiProductToUi));
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to load products."),
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!location.state || Object.keys(location.state).length === 0) return;

    if (location.state.scrollToTop) {
      window.scrollTo(0, 0);
    }
    if (location.state.openAddProduct) {
      handleAddProduct();
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  const categories = useMemo(() => {
    const dynamic = Array.from(
      new Set(products.map((product) => product.categoryName).filter(Boolean))
    );
    return ["All", ...dynamic];
  }, [products]);

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsAddEditModalOpen(true);
  };

  // Open delete modal
  const handleDeleteProduct = (product) => {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);

    try {
      await api.delete(`products/${deletingProduct.id}/`);
      setProducts((prev) => prev.filter((product) => product.id !== deletingProduct.id));
      setMessage({ type: "success", text: "Product deleted successfully." });
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to delete product."),
      });
    } finally {
      setIsDeleting(false);
    }
  };  
// const handleDeleteProduct = async (productId) => {
//     if (!window.confirm("Are you sure you want to delete this product?")) return;

//     try {
//       await api.delete(`products/${productId}/`);
//       setProducts((prev) => prev.filter((product) => product.id !== productId));
//       setMessage({ type: "success", text: "Product deleted successfully." });
//     } catch (error) {
//       setMessage({
//         type: "error",
//         text: getApiErrorMessage(error, "Failed to delete product."),
//       });
//     }
//   };


  const handleSaveProduct = async (productData) => {
    const payload = buildProductFormData(productData);

    try {
      if (editingProduct) {
        await api.patch(`products/${editingProduct.id}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage({ type: "success", text: "Product updated successfully." });
      } else {
        await api.post("products/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage({ type: "success", text: "Product added successfully." });
      }

      await fetchProducts();
      setIsAddEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      throw error;
    }
  };

  const filteredProducts = products.filter((product) => {
    const keyword = searchTerm.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(keyword) ||
      (product.skuNumber || "").toLowerCase().includes(keyword);
    const matchesCategory =
      selectedCategory === "All" || product.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Products</h2>
          <p className="text-white/70">Manage your product inventory</p>
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
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 w-full lg:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-800">
                    {cat}
                  </option>
                ))}
              </select>

              <button onClick={handleAddProduct} className="group relative px-6 py-3 whitespace-nowrap">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Product
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4 text-white/60 text-sm">
            Showing {paginatedProducts.length} of {filteredProducts.length} products
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Image</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Product Name</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Category</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">SKU</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Price</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm">Stock</th>
                  <th className="text-right px-6 py-4 text-white/70 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isFetching ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-white/60">
                      Loading products...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-white/60">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{product.name}</div>
                        <div className="text-white/50 text-sm line-clamp-1">{product.description}</div>
                      </td>
                      <td className="px-6 py-4 text-white/70">{product.categoryName}</td>
                      <td className="px-6 py-4 text-white/70">{product.skuNumber}</td>
                      <td className="px-6 py-4 text-white font-medium">Rs. {Number(product.price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            product.stock > 10
                              ? "bg-green-500/20 text-green-400"
                              : product.stock > 0
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(product)}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
            <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="text-white/60 text-sm">
                Page {safeCurrentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isDetailModalOpen && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => {
            setIsDetailModalOpen(false);
            handleEditProduct(selectedProduct);
          }}
        />
      )}

      {isAddEditModalOpen && (
        <AddEditProductModal
          product={editingProduct}
          onClose={() => setIsAddEditModalOpen(false)}
          onSave={handleSaveProduct}
        />
      )}

    <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingProduct(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        itemName={deletingProduct?.name || "this product"}
        itemType="product"
        isLoading={isDeleting}
    />
    </DashboardLayout>
  );
};

export default Products;
