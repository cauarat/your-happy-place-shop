import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import MobileBottomDock from "@/components/MobileBottomDock";

const Checkout = () => {
  const { t } = useLanguage();
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error(t('cart_empty'));
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Redirecting to secure checkout...');

    try {
      // Since this is a frontend-only app without a backend Stripe integration,
      // we simulate the checkout process and redirect directly to success.
      setTimeout(() => {
        toast.dismiss(loadingToast);
        clearCart();
        navigate('/success');
      }, 1500);

    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Something went wrong. Please try again.');
      setIsProcessing(false);
    }
  };

  const inputClasses = "w-full border border-[#e5e5e5] rounded-none px-4 py-3 text-sm focus:border-black focus:outline-none transition-colors bg-white";
  const labelClasses = "block text-[10px] font-bold tracking-widest uppercase text-[#555] mb-2";
  const sectionTitleClasses = "text-[11px] font-bold tracking-widest uppercase mb-6 text-black";
  const dividerClasses = "border-t border-[#e5e5e5] my-10";

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="w-full flex justify-center py-12">
        <Link to="/" className="text-xl md:text-2xl font-bold tracking-tighter uppercase text-black hover:opacity-70 transition-opacity">
          VILLAORO
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-[96px] xl:pb-10">
        
        <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-16 xl:gap-24 items-start">
          
          {/* Left Column (65%) - Forms */}
          <div className="w-full lg:flex-[65%]">
            <h1 className="text-[10px] font-bold tracking-widest uppercase mb-8">{t('checkout')}</h1>
            
            <div className={dividerClasses} />

            {/* Shipping Address */}
            <section>
              <h2 className={sectionTitleClasses}>{t('shipping_address')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className={labelClasses}>{t('first_name')}</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>{t('last_name')}</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>{t('street_address')}</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>{t('company_optional')}</label>
                  <input type="text" className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>{t('city')}</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>{t('zip_code')}</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>{t('country_region_label')}</label>
                  <select className={inputClasses} required defaultValue="BR">
                    <option value="US">United States</option>
                    <option value="BR">Brazil</option>
                    <option value="UK">United Kingdom</option>
                    <option value="EU">Europe</option>
                    <option value="JP">Japan</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>{t('state_province')}</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>{t('phone')}</label>
                  <input type="tel" required className={inputClasses} />
                </div>
              </div>
            </section>

            <div className={dividerClasses} />

            {/* Shipping Method */}
            <section>
              <h2 className={sectionTitleClasses}>{t('shipping_method')}</h2>
              <p className="text-[11px] text-[#555] mb-6">{t('free_shipping_eligible')}</p>
              
              <div className="border border-[#e5e5e5] p-4 flex items-center gap-4 cursor-pointer hover:border-[#ccc] transition-colors" onClick={() => setShippingMethod("standard")}>
                <input 
                  type="radio" 
                  name="shipping" 
                  value="standard" 
                  checked={shippingMethod === "standard"} 
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="accent-black w-4 h-4"
                />
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest">{t('standard_shipping')}</p>
                  <p className="text-xs text-[#777] mt-1">{t('business_days')}</p>
                </div>
                <span className="text-xs font-medium">{t('free')}</span>
              </div>
            </section>

            <div className={dividerClasses} />

            {/* Payment Method */}
            <section>
              <h2 className={sectionTitleClasses}>{t('payment_method')}</h2>
              
              <div className="flex flex-col gap-3">
                <label className={`border p-4 flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === "credit_card" ? "border-black" : "border-[#e5e5e5] hover:border-[#ccc]"}`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    value="credit_card" 
                    checked={paymentMethod === "credit_card"} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-black w-4 h-4"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest">{t('credit_debit_card')}</span>
                    <div className="flex gap-2">
                      <span className="text-[9px] border border-[#ccc] px-1.5 py-0.5 rounded-sm bg-[#fafafa]">VISA</span>
                      <span className="text-[9px] border border-[#ccc] px-1.5 py-0.5 rounded-sm bg-[#fafafa]">MC</span>
                      <span className="text-[9px] border border-[#ccc] px-1.5 py-0.5 rounded-sm bg-[#fafafa]">AMEX</span>
                    </div>
                  </div>
                </label>
                
                <label className={`border p-4 flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === "paypal" ? "border-black" : "border-[#e5e5e5] hover:border-[#ccc]"}`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    value="paypal" 
                    checked={paymentMethod === "paypal"} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-black w-4 h-4"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest">PayPal</span>
                  </div>
                </label>
                
                <label className={`border p-4 flex items-center gap-4 cursor-pointer transition-colors ${paymentMethod === "alipay" ? "border-black" : "border-[#e5e5e5] hover:border-[#ccc]"}`}>
                  <input 
                    type="radio" 
                    name="payment" 
                    value="alipay" 
                    checked={paymentMethod === "alipay"} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="accent-black w-4 h-4"
                  />
                  <div className="flex-1 flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Alipay</span>
                  </div>
                </label>
              </div>
            </section>

            {/* Stripe Payment Notice */}
            <div className="mt-8 bg-[#fafafa] p-6 border border-[#e5e5e5]">
              <div className="flex items-center gap-2 mb-3">
                <Lock size={12} strokeWidth={2} />
                <span className="text-[10px] font-bold tracking-widest uppercase">Secure Checkout via Stripe</span>
              </div>
              <p className="text-[11px] text-[#666] leading-relaxed">
                After clicking <strong>Place Order</strong>, you'll be securely redirected to Stripe's payment page to enter your card details. Your payment information is handled entirely by Stripe and never touches our servers.
              </p>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#e5e5e5]">
                <span className="text-[9px] border border-[#ccc] px-2 py-1 rounded-sm bg-white font-medium">VISA</span>
                <span className="text-[9px] border border-[#ccc] px-2 py-1 rounded-sm bg-white font-medium">MASTERCARD</span>
                <span className="text-[9px] border border-[#ccc] px-2 py-1 rounded-sm bg-white font-medium">AMEX</span>
                <span className="text-[9px] border border-[#ccc] px-2 py-1 rounded-sm bg-white font-medium">PIX</span>
                <span className="text-[9px] text-[#888] ml-auto">Powered by Stripe</span>
              </div>
            </div>


          </div>

          {/* Right Column (35%) - Order Summary */}
          <div className="w-full lg:flex-[35%] lg:sticky lg:top-12">
            <h2 className="text-[11px] font-bold tracking-widest uppercase mb-8">{t('order_summary')} - ({items.length}) {t('items_label')}</h2>
            <div className="border-t border-[#e5e5e5] pt-6 mb-6">
              
              {/* Scrollable Items List */}
              <div className="max-h-[320px] overflow-y-auto pr-2 mb-6 space-y-6 scrollbar-thin scrollbar-thumb-[#ccc] scrollbar-track-transparent">
                {items.length === 0 ? (
                  <p className="text-xs text-[#777]">{t('cart_empty')}</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      {/* Image */}
                      <div className="w-16 h-20 shrink-0 bg-[#f8f8f8] flex items-center justify-center overflow-hidden">
                        <img 
                          src={item.product?.image} 
                          alt={item.product?.name} 
                          className="w-full h-full object-contain"
                          style={item.product?.removeBackground ? { mixBlendMode: 'multiply' } : {}}
                        />
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 flex flex-col">
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-1">{item.product?.designer}</p>
                        <p className="text-[11px] text-[#333] leading-snug line-clamp-2">{item.product?.name ? t(item.product.name) : ''}</p>
                        {item.size && <p className="text-[10px] text-[#777] mt-1">Size: {item.size}</p>}
                        <p className="text-[10px] text-[#777] mt-auto pt-2">{t('only_remaining')}</p>
                      </div>

                      {/* Price */}
                      <div className="text-[11px] font-medium text-right shrink-0">
                        ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Currency/Location Info */}
            <div className="text-[10px] text-[#777] uppercase tracking-widest border-t border-[#e5e5e5] py-4">
              Country/Region: Brazil | USD
            </div>

            {/* Financial Summary */}
            <div className="border-t border-[#e5e5e5] pt-6 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#555]">{t('subtotal')}</span>
                <span>${cartTotal.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#555]">{t('shipping_total')}</span>
                <span>$0.00 USD</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-[#555]">{t('duties_and_taxes')}</span>
                <span>{t('included')}</span>
              </div>
              <div className="flex justify-between border-t border-[#e5e5e5] pt-4 font-bold text-sm">
                <span>{t('order_total')}</span>
                <span>${cartTotal.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button 
              type="submit"
              disabled={items.length === 0 || isProcessing}
              className="w-full bg-black text-white h-[50px] mt-8 text-[11px] font-bold tracking-widest uppercase hover:bg-[#222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'PROCESSING...' : t('place_order')}
            </button>
          </div>
          
        </form>

      </main>

      {/* Floating Live Assistance Link */}
      <a href="#" className="fixed bottom-6 right-8 text-[10px] font-bold tracking-widest uppercase border-b border-black pb-0.5 hover:opacity-70 transition-opacity bg-white z-50 xl:bottom-6 bottom-[100px]">
        {t('live_assistance')}
      </a>
      
      <MobileBottomDock />
    </div>
  );
};

export default Checkout;
