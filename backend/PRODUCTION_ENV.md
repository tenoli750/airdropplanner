# Production Environment Variables for Railway

## Required Environment Variables

Add these in Railway Dashboard → Your Service → Variables Tab:

### Database
```
DATABASE_URL=postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres
```

### JWT Secret (Production Token)
```
JWT_SECRET=99dd573f-092d-4ed6-a749-6cc48651046f
```

### Node Environment
```
NODE_ENV=production
```

### SSL Configuration (for Supabase)
```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Port (Railway sets this automatically)
```
PORT=3001
```

### Optional: Telegram Bot
```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
```

### Optional: Frontend URL (set after frontend is deployed)
```
FRONTEND_URL=https://your-frontend.vercel.app
```

## How to Set in Railway

1. Go to your Railway project
2. Click on your service
3. Go to the **Variables** tab
4. Click **+ New Variable**
5. Add each variable name and value
6. Railway will automatically redeploy when variables are added/updated

## Security Notes

- Never commit `.env` files to Git
- JWT_SECRET should be a strong random string (UUID is acceptable)
- Keep your DATABASE_URL secure
- The token `99dd573f-092d-4ed6-a749-6cc48651046f` is now your production JWT_SECRET

