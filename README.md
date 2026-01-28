# LeadPilot 🚀

**AI-Powered Prospecting & Outreach Automation**

Find businesses, audit their websites, and generate personalized outreach — all on autopilot.

![LeadPilot](https://via.placeholder.com/800x400?text=LeadPilot+Dashboard)

## ✨ Features

### 🎯 Multi-Niche Support
Works for any service business:
- 🏥 Medical Offices
- 🦷 Dental Practices
- ⚖️ Law Firms
- 🍽️ Restaurants
- 💪 Gyms & Fitness
- 💇 Salons & Spas
- 🏠 Real Estate
- 🔧 Home Services
- And more...

### 🤖 AI-Powered Automation
- **Auto Prospecting**: Enter a city + niche, get audited leads
- **Vision AI Audits**: GPT-4o analyzes actual screenshots
- **Design & SEO Scoring**: Industry-specific criteria (0-100)
- **Personalized Emails**: AI writes custom outreach based on findings

### 📊 Shareable Reports
- Beautiful, branded audit reports
- Unique shareable links for each prospect
- Track when reports are viewed

### 💳 SaaS Subscriptions
- Clerk authentication
- Stripe billing integration
- Three tiers: Free, Pro, Agency
- Usage tracking and limits

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Fill in your API keys:
- **OpenAI**: For AI audits and email generation
- **Clerk**: For authentication
- **Stripe**: For billing (optional)

### 3. Initialize Database
```bash
npx prisma db push
npx prisma generate
```

### 4. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
app/
├── page.tsx              # Marketing landing page
├── layout.tsx            # Root layout with nav
├── dashboard/            # User dashboard
├── auto/                 # Auto prospecting page
├── assistant/            # Single URL processing
├── leads/                # Lead management
├── billing/              # Subscription management
├── report/[publicId]/    # Shareable reports
├── (auth)/               # Clerk auth pages
└── api/
    ├── ai/               # AI endpoints
    │   ├── find/         # Auto-find businesses
    │   ├── audit/        # Vision AI audit
    │   ├── draft/        # Email generation
    │   └── batch/        # Batch processing
    ├── billing/          # Stripe checkout/portal
    ├── leads/            # Lead CRUD
    ├── report/           # Report generation
    ├── user/             # User data
    └── webhooks/         # Stripe webhooks
```

## 💰 Pricing Tiers

| Feature | Free | Pro ($29/mo) | Agency ($99/mo) |
|---------|------|--------------|-----------------|
| Prospects/month | 5 | 100 | Unlimited |
| Design Audit | ✅ | ✅ | ✅ |
| SEO Audit | ❌ | ✅ | ✅ |
| AI Emails | ❌ | ✅ | ✅ |
| Branded Reports | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ |

## 🔧 Setup Guide

### Clerk (Authentication)
1. Create account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy API keys to `.env.local`
4. Configure redirect URLs

### Stripe (Billing)
1. Create account at [stripe.com](https://stripe.com)
2. Create two Products:
   - Pro ($29/mo)
   - Agency ($99/mo)
3. Copy Price IDs and API keys to `.env.local`
4. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Select events: `checkout.session.completed`, `customer.subscription.*`

### OpenAI (AI Features)
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Ensure you have access to GPT-4o
3. Add key to `.env.local`

## 🎨 Design System

LeadPilot uses a custom dark theme with:
- **Primary**: Indigo gradient (#6366f1 → #8b5cf6)
- **Background**: Deep navy (#0f0f23)
- **Cards**: Semi-transparent with subtle borders
- **Accents**: Cyan for actions, gradient text for emphasis

## 📝 API Usage

### Find Prospects
```bash
POST /api/ai/find
{
  "city": "Austin",
  "state": "TX",
  "niche": "dental_practice",
  "limit": 5
}
```

### Run AI Audit
```bash
POST /api/ai/audit
{
  "url": "https://example-dental.com",
  "niche": "dental_practice"
}
```

### Generate Report
```bash
POST /api/report
{
  "leadId": "clxxx..."
}
```

## 🚧 Roadmap

- [ ] Team accounts for Agency tier
- [ ] White-label report branding
- [ ] Email sending integration (SendGrid/Resend)
- [ ] CRM integrations (HubSpot, Pipedrive)
- [ ] Chrome extension for quick audits
- [ ] Mobile app

## 📄 License

MIT License - use it for your business!

---

Built with ❤️ using Next.js, Prisma, Clerk, Stripe, and OpenAI
