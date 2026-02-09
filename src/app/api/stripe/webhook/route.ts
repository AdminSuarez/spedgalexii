import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// This is your Stripe webhook secret for verifying events
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // TODO: Provision access for the customer
      // 1. Get customer email: session.customer_email
      // 2. Get subscription ID: session.subscription
      // 3. Create/update user in your database
      // 4. Grant access to the appropriate tier
      
      console.log("✅ Checkout completed:", {
        sessionId: session.id,
        customerEmail: session.customer_email,
        subscriptionId: session.subscription,
      });
      
      // Example: Update your database
      // await db.user.update({
      //   where: { email: session.customer_email },
      //   data: { 
      //     subscriptionId: session.subscription,
      //     subscriptionStatus: 'active',
      //   },
      // });
      
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      
      // TODO: Update subscription status in your database
      console.log("📝 Subscription updated:", {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
      
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      
      // TODO: Revoke access when subscription is cancelled
      console.log("❌ Subscription cancelled:", {
        subscriptionId: subscription.id,
      });
      
      // Example: Update your database
      // await db.user.update({
      //   where: { subscriptionId: subscription.id },
      //   data: { 
      //     subscriptionStatus: 'cancelled',
      //   },
      // });
      
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Subscription renewed successfully
      console.log("💰 Payment succeeded:", {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
      });
      
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      
      // TODO: Notify customer of failed payment
      console.log("⚠️ Payment failed:", {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
      });
      
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
