# Deploy Using Railway Dashboard (More Reliable)

Since Railway CLI is experiencing timeouts, use the Dashboard instead:

## Step 1: Open Railway Dashboard

Go to: https://railway.app

## Step 2: Navigate to Your Project

1. Click on your project: **chic-nourishment**
2. Click on your service: **airdropplanner**

## Step 3: Set Environment Variables

1. Click on the **Variables** tab
2. Click **+ New Variable** for each:

### Required Variables:

**Name:** `DATABASE_URL`
**Value:** 
```
postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres
```

**Name:** `JWT_SECRET`
**Value:**
```
99dd573f-092d-4ed6-a749-6cc48651046f
```

**Name:** `NODE_ENV`
**Value:**
```
production
```

**Name:** `NODE_TLS_REJECT_UNAUTHORIZED`
**Value:**
```
0
```

**Name:** `PORT`
**Value:**
```
3001
```

## Step 4: Verify Root Directory

1. Go to **Settings** tab
2. Check **Root Directory** is set to: `/backend` or `backend`
3. If not, set it and save

## Step 5: Trigger Deployment

After adding variables, Railway will automatically:
- Redeploy your service
- Use the new environment variables
- Show build logs in the **Deployments** tab

## Step 6: Check Deployment

1. Go to **Deployments** tab to see build progress
2. Wait for build to complete (2-4 minutes)
3. Click on the deployment to see logs
4. Your service will be live at the URL shown

## Step 7: Test Health Endpoint

After deployment, visit:
```
https://your-service.up.railway.app/api/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

## Troubleshooting

If variables aren't working:
- Make sure you're in the correct service (airdropplanner)
- Check variables are saved (refresh page)
- Check deployment logs for errors

