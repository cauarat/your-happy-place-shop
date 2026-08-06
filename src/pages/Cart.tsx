import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getProducts } from "@/lib/store";
import type { Product } from "@/data/products";
import { Lock, ArrowLeft } from "lucide-react";
import CartTour from "@/components/CartTour";

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
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] text-black font-sans selection:bg-black selection:text-white">
      {/* Minimal top bar with back button */}
      <div 
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 lg:px-10 pb-4 flex items-center transition-all"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black hover:opacity-60 transition-opacity active:scale-95">
          <ArrowLeft size={20} strokeWidth={1.5} />
          <span className="text-sm font-medium tracking-wide">Continue Shopping</span>
        </button>
      </div>
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 sm:pt-16 pb-[112px] xl:pb-24">
        
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
          
          {/* Shopping Bag (Left Column) */}
          <div className="flex-[2] w-full">
            <h1 className="text-[11px] font-bold tracking-widest uppercase mb-6 sm:mb-8 text-[#111]">{t('shopping_bag')}</h1>
            
            {items.length === 0 ? (
              <div className="border-t border-[#e5e5e5] pt-8 text-center bg-white rounded-3xl p-8 shadow-sm">
                <p className="text-sm text-[#555]">{t('bag_empty')}</p>
                <Link to="/" className="text-xs font-medium underline mt-4 inline-block hover:opacity-70 transition-opacity">
                  {t('continue_shopping')}
                </Link>
              </div>
            ) : (
              <div className="w-full">
                {/* Table Header - Hidden on small mobile */}
                <div className="hidden sm:flex justify-between text-[10px] text-[#777] uppercase tracking-widest border-b border-[#e5e5e5] pb-4 mb-4">
                  <span>{t('item')}</span>
                  <span>{t('total')}</span>
                </div>

                {/* Items List */}
                <div data-tour="cart-items" className="space-y-4 sm:space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 sm:gap-6 border border-[#eaeaea] p-4 sm:p-6 rounded-[24px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] group">
                      {/* Image */}
                      <Link to={item.product?.id ? `/product/${item.product.id}` : '#'} className="w-20 h-28 sm:w-24 sm:h-32 shrink-0 bg-[#f8f8f8] rounded-[16px] flex items-center justify-center overflow-hidden">
                        <img 
                          src={item.product?.image} 
                          alt={item.product?.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          style={item.product?.removeBackground ? { mixBlendMode: 'multiply' } : {}}
                        />
                      </Link>
                      
                      {/* Info & Price Wrapper */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="flex justify-between items-start gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold tracking-widest uppercase text-[#111] truncate">{item.product?.designer}</p>
                            <p className="text-xs sm:text-sm mt-1 text-[#444] leading-relaxed line-clamp-2">{item.product?.name ? t(item.product.name) : ''}</p>
                            {item.size && (
                              <p className="text-[11px] text-[#777] mt-2">Size: {item.size}</p>
                            )}
                            <p className="text-[10px] text-[#777] mt-1">{t('quantity')}: {item.quantity}</p>
                          </div>
                          
                          {/* Price */}
                          <div className="text-sm font-medium text-right shrink-0 whitespace-nowrap pl-1 text-[#111]">
                            ${((item.product?.price || 0) * (item.quantity || 1)).toFixed(2)} USD
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-4 mt-4">
                          <button className="text-[10px] text-[#777] underline hover:text-[#111] transition-colors whitespace-nowrap">{t('move_to_wishlist')}</button>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-[10px] text-[#777] underline hover:text-red-500 transition-colors whitespace-nowrap"
                          >
                            {t('remove')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

          {/* Checkout Section (Right Column) */}
          {items.length > 0 && (
            <div data-tour="cart-checkout" className="flex-1 w-full lg:max-w-[380px] sticky top-[100px] bg-white border border-[#eaeaea] p-6 sm:p-8 mt-8 lg:mt-0 rounded-[32px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
              <h2 className="text-[11px] font-bold tracking-widest uppercase mb-8 text-[#111]">{t('order_summary')}</h2>
              
              <div className="w-full space-y-6">
                {/* Totals Summary */}
                <div className="w-full text-xs">
                  <div className="flex justify-between mb-4">
                    <span className="text-[#555]">{t('total')}</span>
                    <span className="font-medium">${cartTotal.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="text-[#555]">{t('shipping_estimate')}</span>
                    <span className="text-[#999]">{t('calculated_at_checkout')}</span>
                  </div>
                  <div className="flex justify-between mb-6 pb-6 border-b border-[#f0f0f0]">
                    <span className="text-[#555]">{t('duties_and_taxes')}</span>
                    <span className="text-[#999]">{t('included')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm mb-8 text-[#111]">
                    <span>{t('order_total')}</span>
                    <span>${cartTotal.toFixed(2)} USD</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/checkout')}
                  disabled={items.length === 0}
                  className="proceed-to-checkout-btn w-full bg-black text-white h-[54px] rounded-full text-[11px] font-bold tracking-widest uppercase hover:bg-[#222] hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('proceed_to_checkout')}
                </button>
              </div>
            </div>
          )}
          
        </div>

        {/* Popular Items Section */}
        {popularItems.length > 0 && (
          <div data-tour="cart-popular" className="popular-items-section mt-24 sm:mt-32">
            <h3 className="text-[11px] font-bold tracking-widest uppercase mb-6 sm:mb-8 text-[#111]">{t('add_popular_items')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-8">
              {popularItems.map((prod) => (
                <Link to={`/product/${prod.id}`} key={prod.id} className="group flex flex-col">
                  <div className="aspect-[4/5] w-full bg-white rounded-[20px] mb-4 flex items-center justify-center overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out"
                      style={prod.removeBackground ? { mixBlendMode: 'multiply' } : {}}
                    />
                  </div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1 truncate text-[#111]">{prod.designer}</p>
                  <p className="text-[11px] text-[#555] leading-tight mb-2 line-clamp-2 group-hover:text-black transition-colors">{t(prod.name)}</p>
                  <div className="flex gap-2 text-[11px]">
                    <span className="font-medium text-[#111]">${prod.price}</span>
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
      <footer className="mt-auto border-t border-[#eaeaea] pt-12 pb-8 px-4 sm:px-6 lg:px-10 bg-white">
        <div className="max-w-[1400px] mx-auto">
          {/* Payment Methods */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-12 sm:mb-16">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mr-0 sm:mr-4 text-[#111]">
              <Lock size={12} strokeWidth={2} />
              {t('secure_payment')}
            </div>
            {/* Payment Icons Simulation */}
            <div className="flex flex-wrap justify-center gap-2">
              {["VISA", "MASTERCARD", "AMEX", "APPLE PAY", "PAYPAL"].map((pm) => (
                <div key={pm} className="border border-[#e0e0e0] px-2.5 py-1.5 text-[9px] font-bold tracking-widest rounded-md bg-[#fafafa] text-[#555]">
                  {pm}
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Links */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-4 text-[9px] uppercase tracking-widest text-[#555] mb-8">
            <a href="#" className="hover:text-black transition-colors">{t('customer_care')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('location')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('editorial_archive')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('careers')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('country_region')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('email_signup')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('affiliates')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('sitemap')}</a>
            <a href="#" className="hover:text-black transition-colors">Facebook</a>
            <a href="#" className="hover:text-black transition-colors">Instagram</a>
            <a href="#" className="hover:text-black transition-colors">X</a>
            <a href="#" className="hover:text-black transition-colors">TikTok</a>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-3 text-[9px] text-[#888]">
            <span>© {new Date().getFullYear()} VILLAORO.COM</span>
            <a href="#" className="hover:text-black transition-colors">{t('terms_conditions')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('privacy_policy')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('cookies')}</a>
            <a href="#" className="hover:text-black transition-colors">{t('accessibility')}</a>
          </div>
        </div>
      </footer>
      <CartTour />
    </div>
  );
};

export default Cart;
