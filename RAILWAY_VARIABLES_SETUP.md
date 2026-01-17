# Railway Environment Variables Setup

## Quick Setup

### Option 1: Using Railway CLI (Recommended)

1. **Login to Railway** (if not already logged in):
   ```bash
   railway login
   ```

2. **Navigate to backend folder**:
   ```bash
   cd backend
   ```

3. **Link to your Railway project**:
   ```bash
   railway link
   ```
   Select your project from the list.

4. **Run the setup script**:
   ```bash
   ./set-railway-vars.sh
   ```

   Or set variables manually:
   ```bash
   railway variables set DATABASE_URL="postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres"
   railway variables set JWT_SECRET="99dd573f-092d-4ed6-a749-6cc48651046f"
   railway variables set NODE_ENV="production"
   railway variables set NODE_TLS_REJECT_UNAUTHORIZED="0"
   railway variables set PORT="3001"
   ```

### Option 2: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click on your **backend service**
4. Go to the **Variables** tab
5. Click **+ New Variable** for each:

#### Required Variables:

| Variable Name | Value |
|--------------|-------|
| `DATABASE_URL` | `postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres` |
| `JWT_SECRET` | `99dd573f-092d-4ed6-a749-6cc48651046f` |
| `NODE_ENV` | `production` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` |
| `PORT` | `3001` |

#### Optional Variables (set later if needed):

| Variable Name | Value |
|--------------|-------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token (if using Telegram bot) |
| `FRONTEND_URL` | Your frontend URL (after frontend is deployed) |

## Verify Variables

After setting variables, verify they're set correctly:

```bash
railway variables
```

Or check in Railway Dashboard → Your Service → Variables tab.

## What Each Variable Does

- **DATABASE_URL**: Connection string to your Supabase PostgreSQL database
- **JWT_SECRET**: Secret key for signing JWT authentication tokens
- **NODE_ENV**: Set to `production` for production environment
- **NODE_TLS_REJECT_UNAUTHORIZED**: Set to `0` to allow self-signed SSL certificates from Supabase (development mode)
- **PORT**: Port number for the server (Railway also sets this automatically)

## After Setting Variables

Railway will automatically redeploy your service when variables are added or updated. Check the deployment status in the Railway dashboard.

## Troubleshooting

If you get connection errors after setting variables:
1. Verify `DATABASE_URL` is correct (check for URL encoding, especially special characters in password)
2. Make sure all required variables are set
3. Check Railway logs: `railway logs`
4. Restart the service in Railway dashboard if needed

