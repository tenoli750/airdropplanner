# Deploy to Railway - Quick Guide

## Option 1: Auto-Deploy from GitHub (Recommended)

If your Railway project is already connected to GitHub:

1. ✅ **Code is already pushed** - Latest commits are on GitHub
2. Railway will **automatically deploy** when it detects changes
3. Check deployment status: Go to [railway.app](https://railway.app) → Your Project → Deployments

## Option 2: Manual Deploy via Railway CLI

### Step 1: Login (if not already logged in)
```bash
railway login
```

### Step 2: Link to Railway Project
```bash
cd backend
railway link
```
Select your Railway project from the list.

### Step 3: Deploy
```bash
railway up
```

This will:
- Build your application
- Deploy to Railway
- Show you the deployment URL

### Step 4: Check Status
```bash
railway status
railway logs --follow
```

## Important: Update DATABASE_URL First!

Before deploying, make sure to update `DATABASE_URL` in Railway to use the **pooler connection string**:

```
postgresql://postgres.dfwcemqhritblsvoicem:rnjswoghd1%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

This fixes the IPv6 connectivity issue.

### Update DATABASE_URL in Railway Dashboard:
1. Go to [railway.app](https://railway.app)
2. Your Project → Backend Service → Variables
3. Edit `DATABASE_URL` with the pooler string above
4. Railway will auto-redeploy

## Verify Deployment

After deployment:
1. Check logs: `railway logs --follow`
2. Test health endpoint: `https://your-app.up.railway.app/api/health`
3. Look for:
   - ✅ `Database URL detected: ...`
   - ✅ `Connected to Supabase database`
   - ✅ `Supabase connection verified`
   - ✅ `Server running on port [PORT]`

## Troubleshooting

- **Build fails**: Check `railway logs` for TypeScript errors
- **Connection errors**: Verify `DATABASE_URL` uses pooler connection string
- **Port issues**: Railway sets `PORT` automatically - don't override it

