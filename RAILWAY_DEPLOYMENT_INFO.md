# Railway Deployment Information

## Backend URL
```
https://airdropplanner-production.up.railway.app
```

## Health Check Endpoint
```
https://airdropplanner-production.up.railway.app/api/health
```

## API Base URL
```
https://airdropplanner-production.up.railway.app/api
```

## Frontend Environment Variable

If deploying frontend to Vercel (or any other platform), set this environment variable:

```
VITE_API_URL=https://airdropplanner-production.up.railway.app/api
```

## Available API Endpoints

### Health Check
- **GET** `/api/health` - Check server status

### Articles
- **GET** `/api/articles` - Get all articles
- **GET** `/api/articles/:id` - Get article by ID

### Authentication
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/profile` - Get user profile
- **GET** `/api/auth/telegram-status` - Get Telegram link status
- **POST** `/api/auth/telegram-link-code` - Generate Telegram link code
- **DELETE** `/api/auth/telegram-link` - Unlink Telegram

### User Plans
- **GET** `/api/plans` - Get user's plan
- **POST** `/api/plans` - Add task to plan
- **DELETE** `/api/plans/:id` - Remove task from plan
- **PUT** `/api/plans/:id/complete` - Complete task
- **PUT** `/api/plans/:id/uncomplete` - Uncomplete task
- **GET** `/api/plans/calendar?year=YYYY&month=MM` - Get calendar data
- **GET** `/api/plans/stats` - Get user stats
- **GET** `/api/plans/point-values` - Get point values

### Alarm Settings
- **GET** `/api/alarm/settings` - Get alarm settings
- **PUT** `/api/alarm/settings` - Update alarm settings

### Betting Game
- **GET** `/api/betting/data` - Get betting data (active race, betting race, history)
- **POST** `/api/betting/place-bet` - Place a bet
- **GET** `/api/betting/balance` - Get user balance
- **GET** `/api/betting/leaderboard` - Get leaderboard

### Admin (Admin only)
- **GET** `/api/admin/articles` - Get all articles (admin)
- **POST** `/api/admin/articles` - Create article (admin)
- **PUT** `/api/admin/articles/:id` - Update article (admin)
- **DELETE** `/api/admin/articles/:id` - Delete article (admin)
- **POST** `/api/admin/articles/:id/tasks` - Add task to article (admin)

## Testing

### Test Health Check
```bash
curl https://airdropplanner-production.up.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-17T00:00:00.000Z"
}
```

## Railway CLI Commands

```bash
cd backend

# View logs
railway logs --follow

# Check status
railway status

# Open in browser
railway open

# View variables
railway variables

# Update variables
railway variables set VARIABLE_NAME="value"
```

## Database

- **Provider**: Supabase (PostgreSQL)
- **Connection**: Using pooler connection string (IPv4)
- **SSL**: Allowing self-signed certificates (`NODE_TLS_REJECT_UNAUTHORIZED=0`)

## Environment Variables (in Railway)

- `DATABASE_URL` - Supabase pooler connection string
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Set to `production`
- `NODE_TLS_REJECT_UNAUTHORIZED` - Set to `0` (for Supabase SSL)
- `PORT` - Automatically set by Railway
- `TELEGRAM_BOT_TOKEN` - (Optional) For Telegram bot
- `FRONTEND_URL` - (Optional) Frontend URL for CORS

