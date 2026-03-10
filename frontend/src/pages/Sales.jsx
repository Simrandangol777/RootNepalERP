import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import api from '../api/axios';
import { getStoredUser } from '../auth/storage';

const createEmptySaleItem = () => ({
  id: Date.now() + Math.random(),
  product: '',
  sellingPrice: '',
  quantity: 1,
  discount: 0,
});

const parseNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value) => `Rs. ${parseNumber(value).toFixed(2)}`;

const parseSaleDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('/');
  if (parts.length !== 3) return null;

  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);

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

const Sales = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = getStoredUser();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [saleItems, setSaleItems] = useState([createEmptySaleItem()]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isRecordingSale, setIsRecordingSale] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [salesHistory, setSalesHistory] = useState([]);
  const [isFetchingSales, setIsFetchingSales] = useState(true);

  const [message, setMessage] = useState({ type: '', text: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSale, setDeletingSale] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const productById = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(String(product.id), product));
    return map;
  }, [products]);

  const recordSummary = useMemo(() => {
    const subtotal = saleItems.reduce((sum, item) => {
      const lineSubtotal = parseNumber(item.sellingPrice) * parseNumber(item.quantity);
      return sum + lineSubtotal;
    }, 0);

    const totalDiscount = saleItems.reduce((sum, item) => sum + parseNumber(item.discount), 0);
    const total = Math.max(subtotal - totalDiscount, 0);

    return { subtotal, totalDiscount, total };
  }, [saleItems]);

  const filteredSalesHistory = useMemo(() => {
    const hasStart = Boolean(startDate);
    const hasEnd = Boolean(endDate);

    if (!hasStart && !hasEnd) return salesHistory;

    const start = hasStart ? new Date(startDate) : null;
    const end = hasEnd ? new Date(endDate) : null;

    return salesHistory.filter((sale) => {
      const saleDate = parseSaleDate(sale.date);
      if (!saleDate) return true;

      if (start && saleDate < start) return false;
      if (end && saleDate > end) return false;

      return true;
    });
  }, [salesHistory, startDate, endDate]);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await api.get('products/');
      const list = Array.isArray(res.data) ? res.data : [];
      setProducts(
        list
          .filter((item) => item?.status !== 'Discontinued')
          .map((item) => ({
            id: item.id,
            name: item.name || 'Unnamed product',
            price: parseNumber(item.price),
            stock: parseNumber(item.stock),
            status: item.status || 'Active',
          }))
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to load products for sales.'),
      });
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchSalesHistory = async () => {
    setIsFetchingSales(true);
    try {
      const res = await api.get('sales/');
      setSalesHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to load sales history.'),
      });
    } finally {
      setIsFetchingSales(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSalesHistory();
  }, []);

  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo(0, 0);
    }
  }, [location.state]);

  const addSaleItem = () => {
    setSaleItems((prev) => [...prev, createEmptySaleItem()]);
  };

  const removeSaleItem = (id) => {
    setSaleItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const updateSaleItem = (id, field, value) => {
    setSaleItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const adjustSaleItemQuantity = (id, delta) => {
    setSaleItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = Math.max(1, parseNumber(item.quantity) + delta);
        return { ...item, quantity: next };
      })
    );
  };

  const handleProductSelect = (id, productId) => {
    const selectedProduct = productById.get(String(productId));
    setSaleItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          product: String(productId),
          sellingPrice: selectedProduct ? String(selectedProduct.price) : '',
        };
      })
    );
  };

  const handleResetRecordForm = () => {
    setSaleItems([createEmptySaleItem()]);
    setPaymentMethod('Cash');
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const validateSaleItems = () => {
    if (!saleItems.length) {
      return 'Add at least one item before recording a sale.';
    }

    for (const item of saleItems) {
      if (!item.product) return 'Please select a product for each item.';
      if (parseNumber(item.quantity) <= 0) return 'Quantity must be at least 1 for each item.';
      if (parseNumber(item.sellingPrice) <= 0) return 'Selling price must be greater than 0.';

      const lineSubtotal = parseNumber(item.sellingPrice) * parseNumber(item.quantity);
      if (parseNumber(item.discount) < 0) return 'Discount cannot be negative.';
      if (parseNumber(item.discount) > lineSubtotal) {
        return 'Discount cannot exceed item subtotal.';
      }

      const selectedProduct = productById.get(String(item.product));
      if (!selectedProduct) return 'One of the selected products is invalid.';
      if (parseNumber(item.quantity) > selectedProduct.stock) {
        return `Not enough stock for ${selectedProduct.name}. Available stock is ${selectedProduct.stock}.`;
      }
    }

    return null;
  };

  const handleRecordSale = async () => {
    setMessage({ type: '', text: '' });

    const validationError = validateSaleItems();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setIsRecordingSale(true);
    try {
      const payload = {
        paymentMethod,
        customerName: 'Customer',
        saleItems: saleItems.map((item) => ({
          product: Number(item.product),
          sellingPrice: parseNumber(item.sellingPrice).toFixed(2),
          quantity: Number(item.quantity),
          discount: parseNumber(item.discount).toFixed(2),
        })),
      };

      await api.post('sales/', payload);
      await Promise.all([fetchSalesHistory(), fetchProducts()]);

      handleResetRecordForm();
      setMessage({ type: 'success', text: 'Sale recorded successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to record sale. Please try again.'),
      });
    } finally {
      setIsRecordingSale(false);
    }
  };

  const handlePrintInvoice = (sale) => {
    navigate(`/sales/invoice/${sale.id}`);
  };

  const handleDeleteSale = (sale) => {
    setDeletingSale(sale);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSale) return;

    setIsDeleting(true);
    try {
      await api.delete(`sales/${deletingSale.id}/delete/`);
      await Promise.all([fetchSalesHistory(), fetchProducts()]);
      setIsDeleteModalOpen(false);
      setDeletingSale(null);
      setMessage({ type: 'success', text: 'Sale deleted successfully.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(error, 'Failed to delete sale.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Sales</h2>
          <p className="text-white/70">Record transactions and view sales history</p>
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
          <h3 className="text-xl font-bold text-white mb-2">Record Sale</h3>
          <p className="text-white/60 text-sm mb-6">
            Register a transaction and automatically log stock adjustments.
          </p>

          <div className="space-y-6">
            {saleItems.map((item, index) => {
              const lineSubtotal = parseNumber(item.sellingPrice) * parseNumber(item.quantity);
              const lineTotal = Math.max(lineSubtotal - parseNumber(item.discount), 0);

              return (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-semibold">Item {index + 1}</h4>
                    {saleItems.length > 1 && (
                      <button
                        onClick={() => removeSaleItem(item.id)}
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

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white">Product</label>
                      <select
                        value={item.product}
                        onChange={(e) => handleProductSelect(item.id, e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                        disabled={productsLoading}
                      >
                        <option value="" className="bg-slate-800">
                          {productsLoading ? 'Loading products...' : 'Select product'}
                        </option>
                        {products.map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                            className="bg-slate-800"
                            disabled={product.stock <= 0}
                          >
                            {product.name} (Stock: {product.stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white">Selling Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.sellingPrice}
                        onChange={(e) => updateSaleItem(item.id, 'sellingPrice', e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white">Quantity</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustSaleItemQuantity(item.id, -1)}
                          className="h-11 w-11 rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateSaleItem(
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
                          onClick={() => adjustSaleItemQuantity(item.id, 1)}
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
                        min="0"
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateSaleItem(item.id, 'discount', e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                      <p className="text-xs text-white/50">Line total: {formatCurrency(lineTotal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addSaleItem}
              className="text-white/70 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              + Add another product
            </button>

            <div className="border-t border-white/10 pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                  >
                    <option value="Cash" className="bg-slate-800">Cash</option>
                    <option value="Card" className="bg-slate-800">Card</option>
                    <option value="Fonpay" className="bg-slate-800">Fonpay</option>
                    <option value="Bank Transfer" className="bg-slate-800">Bank Transfer</option>
                  </select>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between text-white/80">
                    <span>Subtotal</span>
                    <span>{formatCurrency(recordSummary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Discount</span>
                    <span>{formatCurrency(recordSummary.totalDiscount)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between font-semibold text-white">
                    <span>Total</span>
                    <span>{formatCurrency(recordSummary.total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={handleResetRecordForm}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-semibold"
                >
                  Reset
                </button>
                <button
                  onClick={handleRecordSale}
                  disabled={isRecordingSale || productsLoading}
                  className="group relative px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
                    {isRecordingSale ? 'Recording...' : 'Record sales'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-2">Sales History</h3>
          <p className="text-white/60 text-sm mb-6">Recorded sales transactions</p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Filters</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-all"
              >
                Reset Filters
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Date</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Product</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Sold By</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Payment</th>
                  <th className="text-left px-6 py-4 text-white/70 font-semibold text-sm uppercase">Total</th>
                  <th className="text-right px-6 py-4 text-white/70 font-semibold text-sm uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isFetchingSales ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-white/70">
                      Loading sales history...
                    </td>
                  </tr>
                ) : filteredSalesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-white/70">
                      No sales records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredSalesHistory.map((sale) => {
                    const payment = sale.paymentMethod || 'Cash';
                    const paymentUpper = payment.toUpperCase();

                    return (
                      <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">
                            {sale.date}, {sale.time}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {(sale.products || []).map((product) => (
                            <div key={product.id} className="text-white mb-1 last:mb-0">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-white/60 text-sm">Qty {product.quantity} | {product.unit}</div>
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white/70">Sold by {sale.soldBy || storedUser.name || 'User'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              paymentUpper === 'CASH'
                                ? 'bg-green-500/20 text-green-400'
                                : paymentUpper === 'CARD'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {paymentUpper}
                          </span>
                          <div className="text-white/50 text-xs mt-1">{sale.status || 'Completed'}</div>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">{sale.total}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePrintInvoice(sale)}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all font-medium"
                            >
                              PRINT
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
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
          setDeletingSale(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Sale Record"
        itemName={`Sale #${deletingSale?.id || ''}`}
        itemType="sale record"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Sales;
