# Maintenance checklist

Use this checklist before deploying Airdrop Planner changes.

## Frontend

- Run the frontend build or lint command after changing React/Vite files.
- Check the Articles and Plan pages after search or filtering changes.
- Keep Vercel notes in `frontend/VERCEL_DEPLOY.md` current.

## Backend

- Keep `backend/.env.example` aligned with required Railway and Supabase
  variables.
- Review SQL files when API responses add or rename fields.
- Use the Railway deployment notes when changing server startup behavior.

## Documentation

If a deployment variable changes, update the matching Railway and Vercel docs in
the same commit.
