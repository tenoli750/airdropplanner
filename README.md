# Crypto Airdrop Planner

A full-stack application for tracking and planning crypto airdrop tasks.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Supabase)
- **Auth**: JWT-based authentication

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase account

### Setup

1. **Backend**
```bash
cd backend
npm install
cp .env.example .env  # Edit with your credentials
npm run dev
```

2. **Frontend**
```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173

---

## 🚀 Deployment Guide

### Database (Already Done ✓)
Using Supabase cloud PostgreSQL - no additional setup needed.

### Option 1: Railway (Recommended for Backend)

1. Go to [railway.app](https://railway.app) and connect GitHub
2. Create new project → Deploy from GitHub repo
3. Select the `backend` folder as root
4. Add environment variables:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   JWT_SECRET=your-strong-secret-key
   NODE_ENV=production
   PORT=3001
   TELEGRAM_BOT_TOKEN=your-bot-token (optional)
   ```
5. Deploy - Railway auto-detects Node.js

### Option 2: Render (Free Tier Available)

1. Go to [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add environment variables (same as above)

### Frontend: Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Settings:
   - Root Directory: `frontend`
   - Framework: Vite
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```
5. Deploy

---

## Quick Deploy Commands

### Build for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Output in dist/ folder
```

### Environment Variables Checklist

**Backend (Required)**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens (use `openssl rand -base64 32`) |
| `NODE_ENV` | Set to `production` |

**Backend (Optional)**
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `TELEGRAM_BOT_TOKEN` | For Telegram bot integration |

**Frontend**
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Your backend API URL |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Supabase     │
│  (Vercel/CDN)   │     │ (Railway/Render)│     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
   React + Vite           Express + JWT
```

## Features

- 📋 Browse airdrop articles with categorized tasks
- ✅ Add tasks to personal plan (requires login)
- 🔄 Track daily/weekly/one-time tasks
- 🤖 Telegram bot integration for task management
- 👤 User authentication (register/login)
