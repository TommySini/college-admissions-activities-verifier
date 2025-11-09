# Deployment Guide - Actify to Vercel

This guide will walk you through deploying Actify to Vercel so others can use it.

## Prerequisites

1. A GitHub account
2. A Vercel account (sign up at https://vercel.com)
3. A Google Cloud Platform account (for OAuth)
4. A database (we'll use Vercel Postgres or you can use another provider)

## Step 1: Prepare Your Code

### 1.1 Push to GitHub

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### 1.2 Update Database Configuration

For production, you'll need to switch from SQLite to PostgreSQL. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

## Step 2: Set Up Google OAuth for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `https://YOUR_DOMAIN.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local testing)
6. Save the changes

## Step 3: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. In your Vercel project dashboard, go to **Storage**
2. Click **Create Database** > **Postgres**
3. Create a new database
4. Copy the connection string (it will be in the format: `postgresql://...`)

### Option B: External Database (Supabase, Railway, etc.)

1. Sign up for a PostgreSQL database provider
2. Create a new database
3. Copy the connection string

## Step 4: Deploy to Vercel

### 4.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** > **Project**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### 4.2 Configure Environment Variables

In the Vercel project settings, add these environment variables:

**Required:**
```
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-secret-key-here (generate with: openssl rand -base64 32)
NEXTAUTH_URL=https://YOUR_DOMAIN.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Optional (for email):**
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
RESEND_API_KEY=your-resend-api-key (if using Resend)
SMTP_HOST=smtp.gmail.com (if using custom SMTP)
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
```

**Optional (for verifiers):**
```
VERIFIER_EMAILS=email1@example.com,email2@example.com
```

### 4.3 Configure Build Settings

Vercel should auto-detect these, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (or `prisma generate && next build`)
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 4.4 Add Build Command with Prisma

In Vercel project settings > **Build & Development Settings**, update the build command:

```bash
npx prisma generate && npm run build
```

Or create a `vercel.json` file in your project root:

```json
{
  "buildCommand": "npx prisma generate && npm run build"
}
```

## Step 5: Run Database Migrations

After deployment, you need to run migrations on your production database:

### Option 1: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Pull environment variables:
   ```bash
   vercel env pull .env.local
   ```

4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Using Vercel Postgres Dashboard

1. Go to your Vercel project > **Storage** > Your database
2. Use the SQL editor to run migrations manually
3. Or use the connection string with a database client

### Option 3: Add a Migration Script

Create `scripts/migrate.js`:

```javascript
const { execSync } = require('child_process');

execSync('npx prisma migrate deploy', { stdio: 'inherit' });
```

Then add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "migrate": "node scripts/migrate.js"
  }
}
```

## Step 6: Update Production Settings

### 6.1 Update NEXTAUTH_URL

Make sure `NEXTAUTH_URL` in Vercel matches your actual domain:
- `https://your-project.vercel.app` (for Vercel default domain)
- Or your custom domain if you set one up

### 6.2 Update Google OAuth Redirect URI

In Google Cloud Console, add:
- `https://your-project.vercel.app/api/auth/callback/google`

## Step 7: Test Deployment

1. Visit your deployed site: `https://your-project.vercel.app`
2. Try signing in with Google
3. Test creating activities
4. Test verification flows

## Step 8: Set Up Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Google OAuth redirect URI

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check if your database allows connections from Vercel IPs
- For Vercel Postgres, connections are automatically allowed

### OAuth Issues

- Verify redirect URI matches exactly in Google Cloud Console
- Check `NEXTAUTH_URL` matches your actual domain
- Ensure `NEXTAUTH_SECRET` is set

### Build Failures

- Check build logs in Vercel dashboard
- Ensure Prisma Client is generated: `npx prisma generate`
- Verify all environment variables are set

### Migration Issues

- Run `npx prisma migrate deploy` manually
- Check database connection string
- Verify database schema matches Prisma schema

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXTAUTH_SECRET` - Random secret (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` - Your production URL
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `FROM_EMAIL` - Email for sending notifications (optional)
- [ ] `GMAIL_APP_PASSWORD` or `RESEND_API_KEY` - For email (optional)
- [ ] `VERIFIER_EMAILS` - Comma-separated list (optional)

## Quick Deploy Checklist

1. [ ] Code pushed to GitHub
2. [ ] Database created (Vercel Postgres or external)
3. [ ] Google OAuth configured with production redirect URI
4. [ ] Project imported to Vercel
5. [ ] All environment variables set in Vercel
6. [ ] Build command includes `prisma generate`
7. [ ] Database migrations run
8. [ ] Test sign-in flow
9. [ ] Test creating activities
10. [ ] Test verification flows

## Post-Deployment

After deployment:

1. Monitor the Vercel dashboard for errors
2. Check function logs for any issues
3. Test all user flows
4. Set up monitoring/alerts if needed
5. Consider setting up a staging environment for testing

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [NextAuth.js Deployment](https://next-auth.js.org/deployment)

