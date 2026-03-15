import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import api from '../api/axios';

const createEmptyPurchaseItem = () => ({
  id: Date.now() + Math.random(),
  product: '',
  costPrice: '',
  quantity: 1,
  discount: 0,
});

const parseNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) => `Rs. ${parseNumber(value).toFixed(2)}`;

const parseHistoryDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [month, day, year] = value.split('/').map(Number);
  if (!month || !day || !year) return null;
  return new Date(year, month - 1, day);
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

const Purchase = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [supplier, setSupplier] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCompany, setNewSupplierCompany] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierLeadTimeDays, setNewSupplierLeadTimeDays] = useState('');
  const [newSupplierMinimumOrderQuantity, setNewSupplierMinimumOrderQuantity] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [purchaseStatus, setPurchaseStatus] = useState('Pending');
  const [notes, setNotes] = useState('');

  const [purchaseItems, setPurchaseItems] = useState([createEmptyPurchaseItem()]);

  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);

  const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(true);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true);
  const [isFetchingPurchases, setIsFetchingPurchases] = useState(true);
  const [isRecordingPurchase, setIsRecordingPurchase] = useState(false);
  const [purchaseEdits, setPurchaseEdits] = useState({});
  const [isUpdatingPurchaseId, setIsUpdatingPurchaseId] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPurchase, setDeletingPurchase] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(String(product.id), product));
    return map;
  }, [products]);

  const supplierById = useMemo(() => {
    const map = new Map();
    suppliers.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [suppliers]);

  const supplierDropdownOptions = useMemo(() => {
    const options = [];
    const seen = new Set();

    suppliers.forEach((item) => {
      options.push({ value: `existing:${item.id}`, label: item.name });
      seen.add(item.name.toLowerCase());
    });

    products.forEach((product) => {
      const supplierName = (product.supplierName || '').trim();
      if (!supplierName) return;
      const key = supplierName.toLowerCase();
      if (seen.has(key)) return;

      options.push({ value: `new:${supplierName}`, label: `${supplierName} (from products)` });
      seen.add(key);
    });

    return options;
  }, [suppliers, products]);

  const selectedSupplier = supplier ? supplierById.get(String(supplier)) : null;

  const subtotal = useMemo(
    () =>
      purchaseItems.reduce((sum, item) => {
        const lineSubtotal = parseNumber(item.costPrice) * parseNumber(item.quantity);
        const lineTotal = lineSubtotal - parseNumber(item.discount);
        return sum + Math.max(lineTotal, 0);
      }, 0),
    [purchaseItems]
  );

  const extraCharges = parseNumber(shipping) + parseNumber(tax) + parseNumber(otherCharges);
  const grandTotal = subtotal + extraCharges;

  const filteredPurchaseHistory = useMemo(() => {
    const hasStart = Boolean(startDate);
    const hasEnd = Boolean(endDate);

    return purchaseHistory.filter((purchase) => {
      if (filterSupplier !== 'All' && purchase.supplier !== filterSupplier) return false;
      if (filterPayment !== 'All' && purchase.paymentMethod !== filterPayment) return false;
      if (filterStatus !== 'All' && purchase.status !== filterStatus) return false;

      const historyDate = parseHistoryDate(purchase.date);
      if (!historyDate) return true;

      if (hasStart) {
        const from = new Date(startDate);
        if (historyDate < from) return false;
      }

      if (hasEnd) {
        const to = new Date(endDate);
        if (historyDate > to) return false;
      }

      return true;
    });
  }, [purchaseHistory, filterSupplier, filterPayment, filterStatus, startDate, endDate]);

  const supplierFilterOptions = useMemo(() => {
    const names = Array.from(new Set(purchaseHistory.map((item) => item.supplier).filter(Boolean)));
    return ['All', ...names];
  }, [purchaseHistory]);

  const fetchSuppliers = async () => {
    setIsFetchingSuppliers(true);
    try {
      const res = await api.get('suppliers/');
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to load suppliers.'),
      });
    } finally {
      setIsFetchingSuppliers(false);
    }
  };

  const fetchProducts = async () => {
    setIsFetchingProducts(true);
    try {
      const res = await api.get('products/');
      const list = Array.isArray(res.data) ? res.data : [];
      setProducts(
        list
          .filter((item) => item?.status !== 'Discontinued')
          .map((item) => ({
            id: item.id,
            name: item.name || 'Unnamed product',
            supplierId: item.supplier || '',
            supplierName: item.supplier_name || '',
            stock: parseNumber(item.stock),
            price: parseNumber(item.price),
          }))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to load products.'),
      });
    } finally {
      setIsFetchingProducts(false);
    }
  };

  const fetchPurchases = async () => {
    setIsFetchingPurchases(true);
    try {
      const res = await api.get('purchases/');
      const list = Array.isArray(res.data) ? res.data : [];
      setPurchaseHistory(
        list.map((item) => ({
          id: item.id,
          date: item.date,
          time: item.time,
          invoiceNumber: item.invoice_number,
          supplier: item.supplier,
          products: Array.isArray(item.products) ? item.products : [],
          purchasedBy: item.purchasedBy,
          paymentMethod: item.paymentMethod,
          total: item.total,
          status: item.status,
        }))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to load purchase history.'),
      });
    } finally {
      setIsFetchingPurchases(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    fetchPurchases();
  }, []);

  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  const handleSupplierSelect = (value) => {
    if (!value) {
      setSupplier('');
      setNewSupplier('');
      return;
    }

    if (value.startsWith('existing:')) {
      setSupplier(value.split(':')[1]);
      setNewSupplier('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
      setNewSupplierCompany('');
      setNewSupplierAddress('');
      setNewSupplierLeadTimeDays('');
      setNewSupplierMinimumOrderQuantity('');
      return;
    }

    if (value.startsWith('new:')) {
      const name = value.slice(4);
      setSupplier('');
      setNewSupplier(name);
    }
  };

  const addPurchaseItem = () => {
    setPurchaseItems((prev) => [...prev, createEmptyPurchaseItem()]);
  };

  const removePurchaseItem = (id) => {
    setPurchaseItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const updatePurchaseItem = (id, field, value) => {
    setPurchaseItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const adjustPurchaseItemQuantity = (id, delta) => {
    setPurchaseItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = Math.max(1, parseNumber(item.quantity) + delta);
        return { ...item, quantity: next };
      })
    );
  };

  const handleProductSelect = (id, productId) => {
    const product = productById.get(String(productId));
    setPurchaseItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          product: String(productId),
          costPrice: product ? String(product.price) : '',
        };
      })
    );
  };

  const handleResetRecord = () => {
    setSupplier('');
    setNewSupplier('');
    setNewSupplierEmail('');
    setNewSupplierPhone('');
    setNewSupplierCompany('');
    setNewSupplierAddress('');
    setNewSupplierLeadTimeDays('');
    setNewSupplierMinimumOrderQuantity('');
    setPurchaseDate('');
    setInvoiceNumber('');
    setPaymentMethod('Cash');
    setPurchaseStatus('Pending');
    setNotes('');
    setPurchaseItems([createEmptyPurchaseItem()]);
    setShipping(0);
    setTax(0);
    setOtherCharges(0);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterSupplier('All');
    setFilterPayment('All');
    setFilterStatus('All');
  };

  const validatePurchase = () => {
    if (!supplier && !newSupplier.trim()) {
      return 'Please select an existing supplier or enter a new supplier.';
    }

    if (!purchaseDate) return 'Please select purchase date.';
    if (!invoiceNumber.trim()) return 'Please enter invoice number.';
    if (!purchaseItems.length) return 'Add at least one purchase item.';

    for (const item of purchaseItems) {
      if (!item.product) return 'Please select product for each purchase item.';
      if (parseNumber(item.quantity) <= 0) return 'Quantity must be at least 1 for each item.';
      if (parseNumber(item.costPrice) <= 0) return 'Cost price must be greater than 0.';

      const lineSubtotal = parseNumber(item.costPrice) * parseNumber(item.quantity);
      if (parseNumber(item.discount) < 0) return 'Discount cannot be negative.';
      if (parseNumber(item.discount) > lineSubtotal) {
        return 'Discount cannot exceed item subtotal.';
      }
    }

    return null;
  };

  const handleRecordPurchase = async () => {
    setMessage({ type: '', text: '' });

    const validationError = validatePurchase();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setIsRecordingPurchase(true);
    try {
      const payload = {
        purchaseDate,
        invoiceNumber: invoiceNumber.trim(),
        paymentMethod,
        purchaseStatus,
        notes,
        shipping: parseNumber(shipping).toFixed(2),
        tax: parseNumber(tax).toFixed(2),
        otherCharges: parseNumber(otherCharges).toFixed(2),
        purchaseItems: purchaseItems.map((item) => ({
          product: Number(item.product),
          costPrice: parseNumber(item.costPrice).toFixed(2),
          quantity: Number(item.quantity),
          discount: parseNumber(item.discount).toFixed(2),
        })),
      };

      if (supplier) {
        payload.supplier = Number(supplier);
      } else {
        payload.newSupplier = newSupplier.trim();
        payload.newSupplierEmail = newSupplierEmail.trim();
        payload.newSupplierPhone = newSupplierPhone.trim();
        payload.newSupplierCompany = newSupplierCompany.trim();
        payload.newSupplierAddress = newSupplierAddress.trim();
        payload.newSupplierLeadTimeDays = Number(newSupplierLeadTimeDays || 0);
        payload.newSupplierMinimumOrderQuantity = Number(newSupplierMinimumOrderQuantity || 0);
      }

      await api.post('purchases/', payload);
      await Promise.all([fetchPurchases(), fetchProducts(), fetchSuppliers()]);

      handleResetRecord();
      setMessage({ type: 'success', text: 'Purchase recorded successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to record purchase.'),
      });
    } finally {
      setIsRecordingPurchase(false);
    }
  };

  const handleDeletePurchase = (purchase) => {
    setDeletingPurchase(purchase);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPurchase) return;

    setIsDeleting(true);
    try {
      await api.delete(`purchases/${deletingPurchase.id}/delete/`);
      await Promise.all([fetchPurchases(), fetchProducts()]);
      setIsDeleteModalOpen(false);
      setDeletingPurchase(null);
      setMessage({ type: 'success', text: 'Purchase deleted successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to delete purchase.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetails = (purchase) => {
    navigate(`/purchase/invoice/${purchase.id}`);
  };

  const getPurchaseDraft = (purchase) =>
    purchaseEdits[purchase.id] || {
      paymentMethod: purchase.paymentMethod,
      status: purchase.status,
    };

  const handlePurchaseDraftChange = (purchaseId, field, value) => {
    setPurchaseEdits((prev) => ({
      ...prev,
      [purchaseId]: {
        ...(prev[purchaseId] || {}),
        [field]: value,
      },
    }));
  };

  const clearPurchaseDraft = (purchaseId) => {
    setPurchaseEdits((prev) => {
      const next = { ...prev };
      delete next[purchaseId];
      return next;
    });
  };

  const handleUpdatePurchase = async (purchase) => {
    const draft = getPurchaseDraft(purchase);
    setIsUpdatingPurchaseId(purchase.id);
    setMessage({ type: '', text: '' });

    try {
      await api.patch(`purchases/${purchase.id}/`, {
        paymentMethod: draft.paymentMethod,
        purchaseStatus: draft.status,
      });

      await Promise.all([fetchPurchases(), fetchProducts()]);
      clearPurchaseDraft(purchase.id);
      setMessage({ type: 'success', text: 'Purchase updated successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to update purchase.'),
      });
    } finally {
      setIsUpdatingPurchaseId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Received':
        return 'bg-green-500/20 text-green-400';
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPaymentBadge = (method) => {
    switch (method) {
      case 'Cash':
        return 'bg-green-500/20 text-green-400';
      case 'Bank Transfer':
        return 'bg-blue-500/20 text-blue-400';
      case 'Credit':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Purchases</h2>
          <p className="text-white/70">Record incoming stock and manage supplier purchases</p>
        </div>

        {message.text && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Record Purchase</h3>
          <p className="text-white/60 text-sm mb-6">
            Recording a purchase will automatically update stock levels.
          </p>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="order-2 bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <h4 className="text-white font-semibold mb-4">Supplier & Invoice Details</h4>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Supplier *</label>
                    <select
                      value={supplier ? `existing:${supplier}` : newSupplier ? `new:${newSupplier}` : ''}
                      onChange={(e) => handleSupplierSelect(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                      disabled={isFetchingSuppliers || isFetchingProducts}
                    >
                      <option value="" className="bg-slate-800">
                        Select supplier
                      </option>
                      {supplierDropdownOptions.map((option) => (
                        <option key={option.value} value={option.value} className="bg-slate-800">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Or Add New Supplier</label>
                    <input
                      type="text"
                      value={newSupplier}
                      onChange={(e) => {
                        setNewSupplier(e.target.value);
                        setSupplier('');
                      }}
                      placeholder="Enter supplier name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  {selectedSupplier && (
                    <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/70 space-y-1">
                      <div className="text-white font-semibold">{selectedSupplier.name}</div>
                      <div>Email: <span className="text-white">{selectedSupplier.email || "Not set"}</span></div>
                      <div>Phone: <span className="text-white">{selectedSupplier.phone || "Not set"}</span></div>
                      <div>Company: <span className="text-white">{selectedSupplier.company || "Not set"}</span></div>
                      <div>Lead Time: <span className="text-white">{selectedSupplier.lead_time_days ? `${selectedSupplier.lead_time_days} days` : "Not set"}</span></div>
                      <div>Minimum Order: <span className="text-white">{selectedSupplier.minimum_order_quantity || "Not set"}</span></div>
                    </div>
                  )}

                  {newSupplier && !supplier && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Supplier Email</label>
                        <input
                          type="email"
                          value={newSupplierEmail}
                          onChange={(e) => setNewSupplierEmail(e.target.value)}
                          placeholder="supplier@example.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Supplier Phone</label>
                        <input
                          type="text"
                          value={newSupplierPhone}
                          onChange={(e) => setNewSupplierPhone(e.target.value)}
                          placeholder="+977-98XXXXXXXX"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Company</label>
                        <input
                          type="text"
                          value={newSupplierCompany}
                          onChange={(e) => setNewSupplierCompany(e.target.value)}
                          placeholder="Company name"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Address</label>
                        <input
                          type="text"
                          value={newSupplierAddress}
                          onChange={(e) => setNewSupplierAddress(e.target.value)}
                          placeholder="Supplier address"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Lead Time (days)</label>
                        <input
                          type="number"
                          min="0"
                          value={newSupplierLeadTimeDays}
                          onChange={(e) => setNewSupplierLeadTimeDays(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white">Minimum Order Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={newSupplierMinimumOrderQuantity}
                          onChange={(e) => setNewSupplierMinimumOrderQuantity(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Purchase Date *</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Invoice / Bill Number *</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g., INV-001"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                    >
                      <option value="Cash" className="bg-slate-800">Cash</option>
                      <option value="Bank Transfer" className="bg-slate-800">Bank Transfer</option>
                      <option value="Credit" className="bg-slate-800">Credit</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Purchase Status</label>
                    <select
                      value={purchaseStatus}
                      onChange={(e) => setPurchaseStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                    >
                      <option value="Pending" className="bg-slate-800">Pending</option>
                      <option value="Received" className="bg-slate-800">Received</option>
                      <option value="Cancelled" className="bg-slate-800">Cancelled</option>
                    </select>
                  </div>
                </div>

                {selectedSupplier && (
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <h5 className="text-sm font-semibold text-white mb-2">Supplier Information</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-white/60">Contact:</span>{' '}
                        <span className="text-white">{selectedSupplier.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-white/60">Email:</span>{' '}
                        <span className="text-white">{selectedSupplier.email || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-white/60">Company:</span>{' '}
                        <span className="text-white">{selectedSupplier.company || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="order-1 space-y-4">
                <h4 className="text-white font-semibold">Items Purchased</h4>

                {purchaseItems.map((item, index) => {
                  const lineTotal =
                    parseNumber(item.costPrice) * parseNumber(item.quantity) - parseNumber(item.discount);

                  return (
                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-white font-semibold">Item {index + 1}</h5>
                        {purchaseItems.length > 1 && (
                          <button
                            onClick={() => removePurchaseItem(item.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="grid md:grid-cols-5 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-white">Product</label>
                          <select
                            value={item.product}
                            onChange={(e) => handleProductSelect(item.id, e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                            disabled={isFetchingProducts}
                          >
                            <option value="" className="bg-slate-800">
                              {isFetchingProducts ? 'Loading products...' : 'Select product'}
                            </option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id} className="bg-slate-800">
                                {product.name} (Stock: {product.stock})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-white">Cost Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.costPrice}
                            onChange={(e) => updatePurchaseItem(item.id, 'costPrice', e.target.value)}
                            placeholder="Rs."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-white">Quantity</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => adjustPurchaseItemQuantity(item.id, -1)}
                              className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updatePurchaseItem(
                                  item.id,
                                  'quantity',
                                  Math.max(1, parseInt(e.target.value || '1', 10))
                                )
                              }
                              placeholder="1"
                              className="w-full px-4 py-3 text-center bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => adjustPurchaseItemQuantity(item.id, 1)}
                              className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-white">Discount</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discount}
                            onChange={(e) => updatePurchaseItem(item.id, 'discount', e.target.value)}
                            placeholder="Rs."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="text-sm text-white/60">
                          Line Total:{' '}
                          <span className="font-semibold text-white">{formatCurrency(Math.max(lineTotal, 0))}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={addPurchaseItem}
                  className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  + Add another product
                </button>
              </div>

              <div className="order-3 space-y-2">
                <label className="text-sm font-semibold text-white">Notes / Remarks</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any additional notes..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                />
              </div>

              <div className="order-4 flex items-center gap-3">
                <button
                  onClick={handleResetRecord}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-semibold"
                >
                  Reset
                </button>
                <button
                  onClick={handleRecordPurchase}
                  disabled={isRecordingPurchase || isFetchingProducts || isFetchingSuppliers}
                  className="group relative px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
                    {isRecordingPurchase ? 'Recording...' : 'Record Purchase'}
                  </div>
                </button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-6">
                <h4 className="text-white font-semibold mb-4">Summary</h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Shipping</label>
                    <input
                      type="number"
                      step="0.01"
                      value={shipping}
                      onChange={(e) => setShipping(e.target.value)}
                      placeholder="Rs."
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Tax / VAT</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder="Rs."
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white">Other Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      value={otherCharges}
                      onChange={(e) => setOtherCharges(e.target.value)}
                      placeholder="Rs."
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Subtotal</span>
                      <span className="text-white font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Extra Charges</span>
                      <span className="text-white font-medium">{formatCurrency(extraCharges)}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-white/10">
                      <span className="text-white">Grand Total</span>
                      <span className="text-white">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-2">Purchase History</h3>
          <p className="text-white/60 text-sm mb-6">View and manage previous purchase records</p>

          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Filters</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-all"
              >
                Reset Filters
              </button>
            </div>
            <div className="grid md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Supplier</label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  {supplierFilterOptions.map((name) => (
                    <option key={name} value={name} className="bg-slate-800">
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Payment Method</label>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  <option value="All" className="bg-slate-800">All</option>
                  <option value="Cash" className="bg-slate-800">Cash</option>
                  <option value="Bank Transfer" className="bg-slate-800">Bank Transfer</option>
                  <option value="Credit" className="bg-slate-800">Credit</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  <option value="All" className="bg-slate-800">All</option>
                  <option value="Received" className="bg-slate-800">Received</option>
                  <option value="Pending" className="bg-slate-800">Pending</option>
                  <option value="Cancelled" className="bg-slate-800">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Date</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Invoice #</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Products</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Supplier</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Purchased By</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Payment</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Total</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-white/70 font-semibold text-sm uppercase min-w-[13rem]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isFetchingPurchases ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-white/70">
                      Loading purchase history...
                    </td>
                  </tr>
                ) : filteredPurchaseHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-white/70">
                      No purchase records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPurchaseHistory.map((purchase) => {
                    const isPending = purchase.status === 'Pending';
                    const purchaseDraft = getPurchaseDraft(purchase);
                    const hasDraftChanges =
                      purchaseDraft.paymentMethod !== purchase.paymentMethod ||
                      purchaseDraft.status !== purchase.status;

                    return (
                      <tr key={purchase.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{purchase.date}</div>
                          <div className="text-white/60 text-sm">{purchase.time}</div>
                        </td>
                        <td className="px-6 py-4 text-white font-medium">{purchase.invoiceNumber}</td>
                        <td className="px-6 py-4">
                          {(purchase.products || []).length === 0 ? (
                            <span className="text-white/50 text-sm">No items</span>
                          ) : (
                            <div className="space-y-1">
                              {purchase.products.map((product) => (
                                <div key={product.id} className="text-sm">
                                  <div className="font-medium text-white">{product.name}</div>
                                  <div className="text-white/60">Qty {product.quantity}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-white">{purchase.supplier}</td>
                        <td className="px-6 py-4 text-white/70">{purchase.purchasedBy}</td>
                        <td className="px-6 py-4">
                          {isPending ? (
                            <select
                              value={purchaseDraft.paymentMethod}
                              onChange={(e) =>
                                handlePurchaseDraftChange(purchase.id, 'paymentMethod', e.target.value)
                              }
                              className="w-full min-w-[10rem] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="Cash" className="bg-slate-800">Cash</option>
                              <option value="Bank Transfer" className="bg-slate-800">Bank Transfer</option>
                              <option value="Credit" className="bg-slate-800">Credit</option>
                            </select>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentBadge(
                                purchase.paymentMethod
                              )}`}
                            >
                              {purchase.paymentMethod}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">{purchase.total}</td>
                        <td className="px-6 py-4">
                          {isPending ? (
                            <select
                              value={purchaseDraft.status}
                              onChange={(e) =>
                                handlePurchaseDraftChange(purchase.id, 'status', e.target.value)
                              }
                              className="w-full min-w-[10rem] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="Pending" className="bg-slate-800">Pending</option>
                              <option value="Received" className="bg-slate-800">Received</option>
                              <option value="Cancelled" className="bg-slate-800">Cancelled</option>
                            </select>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                                purchase.status
                              )}`}
                            >
                              {purchase.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 min-w-[13rem]">
                          <div className="ml-auto flex max-w-[13rem] flex-wrap items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleUpdatePurchase(purchase)}
                                  disabled={!hasDraftChanges || isUpdatingPurchaseId === purchase.id}
                                  className="shrink-0 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Save Changes"
                                >
                                  {isUpdatingPurchaseId === purchase.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => clearPurchaseDraft(purchase.id)}
                                  disabled={isUpdatingPurchaseId === purchase.id}
                                  className="shrink-0 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Reset Changes"
                                >
                                  Reset
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleViewDetails(purchase)}
                              className="shrink-0 rounded-lg p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
                              title="View Details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePurchase(purchase)}
                              className="shrink-0 rounded-lg p-2 text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingPurchase(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Record"
        itemName={`Purchase ${deletingPurchase?.invoiceNumber || ''}`}
        itemType="purchase record"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Purchase;
