# Deployment

This project can be deployed directly from GitHub to Cloudflare Workers without Lovable.

## Deployment target

- Platform: Cloudflare Workers
- Worker name: `nikitamath`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

## Required GitHub Secrets

Add these in GitHub:

`Settings -> Secrets and variables -> Actions -> New repository secret`

Required Cloudflare secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Required Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Deploy flow

After the secrets are configured, deployments happen automatically on every push to `main`.

CI uses:

- Node.js 22
- `npm ci` for deterministic installs from `package-lock.json`
- `npm run lint`
- `npm run build`
- `npm run deploy` (which runs build + `wrangler deploy`)

You can also run it manually:

`GitHub -> Actions -> Deploy to Cloudflare Workers -> Run workflow`

## Local deployment

From the project root:

```powershell
npm.cmd install
npm.cmd run build
npx.cmd wrangler login
npx.cmd wrangler deploy
```

## Notes

- Do not commit `.env` or real API keys.
- Use `.env.example` only as a template.
- Supabase migrations are in `supabase/migrations` and must be applied to the production Supabase project before using the app.
