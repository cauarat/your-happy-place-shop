import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is missing from environment variables");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const body = await req.json();
    const { items, orderId } = body;

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Determine the site URL for redirects
    const SITE_URL = Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:8081";

    // Format items for Stripe Checkout
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.name || "Unknown Item",
          description: `${item.product.designer || ""} | ${item.product.category || ""}`.trim() || undefined,
          // Only include image URLs that are publicly accessible
          ...(item.product.image && item.product.image.startsWith("http")
            ? { images: [item.product.image] }
            : {}),
        },
        unit_amount: Math.round((item.product.price || 0) * 100), // Stripe expects cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      client_reference_id: orderId,
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId || ""}`,
      cancel_url: `${SITE_URL}/checkout`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
