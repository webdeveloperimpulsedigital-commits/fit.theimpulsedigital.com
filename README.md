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
- `app/api/project-alignment-email/route.ts`: Server-side Project Alignment email sequence webhook.
- `.env.example`: Required server-side environment variables.
- `DEPLOYMENT.md`: Hostinger deployment checklist.

## CRM Behavior

The API route updates an existing Zoho CRM Lead only.

Lookup order:

1. `lead_id`
2. `email`
3. submitted work email

If no matching Lead exists, the API returns an error and does not create a new Lead.

## Email Automation Behavior

The Project Alignment email sequence is handled by a server-side webhook route. Zoho CRM workflows should call:

```text
https://fit.theimpulsedigital.com/api/project-alignment-email
```

with:

```text
secret=PROJECT_ALIGNMENT_WEBHOOK_SECRET
stage=1|2|3|4
lead_id=ZOHO_LEAD_ID
```

Before sending, the route re-checks the Lead in Zoho and suppresses the email if the Lead is already submitted, paused, stopped, in manual review, disqualified, duplicate, converted, or not marked as `Website Contact Us`.
