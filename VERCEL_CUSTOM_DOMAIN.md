# Setting Up Custom Domain: phplanner.vercel.app

## Steps to Add Custom Domain on Vercel

### 1. Add Domain in Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: **frontend**
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `phplanner.vercel.app`
6. Click **Add**

### 2. Update Backend CORS Settings

Update the `FRONTEND_URL` environment variable on Railway:

```bash
railway variables set FRONTEND_URL="https://phplanner.vercel.app"
```

Or via Railway dashboard:
- Go to your Railway project
- **Variables** tab
- Update `FRONTEND_URL` to: `https://phplanner.vercel.app`

### 3. Verify Domain

After adding the domain, Vercel will:
- Automatically configure DNS
- Issue SSL certificate
- Make the site accessible at `https://phplanner.vercel.app`

### 4. Test

Visit: https://phplanner.vercel.app

The site should load with the new domain.

## Note

- The domain `phplanner.vercel.app` is a Vercel subdomain
- Vercel automatically handles SSL certificates
- DNS propagation may take a few minutes

