import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

const SKU_PATTERN = /^SK-[A-Z0-9]{3}$/;

const AddEditProductModal = ({ product, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(product?.image || null);
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    skuNumber: product?.skuNumber || "",
    costPrice: product?.costPrice ?? 0,
    sellingPrice: product?.sellingPrice ?? product?.price ?? 0,
    stock: product?.stock || 0,
    supplier: product?.supplier ? String(product.supplier) : "",
    newSupplierName: "",
    supplierEmail: product?.supplierEmail || "",
    supplierPhone: product?.supplierPhone || "",
    supplierCompany: product?.supplierCompany || "",
    supplierAddress: product?.supplierAddress || "",
    supplierLeadTimeDays: product?.supplierLeadTimeDays ?? "",
    supplierMinimumOrderQuantity: product?.supplierMinimumOrderQuantity ?? "",
    reorderLevel: product?.reorderLevel || 10,
    tags: product?.tags?.join(", ") || "",
    status: product?.status || "Active",
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("categories/");
        const activeCategories = Array.isArray(res.data)
          ? res.data.filter((cat) => cat.status === "Active")
          : [];
        setCategories(activeCategories);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const res = await api.get("suppliers/");
        const activeSuppliers = Array.isArray(res.data)
          ? res.data.filter((supplier) => supplier.is_active)
          : [];
        setSuppliers(activeSuppliers);
      } catch (error) {
        console.error("Failed to load suppliers:", error);
      }
    };

    fetchCategories();
    fetchSuppliers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "skuNumber" ? value.toUpperCase().replace(/\s+/g, "") : value;

    setFormData({
      ...formData,
      [name]: nextValue,
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) {
      setFormError("");
    }
  };

  const handleSupplierChange = (e) => {
    const { value } = e.target;
    const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === value);

    setFormData((prev) => ({
      ...prev,
      supplier: value,
      newSupplierName: "",
      supplierEmail: selectedSupplier?.email || "",
      supplierPhone: selectedSupplier?.phone || "",
      supplierCompany: selectedSupplier?.company || "",
      supplierAddress: selectedSupplier?.address || "",
      supplierLeadTimeDays: selectedSupplier?.lead_time_days ?? "",
      supplierMinimumOrderQuantity: selectedSupplier?.minimum_order_quantity ?? "",
    }));

    if (fieldErrors.supplier) {
      setFieldErrors((prev) => ({ ...prev, supplier: "" }));
    }
    if (formError) {
      setFormError("");
    }
  };

  const handleNewSupplierNameChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => {
      const switchingFromExisting = Boolean(prev.supplier);
      return {
        ...prev,
        newSupplierName: value,
        supplier: "",
        ...(switchingFromExisting
          ? {
              supplierEmail: "",
              supplierPhone: "",
              supplierCompany: "",
              supplierAddress: "",
              supplierLeadTimeDays: "",
              supplierMinimumOrderQuantity: "",
            }
          : null),
      };
    });

    if (fieldErrors.newSupplierName) {
      setFieldErrors((prev) => ({ ...prev, newSupplierName: "" }));
    }
    if (formError) {
      setFormError("");
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!String(formData.name || "").trim()) {
      errors.name = "Product Name is required.";
    }

    if (!String(formData.category || "").trim()) {
      errors.category = "Category is required.";
    }

    const normalizedSku = String(formData.skuNumber || "").trim().toUpperCase();
    if (!normalizedSku) {
      errors.skuNumber = "SKU Number is required.";
    } else if (!SKU_PATTERN.test(normalizedSku)) {
      errors.skuNumber = 'SKU must be in "SK-XXX" format.';
    }

    const rawCostPrice = String(formData.costPrice ?? "").trim();
    if (!rawCostPrice) {
      errors.costPrice = "Cost price is required.";
    } else if (Number.isNaN(Number(rawCostPrice)) || Number(rawCostPrice) < 0) {
      errors.costPrice = "Cost price must be a valid number.";
    }

    const rawSellingPrice = String(formData.sellingPrice ?? "").trim();
    if (!rawSellingPrice) {
      errors.sellingPrice = "Selling price is required.";
    } else if (Number.isNaN(Number(rawSellingPrice)) || Number(rawSellingPrice) < 0) {
      errors.sellingPrice = "Selling price must be a valid number.";
    } else if (!errors.costPrice && Number(rawSellingPrice) < Number(rawCostPrice)) {
      errors.sellingPrice = "Selling price cannot be lower than cost price.";
    }

    const rawStock = String(formData.stock ?? "").trim();
    if (!rawStock) {
      errors.stock = "Stock Quantity is required.";
    } else if (!/^\d+$/.test(rawStock)) {
      errors.stock = "Stock Quantity must be a non-negative whole number.";
    }

    const rawLeadTime = String(formData.supplierLeadTimeDays ?? "").trim();
    if (rawLeadTime && !/^\d+$/.test(rawLeadTime)) {
      errors.supplierLeadTimeDays = "Lead time must be a non-negative whole number.";
    }

    const rawMinOrder = String(formData.supplierMinimumOrderQuantity ?? "").trim();
    if (rawMinOrder && !/^\d+$/.test(rawMinOrder)) {
      errors.supplierMinimumOrderQuantity = "Minimum order must be a non-negative whole number.";
    }

    const hasNewSupplier = String(formData.newSupplierName || "").trim();
    const hasSupplierDetails =
      String(formData.supplierEmail || "").trim() ||
      String(formData.supplierPhone || "").trim() ||
      String(formData.supplierCompany || "").trim() ||
      String(formData.supplierAddress || "").trim() ||
      rawLeadTime ||
      rawMinOrder;

    if (hasSupplierDetails && !String(formData.supplier || "").trim() && !hasNewSupplier) {
      errors.supplier = "Select a supplier or enter a new supplier to save details.";
    }

    if (hasNewSupplier && String(formData.supplier || "").trim()) {
      errors.supplier = "Choose either a supplier or add a new one, not both.";
    }

    return errors;
  };

  const mapApiErrorsToForm = (error) => {
    const data = error?.response?.data;
    const nextFieldErrors = {};

    if (data && typeof data === "object") {
      const toMessage = (value) =>
        Array.isArray(value) ? String(value[0] || "") : String(value || "");

      if (data.name) nextFieldErrors.name = toMessage(data.name);
      if (data.category) nextFieldErrors.category = toMessage(data.category);
      if (data.sku_number) nextFieldErrors.skuNumber = toMessage(data.sku_number);
      if (data.price) nextFieldErrors.sellingPrice = toMessage(data.price);
      if (data.cost_price) nextFieldErrors.costPrice = toMessage(data.cost_price);
      if (data.selling_price) nextFieldErrors.sellingPrice = toMessage(data.selling_price);
      if (data.stock) nextFieldErrors.stock = toMessage(data.stock);
      if (data.supplier) nextFieldErrors.supplier = toMessage(data.supplier);
      if (data.supplierEmail) nextFieldErrors.supplierEmail = toMessage(data.supplierEmail);
      if (data.supplierPhone) nextFieldErrors.supplierPhone = toMessage(data.supplierPhone);
      if (data.supplierCompany) nextFieldErrors.supplierCompany = toMessage(data.supplierCompany);
      if (data.supplierAddress) nextFieldErrors.supplierAddress = toMessage(data.supplierAddress);
      if (data.supplierLeadTimeDays) {
        nextFieldErrors.supplierLeadTimeDays = toMessage(data.supplierLeadTimeDays);
      }
      if (data.supplierMinimumOrderQuantity) {
        nextFieldErrors.supplierMinimumOrderQuantity = toMessage(data.supplierMinimumOrderQuantity);
      }
    }

    return nextFieldErrors;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }

    setFieldErrors({});
    setFormError("");
    setIsLoading(true);

    try {
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const productData = {
        ...formData,
        name: String(formData.name || "").trim(),
        newSupplierName: String(formData.newSupplierName || "").trim(),
        category: Number(formData.category),
        skuNumber: String(formData.skuNumber || "").trim().toUpperCase(),
        price: parseFloat(formData.sellingPrice),
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stock: parseInt(formData.stock),
        supplierLeadTimeDays:
          formData.supplierLeadTimeDays === "" ? "" : parseInt(formData.supplierLeadTimeDays),
        supplierMinimumOrderQuantity:
          formData.supplierMinimumOrderQuantity === ""
            ? ""
            : parseInt(formData.supplierMinimumOrderQuantity),
        reorderLevel: parseInt(formData.reorderLevel),
        tags: tagsArray,
        imageFile,
        removeImage,
      };

      await onSave(productData);
    } catch (error) {
      const apiFieldErrors = mapApiErrorsToForm(error);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
        setFormError("Please fix the highlighted fields and try again.");
      } else {
        setFormError("Failed to save product. Please try again.");
      }
      console.error("Error saving product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 shadow-2xl">
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {product ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {formError}
              </div>
            )}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="text-sm font-semibold text-white mb-3 block">Product Image</label>
              <div className="flex items-start gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all overflow-hidden"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <svg className="w-12 h-12 text-white/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-white/50 text-sm">Click to upload</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex-1 space-y-2">
                  <p className="text-white/70 text-sm">Upload a product image</p>
                  <p className="text-white/50 text-xs">
                    Recommended: Square image, at least 500x500px
                    <br />
                    Supported formats: JPG, PNG, WebP
                  </p>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 mt-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove Image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.name
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                    placeholder="Enter product name"
                  />
                  {fieldErrors.name && <p className="text-xs text-red-300">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all cursor-pointer ${
                      fieldErrors.category
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                  >
                    <option value="" className="bg-slate-800">
                      Select category
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-800">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p className="text-xs text-red-300">{fieldErrors.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">SKU Number *</label>
                  <input
                    type="text"
                    name="skuNumber"
                    value={formData.skuNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.skuNumber
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                    placeholder="SK-XXX"
                  />
                  {fieldErrors.skuNumber && (
                    <p className="text-xs text-red-300">{fieldErrors.skuNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                  >
                    <option value="Active" className="bg-slate-800">Active</option>
                    <option value="Inactive" className="bg-slate-800">Inactive</option>
                    <option value="Discontinued" className="bg-slate-800">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter product description"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g., Electronics, Featured, New"
                />
                <p className="text-white/50 text-xs">Separate tags with commas</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Pricing & Stock</h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Cost Price (Rs.) *</label>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.costPrice
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                    placeholder="0.00"
                  />
                  {fieldErrors.costPrice && (
                    <p className="text-xs text-red-300">{fieldErrors.costPrice}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.sellingPrice
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                    placeholder="0.00"
                  />
                  {fieldErrors.sellingPrice && (
                    <p className="text-xs text-red-300">{fieldErrors.sellingPrice}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Stock Quantity *</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    min="0"
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.stock
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                    placeholder="0"
                  />
                  {fieldErrors.stock && <p className="text-xs text-red-300">{fieldErrors.stock}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Reorder Level</label>
                  <input
                    type="number"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Supplier Information</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Select Supplier</label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleSupplierChange}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.supplier
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                  >
                    <option value="" className="bg-slate-800">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id} className="bg-slate-800">
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Or Add New Supplier</label>
                  <input
                    type="text"
                    name="newSupplierName"
                    value={formData.newSupplierName}
                    onChange={handleNewSupplierNameChange}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      fieldErrors.newSupplierName
                        ? "border-red-400/80 focus:ring-red-400"
                        : "border-white/10 focus:ring-purple-500"
                    }`}
                    placeholder="Enter supplier name"
                  />
                  {fieldErrors.supplier && (
                    <p className="text-xs text-red-300">{fieldErrors.supplier}</p>
                  )}
                </div>
              </div>

              {(formData.supplier || formData.newSupplierName) && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Contact Email</label>
                    <input
                      type="email"
                      name="supplierEmail"
                      value={formData.supplierEmail}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        fieldErrors.supplierEmail
                          ? "border-red-400/80 focus:ring-red-400"
                          : "border-white/10 focus:ring-purple-500"
                      }`}
                      placeholder="supplier@example.com"
                    />
                    {fieldErrors.supplierEmail && (
                      <p className="text-xs text-red-300">{fieldErrors.supplierEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Contact Phone</label>
                    <input
                      type="text"
                      name="supplierPhone"
                      value={formData.supplierPhone}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        fieldErrors.supplierPhone
                          ? "border-red-400/80 focus:ring-red-400"
                          : "border-white/10 focus:ring-purple-500"
                      }`}
                      placeholder="98XXXXXXXX"
                    />
                    {fieldErrors.supplierPhone && (
                      <p className="text-xs text-red-300">{fieldErrors.supplierPhone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Company</label>
                    <input
                      type="text"
                      name="supplierCompany"
                      value={formData.supplierCompany}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        fieldErrors.supplierCompany
                          ? "border-red-400/80 focus:ring-red-400"
                          : "border-white/10 focus:ring-purple-500"
                      }`}
                      placeholder="Company name"
                    />
                    {fieldErrors.supplierCompany && (
                      <p className="text-xs text-red-300">{fieldErrors.supplierCompany}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Address</label>
                    <input
                      type="text"
                      name="supplierAddress"
                      value={formData.supplierAddress}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        fieldErrors.supplierAddress
                          ? "border-red-400/80 focus:ring-red-400"
                          : "border-white/10 focus:ring-purple-500"
                      }`}
                      placeholder="Supplier address"
                    />
                    {fieldErrors.supplierAddress && (
                      <p className="text-xs text-red-300">{fieldErrors.supplierAddress}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Lead Time (days)</label>
                    <input
                      type="number"
                      name="supplierLeadTimeDays"
                      value={formData.supplierLeadTimeDays}
                      onChange={handleChange}
                      min="0"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        fieldErrors.supplierLeadTimeDays
                          ? "border-red-400/80 focus:ring-red-400"
                          : "border-white/10 focus:ring-purple-500"
                      }`}
                      placeholder="0"
                    />
                    {fieldErrors.supplierLeadTimeDays && (
                      <p className="text-xs text-red-300">{fieldErrors.supplierLeadTimeDays}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Minimum Order Quantity</label>
                    <input
                      type="number"
                      name="supplierMinimumOrderQuantity"
                      value={formData.supplierMinimumOrderQuantity}
                      onChange={handleChange}
                      min="0"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        fieldErrors.supplierMinimumOrderQuantity
                          ? "border-red-400/80 focus:ring-red-400"
                          : "border-white/10 focus:ring-purple-500"
                      }`}
                      placeholder="0"
                    />
                    {fieldErrors.supplierMinimumOrderQuantity && (
                      <p className="text-xs text-red-300">{fieldErrors.supplierMinimumOrderQuantity}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border-t border-white/20 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
            >
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="group relative px-6 py-3">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 group-active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {product ? "Update Product" : "Add Product"}
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditProductModal;
