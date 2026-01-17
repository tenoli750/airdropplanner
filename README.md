# Crypto Airdrop Planner

A full-stack web application for tracking, planning, and managing cryptocurrency airdrop activities across multiple blockchain projects. Features a gamified betting system, calendar tracking, and Telegram integration.

## Features

### Core Features
- **Airdrop Articles** - Browse comprehensive guides organized by project (LayerZero, zkSync, Scroll, Linea, Base, etc.)
- **Personal Planning** - Add tasks to your plan and track completion with a points system
- **Calendar View** - Visualize completed tasks in compact week/month calendar views
- **Betting System** - Daily crypto price prediction game with live prices and 4x payout multiplier
- **Leaderboard** - Global ranking system with podium display for top 3 users
- **Telegram Integration** - Link your Telegram account for push notifications
- **Admin Dashboard** - Manage articles and tasks (admin users only)

### Points System
| Task Type | Points |
|-----------|--------|
| Daily | 100 |
| Weekly | 500 |
| One-time | 1,000 |

### Betting System
- Bet on which cryptocurrency (BTC, ETH, SOL, DOGE) will have the highest daily price change
- Maximum bet: 1,000 points per race
- Win multiplier: 4x your stake
- Live price updates every 10 seconds via Binance API
- Daily race settlement at 00:00 UTC

---

## Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express 5
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT (jsonwebtoken)
- **Scheduling**: node-cron
- **Telegram**: node-telegram-bot-api

---

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ArticlesPage.tsx    # Browse airdrop guides
│   │   │   ├── PlanPage.tsx        # Personal task management
│   │   │   ├── CalendarPage.tsx    # Week/month calendar view
│   │   │   ├── BettingPage.tsx     # Crypto betting game
│   │   │   ├── LeaderboardPage.tsx # Global rankings
│   │   │   ├── ProfilePage.tsx     # User settings & Telegram
│   │   │   ├── AdminPage.tsx       # Content management
│   │   │   ├── LoginPage.tsx       # User login
│   │   │   └── RegisterPage.tsx    # User registration
│   │   ├── components/             # Reusable UI components
│   │   ├── services/api.ts         # Axios API client
│   │   ├── types/index.ts          # TypeScript definitions
│   │   ├── App.tsx                 # Main router & layout
│   │   └── index.css               # Tailwind + custom styles
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── articleController.ts
│   │   │   ├── planController.ts
│   │   │   ├── bettingController.ts
│   │   │   ├── alarmController.ts
│   │   │   └── adminController.ts
│   │   ├── routes/                 # API endpoint definitions
│   │   ├── db/connection.ts        # Database pool & schema
│   │   ├── services/
│   │   │   ├── telegramBot.ts      # Telegram bot service
│   │   │   └── cryptoService.ts    # Binance price API
│   │   ├── jobs/                   # Scheduled tasks
│   │   └── server.ts               # Express entry point
│   └── package.json
│
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js 20.x
- npm >= 10.0.0
- PostgreSQL database (or Supabase account)

### Backend Setup

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key
PORT=3001
TELEGRAM_BOT_TOKEN=your-telegram-bot-token  # optional
```

Run the backend:
```bash
# Development (with hot reload)
npm run dev

# Seed sample data
npm run seed

# Production build
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=http://localhost:3001/api
```

Run the frontend:
```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

### Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login (returns JWT) |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/telegram/generate-code` | Generate Telegram link code |
| DELETE | `/api/auth/telegram/unlink` | Unlink Telegram account |

### Articles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles` | Get all articles |
| GET | `/api/articles/:id` | Get article by ID |
| GET | `/api/articles/:id/tasks` | Get tasks for article |

### User Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans` | Get user's plan |
| GET | `/api/plans/task-ids` | Get task IDs in plan |
| GET | `/api/plans/calendar` | Get calendar data |
| GET | `/api/plans/stats` | Get user statistics |
| POST | `/api/plans` | Add task to plan |
| DELETE | `/api/plans/:taskId` | Remove task from plan |
| POST | `/api/plans/:taskId/complete` | Complete task with cost |
| POST | `/api/plans/:taskId/uncomplete` | Mark task incomplete |

### Betting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/betting/data` | Get races & betting data |
| POST | `/api/betting/place-bet` | Place a bet (coin_id, stake) |
| GET | `/api/betting/leaderboard` | Get global leaderboard |
| GET | `/api/betting/balance` | Get user's point balance |

### Alarms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alarm/settings` | Get alarm settings |
| PUT | `/api/alarm/settings` | Update alarm settings |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/articles` | Create article |
| PUT | `/api/admin/articles/:id` | Update article |
| DELETE | `/api/admin/articles/:id` | Delete article |
| POST | `/api/admin/tasks` | Create task |
| PUT | `/api/admin/tasks/:id` | Update task |
| DELETE | `/api/admin/tasks/:id` | Delete task |

---

## Database Schema

### Users & Authentication
```sql
users
├── id (UUID PK)
├── username (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── total_points (INTEGER)
├── is_admin (BOOLEAN)
└── created_at (TIMESTAMP)
```

### Content
```sql
articles
├── id (UUID PK)
├── title (VARCHAR)
├── description (TEXT)
├── project_name (VARCHAR)
└── created_at (TIMESTAMP)

tasks
├── id (UUID PK)
├── article_id (UUID FK)
├── title (VARCHAR)
├── description (TEXT)
├── frequency ('daily'|'weekly'|'one-time')
├── link_url (VARCHAR)
└── created_at (TIMESTAMP)
```

### User Plans
```sql
user_plans
├── id (UUID PK)
├── user_id (UUID FK)
├── task_id (UUID FK)
├── added_at (TIMESTAMP)
├── completed (BOOLEAN)
├── completed_at (TIMESTAMP)
└── cost (NUMERIC)
```

### Betting
```sql
betting_bets
├── id (UUID PK)
├── user_id (UUID FK)
├── race_date (DATE)
├── coin_id (VARCHAR)
├── stake (INTEGER)
├── payout (INTEGER)
├── status ('pending'|'won'|'lost')
└── created_at (TIMESTAMP)
```

### Telegram
```sql
telegram_links
├── id (UUID PK)
├── user_id (UUID FK)
├── telegram_id (BIGINT)
├── telegram_username (VARCHAR)
└── linked_at (TIMESTAMP)

telegram_link_codes
├── id (UUID PK)
├── user_id (UUID FK)
├── code (VARCHAR)
├── expires_at (TIMESTAMP)
└── used (BOOLEAN)
```

---

## Deployment

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│    Supabase     │
│  (Vercel/CDN)   │     │ (Railway/Render)│     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
   React + Vite           Express + JWT
```

### Recommended Platforms
| Service | Platform | Tier |
|---------|----------|------|
| Frontend | Vercel, Netlify | Free |
| Backend | Railway, Render | Free/Paid |
| Database | Supabase | Free |

### Backend Deployment (Railway)
1. Go to [railway.app](https://railway.app) and connect GitHub
2. Create new project → Deploy from GitHub repo
3. Set root directory to `backend`
4. Add environment variables
5. Deploy

### Frontend Deployment (Vercel)
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set root directory to `frontend`
4. Add `VITE_API_URL` environment variable
5. Deploy

---

## Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | `production` or `development` | No |
| `TELEGRAM_BOT_TOKEN` | Telegram bot API token | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

---

## Mobile Support

The application is fully responsive with:
- Compact horizontal week/month calendar views
- Bottom navigation bar for quick access
- Slide-in hamburger menu
- Touch-friendly betting interface (min 44px touch targets)
- Safe area support for notched devices

---

## License

All rights reserved.

---

Built with React, Express, TypeScript, and PostgreSQL
