import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import AddEditCategoryModal from "../components/AddEditCategoryModal";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
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

const mapApiCategoryToUi = (category) => ({
  id: category.id,
  name: category.name || "",
  description: category.description || "",
  image: toMediaUrl(category.image),
  status: category.status || "Active",
  updatedDate: category.updatedDate || "",
  updatedBy: category.updatedBy || "username",
  productCount: Number(category.product_count || 0),
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

const buildCategoryFormData = (categoryData) => {
  const formData = new FormData();
  formData.append("name", categoryData.name || "");
  formData.append("description", categoryData.description || "");
  formData.append("status", categoryData.status || "Active");

  if (categoryData.imageFile) {
    formData.append("image", categoryData.imageFile);
  } else if (categoryData.removeImage) {
    formData.append("image", "");
  }

  return formData;
};

const Categories = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const itemsPerPage = 10;

  const fetchCategories = async () => {
    setIsFetching(true);
    try {
      const res = await api.get("categories/");
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(list.map(mapApiCategoryToUi));
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to load categories."),
      });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!location.state || Object.keys(location.state).length === 0) return;

    if (location.state.scrollToTop) {
      window.scrollTo(0, 0);
    }
    if (location.state.openAddCategory) {
      handleAddCategory();
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsAddEditModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setIsAddEditModalOpen(true);
  };

  const handleDeleteClick = (category) => {
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;

    setIsDeleting(true);
    try {
      await api.delete(`categories/${deletingCategory.id}/`);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      setMessage({ type: "success", text: "Category deleted successfully." });
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to delete category."),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCategory = async (categoryData) => {
    const payload = buildCategoryFormData(categoryData);

    try {
      if (editingCategory) {
        await api.patch(`categories/${editingCategory.id}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage({ type: "success", text: "Category updated successfully." });
      } else {
        await api.post("categories/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage({ type: "success", text: "Category added successfully." });
      }

      await fetchCategories();
      setIsAddEditModalOpen(false);
      setEditingCategory(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, "Failed to save category."),
      });
      throw error;
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const keyword = searchTerm.toLowerCase();
      const matchesSearch =
        category.name.toLowerCase().includes(keyword) ||
        category.description.toLowerCase().includes(keyword);
      const matchesStatus = showInactive || category.status === "Active";
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchTerm, showInactive]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Categories</h2>
            <p className="text-white/70">Manage your product categories</p>
          </div>
          <button onClick={handleAddCategory} className="group relative px-6 py-3">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </div>
          </button>
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
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all border ${
                showInactive
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show Inactive
            </button>
          </div>

          <div className="mt-4 text-white/60 text-sm">
            Showing {paginatedCategories.length} of {filteredCategories.length} categories
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Image</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Name</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Description</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-white/70 font-semibold text-sm uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isFetching ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-white/60">
                      Loading categories...
                    </td>
                  </tr>
                ) : paginatedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-white/60">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  paginatedCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {category.image ? (
                            <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-semibold text-base mb-1">{category.name}</div>
                        <div className="text-white/50 text-xs">
                          Updated {category.updatedDate} by {category.updatedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/70">{category.description}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            category.status === "Active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {category.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-sm font-medium">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(category)}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-sm font-medium">Delete</span>
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

      {isAddEditModalOpen && (
        <AddEditCategoryModal
          category={editingCategory}
          onClose={() => setIsAddEditModalOpen(false)}
          onSave={handleSaveCategory}
        />
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingCategory(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        itemName={deletingCategory?.name || ""}
        itemType="category"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Categories;
