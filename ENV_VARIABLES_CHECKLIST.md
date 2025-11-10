# Environment Variables Checklist for Vercel

Copy these values to Vercel → Your Project → Settings → Environment Variables

## Required Variables:

1. **DATABASE_URL**
   - Will be provided by Vercel Postgres (we'll set this up)
   - Format: `postgresql://user:password@host:port/database`

2. **NEXTAUTH_SECRET**
   - Generate with: `openssl rand -base64 32`
   - Or use: https://generate-secret.vercel.app/32

3. **NEXTAUTH_URL**
   - Your Vercel domain: `https://your-project-name.vercel.app`
   - Or custom domain if you have one

4. **GOOGLE_CLIENT_ID**
   - From Google Cloud Console
   - We'll update this

5. **GOOGLE_CLIENT_SECRET**
   - From Google Cloud Console
   - We'll update this

## Optional Variables (for email):

6. **GMAIL_USER** (if using Gmail)
   - Your Gmail address

7. **GMAIL_APP_PASSWORD** (if using Gmail)
   - Gmail App Password (not your regular password)

8. **FROM_EMAIL**
   - Email address to send from

9. **NEXT_PUBLIC_APP_URL**
   - Same as NEXTAUTH_URL usually
   - `https://your-project-name.vercel.app`

10. **VERIFIER_EMAILS** (optional)
    - Comma-separated list: `email1@example.com,email2@example.com`

