# Deploy Frontend to Vercel

## Quick Deploy via Vercel CLI

### 1. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
cd frontend
vercel login
```

### 3. Deploy to Vercel
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No** (or Yes if you have one)
- What's your project's name? `airdropplanner-frontend` (or any name)
- In which directory is your code located? `./`
- Want to override settings? **No** (defaults should work for Vite)

### 4. Set Environment Variable

After deployment, set the API URL:
```bash
vercel env add VITE_API_URL production
# Enter: https://airdropplanner-production.up.railway.app/api
```

Or via Vercel Dashboard:
1. Go to [vercel.com](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://airdropplanner-production.up.railway.app/api`
   - **Environment**: Production (and Preview if needed)

### 5. Redeploy
```bash
vercel --prod
```

Or trigger redeploy from Vercel Dashboard.

## Alternative: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import from GitHub (if your repo is on GitHub)
4. Or upload the `frontend` folder directly
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if deploying from repo root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   - `VITE_API_URL` = `https://airdropplanner-production.up.railway.app/api`
7. Click **Deploy**

## Vercel Configuration

The `vercel.json` is already configured:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This ensures React Router works correctly with Vercel's routing.

## After Deployment

Your frontend will be available at:
```
https://your-project-name.vercel.app
```

## Environment Variables

Make sure to set in Vercel:
- `VITE_API_URL` = `https://airdropplanner-production.up.railway.app/api`

This tells the frontend where to find your Railway backend.

