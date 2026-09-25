import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  ArrowRight, 
  CreditCard, 
  Truck, 
  Tag, 
  RotateCcw,
  X
} from 'lucide-react';
import TestHint from '../components/TestHint';

const PRODUCTS = [
  { id: 'prod-1', name: 'Pro Developer Laptop 16"', price: 1299, category: 'Computing', inStock: true, image: '💻' },
  { id: 'prod-2', name: 'Noise-Cancelling Headphones', price: 199, category: 'Audio', inStock: true, image: '🎧' },
  { id: 'prod-3', name: 'Wireless Mechanical Keyboard', price: 129, category: 'Peripherals', inStock: true, image: '⌨️' },
  { id: 'prod-4', name: 'Ergonomic Precision Mouse', price: 79, category: 'Peripherals', inStock: true, image: '🖱️' },
  { id: 'prod-5', name: 'Studio USB Microphone', price: 149, category: 'Audio', inStock: false, image: '🎙️' },
  { id: 'prod-6', name: 'Smart Fitness Tracker Watch', price: 89, category: 'Wearables', inStock: true, image: '⌚' }
];

export default function StoreLab() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');

  // Checkout Wizard State: null | 'shipping' | 'payment' | 'confirmed'
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({ name: 'John Doe', address: '123 Test Ave', city: 'QA City', zip: '90210' });
  const [confirmedOrderId, setConfirmedOrderId] = useState('');

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  // Pricing calculations
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const tax = Math.round((subtotal - discountAmount) * 0.08);
  const grandTotal = subtotal - discountAmount + tax;

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'SAVE20') {
      setDiscountPercent(20);
      setCouponMessage('Coupon applied: 20% Discount!');
    } else {
      setDiscountPercent(0);
      setCouponMessage('Invalid coupon code. Try SAVE20.');
    }
  };

  const handlePlaceOrder = () => {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    setConfirmedOrderId(orderId);
    setCheckoutStep('confirmed');
    setCart([]);
    setDiscountPercent(0);
    setCouponCode('');
  };

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">E-Commerce End-to-End Flow Lab</h1>
            <TestHint
              testId="store-lab-header"
              tip="Test full end-to-end shopping user journeys: browse, filter, add to cart, verify calculations, apply promo coupons, and complete multi-step checkout."
            />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Simulate a realistic online store checkout flow for complete business workflow automation.
          </p>
        </div>

        {/* Cart Trigger Button */}
        <button
          type="button"
          data-testid="open-cart-btn"
          onClick={() => setIsCartOpen(true)}
          className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-colors self-start sm:self-auto"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>View Cart</span>
          {totalItemsCount > 0 && (
            <span
              data-testid="cart-badge-count"
              className="bg-emerald-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center -mr-1"
            >
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* Catalog Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-testid="search-products-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Computing', 'Audio', 'Peripherals', 'Wearables'].map((cat) => (
            <button
              key={cat}
              type="button"
              data-testid={`filter-cat-${cat.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            data-testid={`product-card-${product.id}`}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-all group"
          >
            <div>
              <div className="w-full h-36 bg-slate-100 rounded-xl flex items-center justify-center text-5xl mb-4 group-hover:scale-105 transition-transform">
                {product.image}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{product.category}</span>
                <span
                  data-testid={`stock-status-${product.id}`}
                  className={`font-semibold ${product.inStock ? 'text-emerald-600' : 'text-rose-500'}`}
                >
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <h3 data-testid={`product-title-${product.id}`} className="font-bold text-slate-900 text-sm">
                {product.name}
              </h3>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span data-testid={`product-price-${product.id}`} className="font-bold text-lg text-slate-900">
                ${product.price}
              </span>

              <button
                type="button"
                data-testid={`add-to-cart-btn-${product.id}`}
                disabled={!product.inStock}
                onClick={() => addToCart(product)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Drawer / Slide-Over Modal */}
      {isCartOpen && (
        <div
          data-testid="cart-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fadeIn"
        >
          <div
            data-testid="cart-drawer"
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto"
          >
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-base text-slate-900">Your Shopping Cart</h2>
                  <span className="text-xs text-slate-400">({totalItemsCount} items)</span>
                </div>
                <button
                  type="button"
                  data-testid="close-cart-btn"
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 my-4 max-h-[40vh] overflow-y-auto">
                {cart.length === 0 ? (
                  <div data-testid="cart-empty-msg" className="py-12 text-center text-slate-400 text-xs">
                    Your cart is currently empty.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`cart-item-${item.id}`}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.image}</span>
                        <div>
                          <span className="font-semibold text-slate-900 block">{item.name}</span>
                          <span className="text-slate-500">${item.price} each</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 rounded-lg">
                          <button
                            type="button"
                            data-testid={`cart-qty-dec-${item.id}`}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 text-slate-500 hover:text-indigo-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            data-testid={`cart-qty-value-${item.id}`}
                            className="px-2 font-mono font-semibold text-slate-800"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            data-testid={`cart-qty-inc-${item.id}`}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 text-slate-500 hover:text-indigo-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          data-testid={`cart-remove-${item.id}`}
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Coupon Section */}
              {cart.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="coupon-input"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Coupon (e.g. SAVE20)"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs uppercase font-mono"
                    />
                    <button
                      type="button"
                      data-testid="apply-coupon-btn"
                      onClick={applyCoupon}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMessage && (
                    <span
                      data-testid="coupon-message"
                      className={`text-[11px] block font-medium ${
                        discountPercent > 0 ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {couponMessage}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Cart Footer & Checkout Button */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span data-testid="cart-subtotal" className="font-mono">${subtotal}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount (20%):</span>
                      <span data-testid="cart-discount" className="font-mono">-${discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Estimated Tax (8%):</span>
                    <span data-testid="cart-tax" className="font-mono">${tax}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span data-testid="cart-grand-total" className="font-mono text-indigo-600">${grandTotal}</span>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="proceed-to-checkout-btn"
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('shipping');
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Wizard Modals */}
      {checkoutStep === 'shipping' && (
        <div data-testid="checkout-wizard-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Step 1: Shipping Details</span>
              </h3>
              <button onClick={() => setCheckoutStep(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">Recipient Name</label>
                <input
                  type="text"
                  data-testid="shipping-name-input"
                  value={shippingInfo.name}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block">Street Address</label>
                <input
                  type="text"
                  data-testid="shipping-address-input"
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">City</label>
                  <input
                    type="text"
                    data-testid="shipping-city-input"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">ZIP Code</label>
                  <input
                    type="text"
                    data-testid="shipping-zip-input"
                    value={shippingInfo.zip}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, zip: e.target.value })}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutStep(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Back to Store
              </button>
              <button
                type="button"
                data-testid="shipping-next-btn"
                onClick={() => setCheckoutStep('payment')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Next: Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutStep === 'payment' && (
        <div data-testid="payment-step-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Step 2: Simulated Payment</span>
              </h3>
              <button onClick={() => setCheckoutStep(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-800">
              Payment Amount: <span className="font-mono font-bold">${grandTotal}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">Card Number</label>
                <input
                  type="text"
                  data-testid="payment-card-input"
                  defaultValue="4532 8920 1204 9081"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    data-testid="payment-expiry-input"
                    defaultValue="12/28"
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">CVV</label>
                  <input
                    type="password"
                    data-testid="payment-cvv-input"
                    defaultValue="894"
                    maxLength={3}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckoutStep('shipping')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                data-testid="place-order-btn"
                onClick={handlePlaceOrder}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md"
              >
                Place Order Now (${grandTotal})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Order Confirmation Screen */}
      {checkoutStep === 'confirmed' && (
        <div data-testid="order-confirmed-screen" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Order Placed Successfully!</h2>
          <p className="text-xs text-slate-600">
            Thank you, <span className="font-semibold">{shippingInfo.name}</span>! Your simulated order has been verified.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700">
            Order Reference: <span data-testid="confirmed-order-id" className="font-bold text-indigo-600">{confirmedOrderId}</span>
          </div>

          <button
            type="button"
            data-testid="continue-shopping-btn"
            onClick={() => setCheckoutStep(null)}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      )}
    </div>
  );
}

