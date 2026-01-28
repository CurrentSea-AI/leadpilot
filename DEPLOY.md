# 🚀 LeadPilot Deployment Guide

Get your SaaS live on Vercel in under 30 minutes.

## ⚡ Quick Overview

You need accounts for:
1. **Vercel** (hosting) - FREE
2. **Clerk** (auth) - FREE tier available
3. **OpenAI** (AI features) - Pay per use (~$0.10/audit)
4. **Stripe** (payments) - FREE until you charge
5. **Neon/PlanetScale** (database) - FREE tier available

---

## Step 1: Database (5 min)

SQLite won't work on Vercel. Switch to PostgreSQL:

### Option A: Neon (Recommended - FREE)
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project
4. Copy the connection string

### Option B: PlanetScale (Also FREE)
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up and create database
3. Get connection string

---

## Step 2: Clerk Auth (5 min)

1. Go to [clerk.com](https://clerk.com)
2. Click "Get Started Free"
3. Sign up with GitHub/Google
4. Create a new application
5. Choose "Next.js" as framework
6. Copy your keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## Step 3: OpenAI API (5 min)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Sign in
3. Go to API Keys → Create new key
4. Copy `OPENAI_API_KEY`
5. Add payment method (pay-as-you-go)
   - Costs: ~$0.05-0.15 per website audit

---

## Step 4: Stripe (10 min)

1. Go to [stripe.com](https://stripe.com)
2. Create account (no credit card needed)
3. Get API Keys:
   - Dashboard → Developers → API Keys
   - Copy `Secret key` → `STRIPE_SECRET_KEY`

4. Create Products:
   - Products → Add Product
   - **Pro Plan**: $29/month recurring
   - **Agency Plan**: $99/month recurring
   - Copy each Price ID → `STRIPE_PRO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`

5. Set up Webhook (after Vercel deploy):
   - Developers → Webhooks → Add endpoint
   - URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Deploy to Vercel (10 min)

### A. Push to GitHub
```bash
cd "/Users/keetahill/lead magnet AI Agent/medoffice-agent"
git init
git add .
git commit -m "Initial commit - LeadPilot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leadpilot.git
git push -u origin main
```

### B. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repo
4. Add Environment Variables (see below)
5. Click Deploy!

---

## 📋 All Environment Variables

Copy these to Vercel's Environment Variables section:

```
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"
CLERK_SECRET_KEY="sk_live_xxx"
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# OpenAI
OPENAI_API_KEY="sk-xxx"

# Stripe
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRO_PRICE_ID="price_xxx"
STRIPE_AGENCY_PRICE_ID="price_xxx"

# App URL (update after deploy)
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

---

## Step 6: Update Database Schema

After first deploy, run migrations:

```bash
# In Vercel dashboard, go to your project
# Settings → Functions → Open Console
# Or use Vercel CLI:
npx vercel env pull .env.local
npx prisma db push
```

---

## Step 7: Configure Clerk Webhooks

1. In Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`

---

## Step 8: Test Everything

1. Visit your Vercel URL
2. Click "Get Started" to sign up
3. Try the Auto Prospector
4. Test Stripe checkout

---

## 💰 Revenue Streams

Your app now has:
- **Subscriptions**: Free/Pro($29)/Agency($99)
- **Ads**: Multiple networks ready
- **Affiliates**: 30% recurring program
- **Direct Sponsorships**: /advertise page

---

## 🔧 Troubleshooting

### "Prisma Client error"
Run `npx prisma generate` before deploy

### "Clerk auth error"  
Check middleware config and Clerk keys

### "Stripe webhook failing"
Verify webhook secret matches

### "AI audit not working"
Check OpenAI API key has credits

---

## ✅ Launch Checklist

- [ ] Database connected (Neon/PlanetScale)
- [ ] Clerk auth working
- [ ] OpenAI key with credits
- [ ] Stripe products created
- [ ] Stripe webhook configured
- [ ] Custom domain (optional)
- [ ] Test full user flow
- [ ] First customer! 🎉

