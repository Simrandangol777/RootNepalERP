import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import api from '../api/axios';

const formatCurrency = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 'Rs. 0.00';
  return `Rs. ${num.toFixed(2)}`;
};

const SalesInvoice = () => {
  const navigate = useNavigate();
  const { saleId } = useParams();

  const [sale, setSale] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!saleId) {
        setError('Invalid sale ID.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const res = await api.get(`sales/${saleId}/`);
        setSale(res.data || null);
      } catch (err) {
        const message = err?.response?.data?.message || 'Failed to load invoice data.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [saleId]);

  const invoiceTotals = useMemo(() => {
    if (!sale) {
      return { subtotal: 0, totalDiscount: 0, total: 0 };
    }

    return {
      subtotal: Number(sale.subtotal || 0),
      totalDiscount: Number(sale.total_discount || 0),
      total: Number(sale.total || 0),
    };
  }, [sale]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/sales');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error || 'Sale not found.'}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Sales
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sales
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-white shadow-sm print:shadow-none">
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center overflow-hidden bg-white">
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">
                  {sale.date}, {sale.time}
                </div>
                <div className="text-sm text-gray-500">{sale.invoice_no}</div>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice {sale.invoice_no}</h1>
              <div className="text-sm text-gray-600">
                <div>{sale.date}, {sale.time}</div>
                <div>Sold by {sale.sold_by_name || 'User'}</div>
              </div>
            </div>
          </div>

          <div className="px-8 py-4 border-b border-gray-200">
            <div className="text-sm">
              <div className="font-semibold text-gray-900">Billed To</div>
              <div className="text-gray-600">{sale.customer_name || 'Customer'}</div>
            </div>
          </div>

          <div className="px-8 py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-sm font-semibold text-gray-900">Product</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-900">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-900">Price</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-900">Discount</th>
                  <th className="text-right py-3 text-sm font-semibold text-gray-900">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-900">{item.product_name}</td>
                    <td className="text-right py-3 text-sm text-gray-900">{item.quantity}</td>
                    <td className="text-right py-3 text-sm text-gray-900">{formatCurrency(item.selling_price)}</td>
                    <td className="text-right py-3 text-sm text-gray-900">{formatCurrency(item.discount)}</td>
                    <td className="text-right py-3 text-sm text-gray-900">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(invoiceTotals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(invoiceTotals.totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(invoiceTotals.total)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm">
                <span className="text-gray-600">Payment Method:</span>
                <span className="ml-2 text-gray-900 font-medium">{sale.payment_method}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 text-gray-900 font-medium">{sale.status}</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 text-center text-xs text-gray-500 print:bg-white">
            <p>Thank you for your business.</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesInvoice;
