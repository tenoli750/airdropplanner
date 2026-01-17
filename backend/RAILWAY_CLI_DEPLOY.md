# Railway CLI Deployment Guide

## Step 1: Login to Railway

Run this command in your terminal (it will open a browser):

```bash
railway login
```

This will:
- Open your browser
- Ask you to authorize Railway CLI
- Return to terminal when complete

## Step 2: Navigate to Backend Folder

```bash
cd backend
```

## Step 3: Link to Existing Project (if you already created one in dashboard)

If you already have a Railway project:
```bash
railway link
```

Then select your project from the list.

## Step 4: OR Create New Project

If you don't have a project yet:
```bash
railway init
```

This will:
- Create a new Railway project
- Ask for project name (use: `airdropplanner-backend`)
- Link your local folder to the project

## Step 5: Set Root Directory (Important!)

Make sure Railway knows to use this folder as root:
```bash
railway variables set RAILWAY_PROJECT_PATH=.
```

Or it should auto-detect since we're in the backend folder.

## Step 6: Set Environment Variables

Set each variable:

```bash
# Database
railway variables set DATABASE_URL="postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres"

# JWT Secret
railway variables set JWT_SECRET="99dd573f-092d-4ed6-a749-6cc48651046f"

# Node Environment
railway variables set NODE_ENV="production"

# SSL Config
railway variables set NODE_TLS_REJECT_UNAUTHORIZED="0"

# Port (Railway sets this automatically, but can set explicitly)
railway variables set PORT="3001"
```

Optional:
```bash
# Telegram Bot (if using)
railway variables set TELEGRAM_BOT_TOKEN="your-token"

# Frontend URL (after frontend is deployed)
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
```

## Step 7: Deploy

```bash
railway up
```

This will:
- Build your application
- Deploy to Railway
- Show you the deployment URL

## Step 8: Check Status

```bash
railway status
```

## Step 9: View Logs

```bash
railway logs
```

Or follow logs in real-time:
```bash
railway logs --follow
```

## Step 10: Open in Browser

```bash
railway open
```

## Useful Commands

```bash
# View all variables
railway variables

# Update a variable
railway variables set VARIABLE_NAME="value"

# Remove a variable
railway variables unset VARIABLE_NAME

# View service info
railway service

# View deployments
railway deployments

# Get deployment URL
railway domain
```

## Troubleshooting

If build fails:
```bash
# Check logs
railway logs

# Check build logs
railway logs --deployment
```

If you need to restart:
```bash
railway restart
```

