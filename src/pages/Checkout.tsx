import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const Checkout = () => {
  const { t } = useLanguage();
  const { items, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    toast.success("Order placed successfully!");
    clearCart();
    navigate("/");
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
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        
        <form onSubmit={handlePlaceOrder} className="flex flex-col lg:flex-row gap-16 xl:gap-24 items-start">
          
          {/* Left Column (65%) - Forms */}
          <div className="w-full lg:flex-[65%]">
            <h1 className="text-[10px] font-bold tracking-widest uppercase mb-8">Checkout</h1>
            
            <div className={dividerClasses} />

            {/* Shipping Address */}
            <section>
              <h2 className={sectionTitleClasses}>Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className={labelClasses}>First Name</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Last Name</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Street Address</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Company (Optional)</label>
                  <input type="text" className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>City</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>ZIP or Postal Code</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Country/Region</label>
                  <select className={inputClasses} required defaultValue="BR">
                    <option value="US">United States</option>
                    <option value="BR">Brazil</option>
                    <option value="UK">United Kingdom</option>
                    <option value="EU">Europe</option>
                    <option value="JP">Japan</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>State/Province</label>
                  <input type="text" required className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Phone</label>
                  <input type="tel" required className={inputClasses} />
                </div>
              </div>
            </section>

            <div className={dividerClasses} />

            {/* Shipping Method */}
            <section>
              <h2 className={sectionTitleClasses}>Shipping Method</h2>
              <p className="text-[11px] text-[#555] mb-6">Your order is eligible for free shipping.</p>
              
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
                  <p className="text-[11px] font-bold uppercase tracking-widest">Standard Shipping</p>
                  <p className="text-xs text-[#777] mt-1">3-5 business days</p>
                </div>
                <span className="text-xs font-medium">Free</span>
              </div>
            </section>

            <div className={dividerClasses} />

            {/* Payment Method */}
            <section>
              <h2 className={sectionTitleClasses}>Payment Method</h2>
              
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
                    <span className="text-[11px] font-bold uppercase tracking-widest">Credit / Debit Card</span>
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

            {/* Secure Payment Details (Only for Credit Card) */}
            {paymentMethod === "credit_card" && (
              <div className="mt-8 bg-[#fafafa] p-6 border border-[#e5e5e5]">
                <div className="flex items-center gap-2 mb-6">
                  <Lock size={12} strokeWidth={2} />
                  <span className="text-[10px] font-bold tracking-widest uppercase">Secure Payment</span>
                  <span className="text-[10px] text-[#777] ml-2 normal-case tracking-normal">All transactions are secure and encrypted.</span>
                </div>
                
                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  <div className="col-span-2">
                    <label className={labelClasses}>Card Number</label>
                    <input type="text" required placeholder="0000 0000 0000 0000" className={inputClasses} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClasses}>Name on Card</label>
                    <input type="text" required className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Expiration Date (MM/YY)</label>
                    <input type="text" required placeholder="MM/YY" className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Security Code (CVV)</label>
                    <input type="text" required placeholder="123" className={inputClasses} />
                  </div>
                </div>
              </div>
            )}
            
          </div>

          {/* Right Column (35%) - Order Summary */}
          <div className="w-full lg:flex-[35%] lg:sticky lg:top-12">
            <h2 className="text-[11px] font-bold tracking-widest uppercase mb-8">Order Summary - ({items.length}) Items</h2>
            <div className="border-t border-[#e5e5e5] pt-6 mb-6">
              
              {/* Scrollable Items List */}
              <div className="max-h-[320px] overflow-y-auto pr-2 mb-6 space-y-6 scrollbar-thin scrollbar-thumb-[#ccc] scrollbar-track-transparent">
                {items.length === 0 ? (
                  <p className="text-xs text-[#777]">Your cart is empty.</p>
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
                        <p className="text-[10px] text-[#777] mt-auto pt-2">Only 1 remaining</p>
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
                <span className="text-[#555]">Subtotal</span>
                <span>${cartTotal.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#555]">Shipping Total</span>
                <span>$0.00 USD</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-[#555]">Duties and Taxes</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between border-t border-[#e5e5e5] pt-4 font-bold text-sm">
                <span>Order Total</span>
                <span>${cartTotal.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button 
              type="submit"
              disabled={items.length === 0}
              className="w-full bg-black text-white h-[50px] mt-8 text-[11px] font-bold tracking-widest uppercase hover:bg-[#222] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Place Order
            </button>
          </div>
          
        </form>

      </main>

      {/* Floating Live Assistance Link */}
      <a href="#" className="fixed bottom-6 right-8 text-[10px] font-bold tracking-widest uppercase border-b border-black pb-0.5 hover:opacity-70 transition-opacity bg-white z-50">
        Live Assistance
      </a>
      
    </div>
  );
};

export default Checkout;
