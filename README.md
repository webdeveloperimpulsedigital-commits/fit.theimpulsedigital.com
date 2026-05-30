# Impulse Digital Project Alignment Form

This is the standalone Next.js app for the Impulse Digital Project Alignment form hosted at `fit.theimpulsedigital.com`.

The app is separate from the main Impulse Digital website and should remain isolated.

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm run start
```

## Environment

Copy `.env.example` to `.env.local` for local server-side testing, then fill in the Zoho values.

Real credentials must only be added on the server or Hostinger environment panel. They must not be committed to GitHub.

## Key Files

- `app/page.tsx`: Project Alignment form page.
- `app/page.module.css`: Isolated page styling.
- `app/api/project-fit-validation/route.ts`: Server-side validation and Zoho CRM update route.
- `.env.example`: Required server-side environment variables.
- `DEPLOYMENT.md`: Hostinger deployment checklist.

## CRM Behavior

The API route updates an existing Zoho CRM Lead only.

Lookup order:

1. `lead_id`
2. `email`
3. submitted work email

If no matching Lead exists, the API returns an error and does not create a new Lead.
