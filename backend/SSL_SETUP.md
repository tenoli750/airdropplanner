# SSL Certificate Setup for Production

This guide explains how to configure proper SSL certificate verification for Supabase connections in production.

## Current Behavior

- **Development**: SSL verification is disabled (allows self-signed certificates)
- **Production**: SSL verification is enabled (requires valid certificate)

## Setup for Production

### Step 1: Download Supabase CA Certificate

1. Go to your Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/dfwcemqhritblsvoicem/settings/database
   ```

2. Scroll to the **SSL Configuration** section

3. Click **Download** next to "Server root certificate" or "CA Certificate"

4. Save the certificate file (usually named `prod-ca-2021.crt` or similar)

### Step 2: Place Certificate in Your Project

**Option A: Store in project directory (recommended for single-server deployments)**

```bash
# Copy certificate to backend directory
cp ~/Downloads/prod-ca-2021.crt backend/supabase-ca-cert.crt

# Add to .gitignore (certificates should not be committed)
echo "supabase-ca-cert.crt" >> backend/.gitignore
```

**Option B: Store in system location (recommended for multi-server deployments)**

```bash
# Copy to a secure system location
sudo cp ~/Downloads/prod-ca-2021.crt /etc/ssl/certs/supabase-ca-cert.crt
sudo chmod 644 /etc/ssl/certs/supabase-ca-cert.crt
```

### Step 3: Configure Environment Variable

**For Option A (project directory):**
```bash
# In your production .env file or environment
SUPABASE_SSL_CERT_PATH=./supabase-ca-cert.crt
```

**For Option B (system location):**
```bash
# In your production .env file or environment
SUPABASE_SSL_CERT_PATH=/etc/ssl/certs/supabase-ca-cert.crt
```

**For deployment platforms (Railway, Render, etc.):**
- Add `SUPABASE_SSL_CERT_PATH` as an environment variable
- Upload the certificate file and set the path accordingly

### Step 4: Set Production Environment

Make sure `NODE_ENV` is set to `production`:

```bash
NODE_ENV=production
```

## Verification

When you start your server in production mode, you should see:

```
Database URL detected: postgresql://postgres... (Supabase: true, Production: true)
Supabase SSL configured for production: Using CA certificate from /path/to/cert.crt
Connected to Supabase database
Supabase connection verified
```

If the certificate is not found, you'll see a warning but the connection will still work using system CA certificates (if Supabase's cert is in your system's trust store).

## Alternative: Using Connection Pooler with SSL Mode

You can also configure SSL directly in the connection string:

```bash
DATABASE_URL=postgresql://postgres.dfwcemqhritblsvoicem:password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

However, using the CA certificate file provides stronger security (`verify-full` mode).

## Security Notes

- ✅ **Production**: Always use proper SSL certificate verification
- ⚠️ **Development**: Relaxed SSL is acceptable for local development
- 🔒 **Best Practice**: Use `verify-full` SSL mode with CA certificate for maximum security
- 📝 **Note**: Never commit SSL certificates to version control

## Troubleshooting

**Error: "self-signed certificate in certificate chain"**
- Make sure you've downloaded the correct Supabase CA certificate
- Verify the `SUPABASE_SSL_CERT_PATH` points to the correct file
- Check file permissions (should be readable)

**Error: "certificate not found"**
- The code will fall back to system CA certificates
- This works if Supabase's certificate is in your system's trust store
- For best security, use the explicit certificate path

**Connection works but shows warning**
- This is expected if certificate path is not set
- The connection uses system CA certificates as fallback
- For production, set `SUPABASE_SSL_CERT_PATH` to eliminate warnings


