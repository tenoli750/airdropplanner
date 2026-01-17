# Fix Stuck Railway Deployment

## Problem
Deployment gets stuck at "Taking a snapshot of the code..." because Railway CLI is trying to upload files instead of using Git.

## Solution: Use Git-Based Deployment (Dashboard)

### Step 1: Disconnect and Reconnect to Git

1. Go to Railway Dashboard: https://railway.com/project/a29ca1ec-f9d1-4c61-9d08-60b5fd385672
2. Click on your service: **airdropplanner**
3. Go to **Settings** tab
4. Scroll to **Source** section
5. If connected to Git, you should see your GitHub repo
6. If not connected or showing errors, click **Connect to GitHub**
7. Select repository: **tenoli750/airdropplanner**

### Step 2: Verify Root Directory

In **Settings** tab:
1. Find **Root Directory**
2. Make sure it's set to: `backend` (without leading slash)
3. Click **Save**

### Step 3: Delete Stuck Deployments

1. Go to **Deployments** tab
2. Find any deployments with status "Building" or stuck
3. Click the three dots (...) → **Delete** (if available)
4. Or wait for them to timeout

### Step 4: Trigger Fresh Deployment

**Option A: Automatic (Recommended)**
- Railway will auto-deploy when you push to GitHub
- Push a small commit to trigger:
  ```bash
  git commit --allow-empty -m "Trigger Railway deployment"
  git push origin main
  ```

**Option B: Manual Redeploy**
1. In Railway Dashboard → **Deployments** tab
2. Click **Redeploy** or **Deploy Latest**
3. Make sure it's deploying from Git, not file upload

### Step 5: Verify Deployment Source

When you trigger deployment, check the logs:
- Should say: "Cloning from GitHub..." or "Fetching from Git..."
- Should NOT say: "Taking a snapshot..." or "Uploading files..."

## Why This Happens

- **CLI `railway up`** tries to upload files directly (slow, can timeout)
- **Git deployment** clones from GitHub (fast, reliable)
- Railway should use Git since your repo is connected

## Prevent Future Issues

1. **Always use Git deployment** (connect repo in Railway settings)
2. **Set Root Directory** to `backend` in Settings
3. **Avoid `railway up`** if Git is connected (use dashboard or git push)
4. **Monitor dashboard** instead of CLI for deployment status

## Alternative: Deploy from Subfolder

If Railway keeps trying to upload:
1. Create a separate Railway project just for backend
2. Or use Railway's GitHub integration (recommended)

