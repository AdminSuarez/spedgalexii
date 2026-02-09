# SpEdGalexii Deployment & Stripe Setup Guide

## 🚀 Deployment to SpEdGalexii.com

### Option 1: Vercel (Recommended for Next.js)

1. **Push to GitHub** (if not already):
   ```bash
   cd galaxy-iep-accommodations
   git add .
   git commit -m "Add Stripe subscriptions"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo
   - Vercel auto-detects Next.js settings

3. **Add Environment Variables** in Vercel Dashboard:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL` = `https://spedgalexii.com`

4. **Connect Your Domain**:
   - In Vercel project settings → Domains
   - Add `spedgalexii.com`
   - Update DNS at your registrar:
     - **A Record**: `76.76.21.21`
     - **CNAME**: `cname.vercel-dns.com` (for www)

---

## 💳 Stripe Setup

### Step 1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification

### Step 2: Create Products & Prices

In Stripe Dashboard → Products → Add Product:

**Product 1: Per IEP Monthly**
- Name: "Per IEP Monthly"
- Price: $9.99/month (recurring)
- Copy the Price ID (starts with `price_`)

**Product 2: Per IEP Yearly**
- Name: "Per IEP Yearly"  
- Price: $95.88/year (recurring)
- Copy the Price ID

**Product 3: School Year Bundle**
- Name: "School Year Bundle"
- Price: $199.99/year (recurring)
- Copy the Price ID

### Step 3: Update Price IDs in Code

Edit `src/app/pricing/page.tsx` and replace the placeholder `priceId` values:

```typescript
const PLANS: PlanTier[] = [
  {
    id: "iep-monthly",
    // ...
    priceId: "price_1XXXXXXXXX", // Your actual Stripe Price ID
  },
  // ... etc
];
```

### Step 4: Set Up Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://spedgalexii.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the Webhook Signing Secret (`whsec_...`)
6. Add to environment variables as `STRIPE_WEBHOOK_SECRET`

### Step 5: Test Mode vs Live Mode

- **Test Mode**: Use `sk_test_` and `pk_test_` keys
- **Live Mode**: Switch to `sk_live_` and `pk_live_` keys when ready

Test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

---

## 🔐 Environment Variables Summary

Create `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_XXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (Vercel), set:
- `NEXT_PUBLIC_APP_URL=https://spedgalexii.com`

---

## 📁 Files Created

```
src/
├── app/
│   ├── pricing/
│   │   └── page.tsx           # Pricing page with 3 tiers
│   ├── subscription/
│   │   └── success/
│   │       └── page.tsx       # Post-checkout success page
│   └── api/
│       └── stripe/
│           ├── checkout/
│           │   └── route.ts   # Creates Stripe Checkout sessions
│           └── webhook/
│               └── route.ts   # Handles Stripe webhook events
├── .env.example               # Template for environment variables
```

---

## 🔮 Next Steps (Future Enhancements)

1. **Add Authentication** (NextAuth, Clerk, or Supabase Auth)
   - Users need to log in to access their data
   - Link Stripe subscription to user account

2. **Add Database** (Supabase, PlanetScale, or Prisma + PostgreSQL)
   - Store user subscriptions
   - Save tracker data per user
   - Track IEP limits per plan

3. **Customer Portal**
   - Let users manage their subscription
   - Add: `stripe.billingPortal.sessions.create()`

4. **Usage Metering** (for per-IEP plans)
   - Track number of students per user
   - Enforce limits based on plan

---

## 🧪 Local Testing

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with your Stripe test keys

3. Run dev server:
   ```bash
   npm run dev
   ```

4. Test webhook locally with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

5. Visit `http://localhost:3000/pricing` and test checkout flow
