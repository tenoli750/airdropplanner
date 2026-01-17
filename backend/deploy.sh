#!/bin/bash
# Railway CLI Deployment Script

echo "🚂 Railway CLI Deployment"
echo "========================="
echo ""

# Check if logged in
if ! railway whoami > /dev/null 2>&1; then
    echo "❌ Not logged in. Please run: railway login"
    exit 1
fi

echo "✅ Logged in as: $(railway whoami)"
echo ""

# Set environment variables
echo "📝 Setting environment variables..."
railway variables set DATABASE_URL="postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres"
railway variables set JWT_SECRET="99dd573f-092d-4ed6-a749-6cc48651046f"
railway variables set NODE_ENV="production"
railway variables set NODE_TLS_REJECT_UNAUTHORIZED="0"
railway variables set PORT="3001"

echo ""
echo "✅ Environment variables set"
echo ""

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   - Check status: railway status"
echo "   - View logs: railway logs"
echo "   - Open URL: railway open"
