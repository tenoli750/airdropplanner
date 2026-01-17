#!/bin/bash

# Railway Environment Variables Setup Script
# Run this script from the backend directory after linking to Railway project

echo "Setting Railway environment variables..."
echo ""

# Required variables
railway variables set DATABASE_URL="postgresql://postgres:rnjswoghd1%21@db.dfwcemqhritblsvoicem.supabase.co:5432/postgres"
railway variables set JWT_SECRET="99dd573f-092d-4ed6-a749-6cc48651046f"
railway variables set NODE_ENV="production"
railway variables set NODE_TLS_REJECT_UNAUTHORIZED="0"
railway variables set PORT="3001"

echo ""
echo "✅ Required variables set!"
echo ""
echo "Optional variables (set manually if needed):"
echo "  - TELEGRAM_BOT_TOKEN (for Telegram bot)"
echo "  - FRONTEND_URL (after frontend is deployed)"
echo ""
echo "To verify variables:"
echo "  railway variables"
echo ""

