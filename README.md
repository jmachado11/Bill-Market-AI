# 📊 Bill Market – Predictive Legislative Intelligence for Investors

**Bill Market** is an AI-powered platform that analyzes proposed U.S. legislation to forecast both:

- The **likelihood a bill will pass**, and  
- The **publicly traded stocks** most likely to be impacted by that bill — including **directional effects** ("up" or "down") and **confidence levels**

By bridging legislative data with financial insight, Bill Market empowers investors to stay ahead of policy-driven market shifts.

---

## 🚀 Features

- 🔍 Real-time bill ingestion using the LegiScan API  
- 🧠 AI-powered analysis with Google Gemini  
- 📈 Predicts stock movement and impact confidence per bill  
- 📅 Estimates legislative decision timelines  
- 📊 Stores structured analysis in a Supabase-backed database  
- 🌐 Live deployed frontend via Vercel

---

## 🛠️ Tech Stack

- **Frontend:** Vite + React + TailwindCSS  
- **Backend:** Deno-based Edge Functions (via Supabase)  
- **Database:** Supabase  
- **APIs:**
  - **LegiScan API** – for legislative data
  - **Gemini API** – for AI-based text interpretation
- **Hosting:** Vercel

---

## 📁 Project Structure

bill-market/
├── edge-functions/ # Deno-based Gemini analysis logic
├── src/ # React frontend (Vite)
├── public/ # Static files
├── supabase/ # Schema and migrations
├── .env.local # Local environment variables (excluded from repo)
└── README.md

yaml
Copy
Edit

---

## 🔐 Environment Variables

Make sure to define the following variables in your environment (e.g. `.env.local` for local dev, or via Vercel dashboard in production):

```env
# LegiScan API
VITE_LEGISCAN_API_KEY=your_legiscan_api_key

# Gemini AI (Google)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Supabase Project
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Do not expose any secret or service-level keys in the frontend. Use serverless functions for sensitive operations.

## 🚀 Deployment
Push the project to GitHub

Go to https://vercel.com

Import the repository and configure environment variables

Deploy

Vercel will automatically redeploy on every push to main.

## 👥 Credits
Bill Market is a collaborative project built by:

James Machado

Sameen Majid

Dmitry Raspopin

All rights reserved. This is a closed-source project not open to public contribution.
