# Update Railway DATABASE_URL to Use Pooler

## Current Issue
Railway is trying to connect to Supabase using IPv6, which Railway's network doesn't support, causing `ENETUNREACH` errors.

## Solution: Use Supabase Connection Pooler

Supabase's connection pooler uses IPv4 and is more reliable for production deployments like Railway.

## Update DATABASE_URL in Railway

### Current DATABASE_URL (causing IPv6 issues):
```
postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres
```

### New DATABASE_URL (using pooler - recommended):
```
postgresql://postgres.dfwcemqhritblsvoicem:rnjswoghd1%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

## How to Update in Railway

### Option 1: Using Railway Dashboard
1. Go to [railway.app](https://railway.app)
2. Open your project
3. Click on your **backend service**
4. Go to the **Variables** tab
5. Find `DATABASE_URL` and click **Edit**
6. Replace the value with the pooler connection string above
7. Railway will automatically redeploy

### Option 2: Using Railway CLI
```bash
cd backend
railway variables set DATABASE_URL="postgresql://postgres.dfwcemqhritblsvoicem:rnjswoghd1%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

## Key Differences

| Feature | Direct Connection | Pooler Connection |
|---------|------------------|-------------------|
| Hostname | `db.dfwcemqhritblsvoicem.supabase.co` | `aws-1-ap-south-1.pooler.supabase.com` |
| Username | `postgres` | `postgres.dfwcemqhritblsvoicem` |
| IPv4/IPv6 | Can resolve to IPv6 | IPv4 only |
| Connection Limits | Limited per database | Higher limits |
| Recommended for | Local development | Production/Cloud |

## Benefits of Pooler

✅ **IPv4 only** - No IPv6 connectivity issues  
✅ **Higher connection limits** - Better for production  
✅ **Connection pooling** - More efficient resource usage  
✅ **Better for cloud platforms** - Designed for Railway/Render/etc.

## After Updating

1. Railway will automatically redeploy your service
2. Check the logs - you should see:
   - `Database URL detected: postgresql://postgres.dfwcemqhritblsvoicem...`
   - `Connected to Supabase database`
   - `Supabase connection verified`
3. The `ENETUNREACH` error should be gone

## Notes

- The password `rnjswoghd1!` is URL-encoded as `rnjswoghd1%21`
- The pooler automatically detects if you're using SSL and requires it
- No need to change other variables - everything else stays the same

