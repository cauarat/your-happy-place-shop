import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { CheckCircle2 } from "lucide-react";
import { updateOrderStatus } from "@/lib/store";

const Success = () => {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    clearCart();
    
    // Check if there is an order ID returned from Stripe
    const orderId = searchParams.get('order_id');
    if (orderId) {
      updateOrderStatus(orderId, 'Paid');
    }
  }, [clearCart, searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black font-sans selection:bg-black selection:text-white items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6 py-12 text-center flex flex-col items-center">
        <CheckCircle2 size={48} className="text-black mb-6" strokeWidth={1.5} />
        <h1 className="text-xl font-bold tracking-widest uppercase mb-4">Payment Successful</h1>
        <p className="text-sm text-[#555] mb-10">
          Thank you for your order! Your payment was processed successfully. 
          We'll send you an email confirmation shortly.
        </p>
        <Link 
          to="/"
          className="bg-black text-white px-8 py-4 text-[11px] font-bold tracking-widest uppercase hover:bg-[#222] transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default Success;
