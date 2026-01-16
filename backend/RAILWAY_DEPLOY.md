# Railway Deployment Guide

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will automatically detect the backend folder

### 3. Configure Environment Variables

In Railway dashboard, go to your project → **Variables** tab and add:

#### Required Variables:
```
DATABASE_URL=postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
NODE_TLS_REJECT_UNAUTHORIZED=0
PORT=3001
```

#### Optional Variables:
```
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
FRONTEND_URL=https://your-frontend.vercel.app
```

### 4. Configure Service Settings

1. Go to **Settings** → **Service** tab
2. Set **Root Directory** to: `backend`
3. Verify **Start Command**: `npm start`
4. Set **Health Check Path**: `/api/health`

### 5. Get Your Backend URL

After deployment, Railway will provide a URL like:
```
https://your-app.up.railway.app
```

Test it:
```
https://your-app.up.railway.app/api/health
```

### 6. Update Frontend (After Backend is Deployed)

In your frontend's Vercel environment variables, set:
```
VITE_API_URL=https://your-app.up.railway.app/api
```

## Troubleshooting

### Build Fails
- Check Railway logs for TypeScript errors
- Verify `tsconfig.json` is correct
- Ensure all dependencies are in `package.json`

### Database Connection Issues
- Verify `DATABASE_URL` is correct (URL-encoded password)
- Check Supabase database is accessible
- Verify `NODE_TLS_REJECT_UNAUTHORIZED=0` is set

### CORS Errors
- Add `FRONTEND_URL` environment variable
- Update CORS configuration in `server.ts`

### Health Check Fails
- Verify `/api/health` endpoint exists
- Check server is binding to `0.0.0.0`
- Ensure PORT is set correctly

## Railway CLI (Alternative)

If you prefer CLI:
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then set variables:
```bash
railway variables set DATABASE_URL="your-database-url"
railway variables set JWT_SECRET="your-secret"
# etc...
```

