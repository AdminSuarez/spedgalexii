# SpEdGalexii Deployment & Stripe Setup Guide

This file covers two tracks:

- **District self-host (recommended for pilots)** – simple Node + Python on the same box.
- **SpEdGalexii.com SaaS + Stripe** – optional if/when you run a public SaaS.

---

## 🚀 Recommended: District self-host (Node + Python on one box)

### 1. Provision a server

- A small Linux VM (e.g., 2 vCPU, 4 GB RAM) or comparable Mac/Windows machine.
- Ensure you can SSH/RDP in and install software.

### 2. Install dependencies

On the server:

```bash
sudo apt-get update            # or your OS equivalent
sudo apt-get install -y nodejs npm python3 python3-venv
```

Clone the repo:

```bash
cd /opt
git clone <your-git-url> spedgalexii
cd spedgalexii/AccommodationsAudit/galaxy-iep-accommodations
```

### 3. Set up the Python pipeline

From `AccommodationsAudit/` (one level up from the Next.js app):

```bash
cd ..
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # or your existing setup steps
```

Make sure these folders exist and are writable by the app user:

- `input/_CANONICAL/`
- `input/_REFERENCE/`
- `ieps/`
- `output/`
- `audit/`

### 4. Configure environment variables

In `galaxy-iep-accommodations/.env.local` (or your process manager/env config), set at minimum:

```env
GALEXII_AUTH_ENABLED=true
GALEXII_AUTH_SECRET=change-me-to-a-long-random-string
GALEXII_ADMIN_PASSWORD=some-strong-admin-password
GALEXII_CASE_MANAGER_PASSWORD=some-strong-case-manager-password

# Optional, for AI-powered features
OPENAI_API_KEY=sk-...
```

If you expose the app on a public URL, also set:

```env
NEXT_PUBLIC_APP_URL=https://your-district-domain
```

### 5. Build and run the Next.js app

From `galaxy-iep-accommodations/`:

```bash
npm install
npm run build
npm run start
```

By default this listens on port `3000`. For production you will typically:

- Run it under a process manager (pm2, systemd, supervisord).
- Put Nginx/Apache/your load balancer in front as a reverse proxy.

### 6. Verify with smoke tests

With the app running on the server, from `galaxy-iep-accommodations/` run:

```bash
SMOKE_BASE_URL="https://your-district-domain" npm run smoke
```

If it passes, the core API and preflight are reachable.

Then, sign in at `https://your-district-domain/login` with the admin or case-manager password and run one module end‑to‑end using your test exports.

### 7. Backups & data

At a minimum, set up regular backups (or snapshots) for:

- `output/` – generated summaries and narratives.
- Any config files you customize (`.env.local`, runbook variants, etc.).

You can re‑derive many outputs from canonical inputs, so prioritise backups of any folder that is hard to regenerate in your environment.

---

## 🚀 Deployment to SpEdGalexii.com (SaaS + Stripe)

> Use this path if you are running a public SaaS version with Stripe billing. District self‑hosted pilots can ignore this section.

### Option 1: Vercel (Recommended for Next.js SaaS)

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
