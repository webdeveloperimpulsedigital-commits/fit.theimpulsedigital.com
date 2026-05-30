# Project Alignment Form Deployment

This repo is the standalone Project Alignment form for Impulse Digital. It is intentionally separate from the main Impulse Digital website.

## What Codex Has Prepared

- Next.js app using the `app` directory.
- Standalone production output enabled in `next.config.ts`.
- Server-side Zoho CRM submission route at `app/api/project-fit-validation/route.ts`.
- Client-side and server-side validation.
- Honeypot spam protection.
- Lightweight server-side rate limiting.
- Local brand assets and Satoshi font files.

## Environment Variables

Add these on the Hostinger Node.js app environment. Do not add real secrets to GitHub.

```bash
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_API_BASE=https://www.zohoapis.in/crm/v7
ZOHO_TOKEN_URL=https://accounts.zoho.in/oauth/v2/token
PROJECT_ALIGNMENT_WEBHOOK_SECRET=
PROJECT_ALIGNMENT_FORM_URL=https://fit.theimpulsedigital.com
ZOHO_MAIL_FROM_EMAIL=
ZOHO_MAIL_FROM_NAME=Adwait
ZOHO_MAIL_REPLY_TO=
```

## Build Commands

Install dependencies:

```bash
npm install
```

Build production files:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

## Hostinger Notes

Use the Hostinger Node.js app setup for this repo or subdomain.

- App domain: `fit.theimpulsedigital.com`
- Node app root: this repository folder
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Required environment variables: see `.env.example`

Because `output: "standalone"` is enabled, production builds generate a standalone Next.js bundle. If Hostinger requires a direct server entry file, use:

```bash
node .next/standalone/server.js
```

## Project Alignment Email Automation

The email automation webhook lives at:

```text
/api/project-alignment-email
```

It is intentionally server-side only. Zoho CRM workflow webhooks should send:

- `secret`: the value of `PROJECT_ALIGNMENT_WEBHOOK_SECRET`
- `stage`: `1`, `2`, `3`, or `4`
- `lead_id`: the Zoho CRM Lead ID

The route uses Zoho CRM's Send Mail API and then updates:

- `Project_Fit_Email_Status`
- `Project_Fit_Last_Sent_Date`
- `Project_Fit_Reminder_Count`
- `Project_Fit_Form_Link`
- `Project_Fit_Sequence_Entered_Date`, for Email 01

The route always re-checks stop criteria before sending. This protects against stale delayed workflow actions.

## Safe Production Test

After deployment and environment variables are added:

1. Open a private form URL with an existing CRM lead:

```text
https://fit.theimpulsedigital.com/?lead_id=ZOHO_LEAD_ID&email=lead@example.com&source=crm
```

2. Submit one controlled test using a real test lead.
3. Confirm the existing Lead record is updated in Zoho CRM.
4. Confirm no new Lead is created if the lead ID or email does not exist.
5. Confirm the Project Fit fields are populated correctly.

## Adwait Needs To Provide

- Zoho OAuth Client ID.
- Zoho OAuth Client Secret.
- Zoho OAuth Refresh Token.
- One test Lead ID from Zoho CRM.
- Confirmation of the Hostinger Node.js app path or panel access during deployment.

## Codex Can Handle

- Repo build and code verification.
- Deployment checklist updates.
- Environment variable naming guidance.
- Local testing.
- Production smoke-test guidance once credentials are configured.

## Do Not Do

- Do not place Zoho credentials in frontend code.
- Do not use `NEXT_PUBLIC_` for Zoho credentials.
- Do not commit `.env` or real secrets.
- Do not switch this form to Zoho Forms, Zoho CRM Webforms, or Web-to-Lead.
