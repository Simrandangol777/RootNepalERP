import { useState } from "react";

const StockAdjustmentModal = ({ product, onClose, onSave }) => {
  const [adjustmentType, setAdjustmentType] = useState("increase");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const nextStock = quantity
    ? adjustmentType === "increase"
      ? product.currentStock + parseInt(quantity || 0, 10)
      : product.currentStock - parseInt(quantity || 0, 10)
    : product.currentStock;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsedQty = parseInt(quantity, 10);

    if (!quantity || parsedQty <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (adjustmentType === "decrease" && parsedQty > product.currentStock) {
      setError("Cannot decrease more than current stock.");
      return;
    }

    setIsLoading(true);

    try {
      await onSave({
        productId: product.id,
        adjustmentType,
        quantity: parsedQty,
        reason,
        notes,
      });
    } catch (err) {
      setError("Failed to apply stock adjustment.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl w-full max-w-2xl border border-white/20 shadow-2xl">
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{product.name}</h2>
            <p className="text-white/60 text-sm mt-1">
              Current stock: <span className="font-semibold text-white">{product.currentStock}</span> | Minimum:{" "}
              <span className="font-semibold text-white">{product.minimumStock}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-semibold text-white block">ADJUSTMENT TYPE</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAdjustmentType("increase")}
                className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                  adjustmentType === "increase"
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105"
                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                }`}
              >
                Increase stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("decrease")}
                className={`px-6 py-4 rounded-xl font-semibold transition-all ${
                  adjustmentType === "decrease"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg scale-105"
                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                }`}
              >
                Decrease stock
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="1"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter units to adjust"
            />
            <p className="text-white/50 text-xs">
              New stock will be: <span className="font-semibold text-white">{nextStock}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">
              Reason <span className="text-white/50 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="e.g., Damaged goods, Return, Restock, etc."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">
              Internal Notes <span className="text-white/50 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              placeholder="Add any additional notes about this adjustment..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative px-6 py-3"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 group-active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply Adjustment
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

export default StockAdjustmentModal;