import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getProducts } from "@/lib/store";
import type { Product } from "@/data/products";
import { Lock } from "lucide-react";

const Cart = () => {
  const { t } = useLanguage();
  const { items, cartTotal, removeFromCart } = useCart();
  const [popularItems, setPopularItems] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const all = getProducts();
    // Exclude items already in cart for recommendations
    const cartItemIds = items.map(i => i.product?.id).filter(Boolean);
    const available = all.filter(p => !cartItemIds.includes(p.id));
    setPopularItems(available.slice(0, 5));
    window.scrollTo(0, 0);
  }, [items]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white">
      <Header />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 pb-24">
        
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          
          {/* Left Column: Shopping Bag */}
          <div className="flex-[2] w-full">
            <h1 className="text-[11px] font-bold tracking-widest uppercase mb-12">Shopping Bag</h1>
            
            {items.length === 0 ? (
              <div className="border-t border-[#e5e5e5] pt-8">
                <p className="text-sm">Your shopping bag is empty.</p>
                <Link to="/" className="text-xs underline mt-4 inline-block hover:opacity-70">
                  Continue Shopping
                </Link>
              </div>
            ) : (
              <div className="w-full">
                {/* Table Header */}
                <div className="flex justify-between text-[10px] text-[#777] uppercase tracking-widest border-b border-[#e5e5e5] pb-4 mb-4">
                  <span>Item</span>
                  <span>Total</span>
                </div>

                {/* Items List */}
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-6 border-b border-[#e5e5e5] pb-6">
                      {/* Image */}
                      <Link to={item.product?.id ? `/product/${item.product.id}` : '#'} className="w-24 h-32 shrink-0 bg-[#f8f8f8] flex items-center justify-center overflow-hidden">
                        <img 
                          src={item.product?.image} 
                          alt={item.product?.name} 
                          className="w-full h-full object-contain"
                          style={item.product?.removeBackground ? { mixBlendMode: 'multiply' } : {}}
                        />
                      </Link>
                      
                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] font-bold tracking-widest uppercase">{item.product?.designer}</p>
                          <p className="text-xs mt-1 text-[#333] leading-relaxed max-w-[250px]">{item.product?.name ? t(item.product.name) : ''}</p>
                          {item.size && (
                            <p className="text-[11px] text-[#777] mt-3">Size: {item.size}</p>
                          )}
                          <p className="text-[10px] text-[#777] mt-1">Quantity: {item.quantity}</p>
                        </div>
                        
                        <div className="flex gap-4 mt-6">
                          <button className="text-[10px] underline hover:opacity-70">Move to Wishlist</button>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-[10px] underline hover:opacity-70"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-sm font-medium text-right shrink-0">
                        ${((item.product?.price || 0) * (item.quantity || 1)).toFixed(2)} USD
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end pt-8">
                  <div className="w-full max-w-[320px] text-xs">
                    <div className="flex justify-between mb-3">
                      <span className="text-[#555]">Total</span>
                      <span>${cartTotal.toFixed(2)} USD</span>
                    </div>
                    <div className="flex justify-between mb-3">
                      <span className="text-[#555]">Shipping estimate</span>
                      <span className="text-[#777]">Calculated at Checkout</span>
                    </div>
                    <div className="flex justify-between mb-8">
                      <span className="text-[#555]">Duties and taxes</span>
                      <span className="text-[#777]">Included</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                      <span>Order Total</span>
                      <span>${cartTotal.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Checkout */}
          <div className="flex-1 w-full lg:max-w-[400px]">
            <h2 className="text-[11px] font-bold tracking-widest uppercase mb-12">Checkout</h2>
            
            <div className="space-y-6">
              <p className="text-[11px] text-[#333]">
                Enter your email to login or continue to checkout as a guest.
              </p>
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-[11px] text-[#333]">Email address</label>
                <input 
                  id="email" 
                  type="email" 
                  className="w-full border border-[#ccc] focus:border-black outline-none px-3 py-2 text-sm transition-colors bg-[#fdfdfd]"
                />
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                disabled={items.length === 0}
                className="w-full bg-black text-white h-[50px] text-[11px] font-bold tracking-widest uppercase hover:bg-[#222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
          
        </div>

        {/* Popular Items Section */}
        {popularItems.length > 0 && (
          <div className="mt-32">
            <h3 className="text-[11px] font-bold tracking-widest uppercase mb-8">Add These Popular Items</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-8">
              {popularItems.map((prod) => (
                <Link to={`/product/${prod.id}`} key={prod.id} className="group flex flex-col">
                  <div className="aspect-[4/5] w-full bg-[#f8f8f8] mb-4 flex items-center justify-center overflow-hidden">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      style={prod.removeBackground ? { mixBlendMode: 'multiply' } : {}}
                    />
                  </div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1 truncate">{prod.designer}</p>
                  <p className="text-[11px] text-[#555] leading-tight mb-2 line-clamp-2">{t(prod.name)}</p>
                  <div className="flex gap-2 text-[11px]">
                    <span className="font-medium">${prod.price}</span>
                    {prod.oldPrice && (
                      <span className="text-[#999] line-through">${prod.oldPrice}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Cart Footer */}
      <footer className="mt-auto border-t border-[#e5e5e5] pt-12 pb-8 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          {/* Payment Methods */}
          <div className="flex flex-wrap items-center gap-4 mb-16">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mr-4">
              <Lock size={12} strokeWidth={2} />
              Secure Payment
            </div>
            {/* Payment Icons Simulation */}
            <div className="flex gap-2">
              {["VISA", "MASTERCARD", "AMEX", "APPLE PAY", "PAYPAL"].map((pm) => (
                <div key={pm} className="border border-[#ccc] px-2 py-1 text-[9px] font-bold tracking-widest rounded-sm bg-[#fafafa]">
                  {pm}
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 text-[9px] uppercase tracking-widest text-[#333] mb-8">
            <a href="#" className="hover:text-black">Customer Care</a>
            <a href="#" className="hover:text-black">Location</a>
            <a href="#" className="hover:text-black">Editorial Archive</a>
            <a href="#" className="hover:text-black">Careers</a>
            <a href="#" className="hover:text-black">Country/Region: Brazil</a>
            <a href="#" className="hover:text-black">Email Signup</a>
            <a href="#" className="hover:text-black">Affiliates</a>
            <a href="#" className="hover:text-black">Sitemap</a>
            <a href="#" className="hover:text-black">Facebook</a>
            <a href="#" className="hover:text-black">Instagram</a>
            <a href="#" className="hover:text-black">X</a>
            <a href="#" className="hover:text-black">TikTok</a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-[9px] text-[#777]">
            <span>© {new Date().getFullYear()} VILLAORO.COM</span>
            <a href="#" className="hover:text-black">Terms & Conditions</a>
            <a href="#" className="hover:text-black">Privacy Policy</a>
            <a href="#" className="hover:text-black">Cookies</a>
            <a href="#" className="hover:text-black">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Cart;
