import { useState } from 'react';

const ProductDetailModal = ({ product, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState('details');
  const productPrice = Number(product?.sellingPrice ?? product?.price ?? 0);
  const productCost = Number(product?.costPrice ?? 0);
  const productTags = Array.isArray(product?.tags)
    ? product.tags
    : String(product?.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Product Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="p-6">
            {/* Product Image and Basic Info */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Image */}
              <div className="md:col-span-1">
                <div className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-24 h-24 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-white/70">{product.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-white/60 text-sm mb-1">Category</div>
                    <div className="text-white font-semibold">
                      {product.categoryName || product.category}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-white/60 text-sm mb-1">SKU Number</div>
                    <div className="text-white font-semibold">{product.skuNumber}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-white/60 text-sm mb-1">Selling Price</div>
                    <div className="text-white font-bold text-2xl">Rs. {productPrice.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-white/60 text-sm mb-1">Cost Price</div>
                    <div className="text-white font-bold text-2xl">Rs. {productCost.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-white/60 text-sm mb-1">Stock</div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-2xl">{product.stock}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.stock > 10 
                          ? 'bg-green-500/20 text-green-400' 
                          : product.stock > 0 
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.stock > 10 ? 'In Stock' : product.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Tab Headers */}
              <div className="flex border-b border-white/10 bg-white/5">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'details'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'inventory'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Inventory
                </button>
                <button
                  onClick={() => setActiveTab('supplier')}
                  className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                    activeTab === 'supplier'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Supplier
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-white/60 text-sm mb-1">Product Name</div>
                        <div className="text-white font-medium">{product.name}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Category</div>
                        <div className="text-white font-medium">
                          {product.categoryName || product.category}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">SKU Number</div>
                        <div className="text-white font-medium">{product.skuNumber}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Status</div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                          {product.status}
                        </span>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Selling Price</div>
                        <div className="text-white font-bold text-xl">Rs. {productPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Cost Price</div>
                        <div className="text-white font-bold text-xl">Rs. {productCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Tags</div>
                        <div className="flex gap-2 flex-wrap">
                          {productTags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm mb-1">Description</div>
                      <div className="text-white">{product.description}</div>
                    </div>
                  </div>
                )}

                {activeTab === 'inventory' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-white/60 text-sm mb-1">Current Stock</div>
                        <div className="text-white font-bold text-2xl">{product.stock} units</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Reorder Level</div>
                        <div className="text-white font-medium">{product.reorderLevel} units</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Stock Status</div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          product.stock > product.reorderLevel
                            ? 'bg-green-500/20 text-green-400'
                            : product.stock > 0
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {product.stock > product.reorderLevel
                            ? 'Sufficient Stock'
                            : product.stock > 0
                            ? 'Low Stock - Reorder Soon'
                            : 'Out of Stock'}
                        </span>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Stock Value</div>
                        <div className="text-white font-bold text-2xl">
                          Rs. {(product.stock * productPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert */}
                    {product.stock <= product.reorderLevel && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                        <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <div className="text-yellow-400 font-semibold mb-1">Stock Alert</div>
                          <div className="text-yellow-300/80 text-sm">
                            Current stock ({product.stock} units) is at or below the reorder level ({product.reorderLevel} units). Consider reordering soon.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'supplier' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-white/60 text-sm mb-1">Supplier Name</div>
                        <div className="text-white font-medium">{product.supplierName || "Not set"}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Supplier Status</div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                          Active
                        </span>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Contact Email</div>
                        <div className="text-white font-medium">{product.supplierEmail || "Not set"}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Contact Phone</div>
                        <div className="text-white font-medium">{product.supplierPhone || "Not set"}</div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Lead Time</div>
                        <div className="text-white font-medium">
                          {product.supplierLeadTimeDays ? `${product.supplierLeadTimeDays} days` : "Not set"}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-sm mb-1">Minimum Order</div>
                        <div className="text-white font-medium">
                          {product.supplierMinimumOrderQuantity || "Not set"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white/10 backdrop-blur-xl border-t border-white/20 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="group relative px-6 py-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
