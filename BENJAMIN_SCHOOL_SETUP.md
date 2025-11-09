# The Benjamin School Activity Verification System - Setup Guide

## Overview
This system allows students to add extracurricular activities and teachers/club advisors to verify them for college applications.

## Prerequisites
- Node.js 18+ installed
- A Google Cloud Project with OAuth credentials
- Access to @thebenjaminschool.org email domain

## Step 1: Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Verifier Emails (comma-separated list)
VERIFIER_EMAILS=teacher1@thebenjaminschool.org,teacher2@thebenjaminschool.org,advisor@thebenjaminschool.org

# Email (Optional - for notifications)
EMAIL_FROM=noreply@thebenjaminschool.org
# Use SendGrid, Resend, or your email service
SENDGRID_API_KEY=your-sendgrid-key
# OR
RESEND_API_KEY=your-resend-key
```

## Step 2: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (for dev)
7. For production, add: `https://yourdomain.com/api/auth/callback/google`
8. **Important**: In OAuth consent screen, add `hd=thebenjaminschool.org` to restrict to your domain
9. Copy the Client ID and Client Secret to your `.env` file

### Restricting to @thebenjaminschool.org Domain

The code already restricts logins to `@thebenjaminschool.org` emails in two ways:
1. In the Google OAuth authorization params (`hd: "thebenjaminschool.org"`)
2. In the `signIn` callback (checks email domain)

## Step 3: Database Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run migrations (this will reset your database):
```bash
npx prisma migrate dev --name init_benjamin_school
```

4. (Optional) Open Prisma Studio to view data:
```bash
npx prisma studio
```

## Step 4: Verifier Email List

Update the `VERIFIER_EMAILS` environment variable with all teacher and club advisor emails who should have verifier access. These users will automatically be assigned the "verifier" role when they sign in.

Example:
```env
VERIFIER_EMAILS=john.smith@thebenjaminschool.org,jane.doe@thebenjaminschool.org,club.advisor@thebenjaminschool.org
```

## Step 5: Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with a @thebenjaminschool.org Google account.

## Step 6: Production Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Update `NEXTAUTH_URL` to your production domain
5. Update Google OAuth redirect URI to: `https://yourdomain.com/api/auth/callback/google`

### Database

For production, consider using:
- **PostgreSQL** (recommended): Update `DATABASE_URL` to your PostgreSQL connection string
- **SQLite** (for small deployments): Keep file-based database

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma migrate deploy
```

## Features

### Student Role
- Add activities (mirroring Common App format)
- View activity status (pending, verified, denied)
- See who verified their activities
- Export activities for college applications

### Verifier Role
- View pending activities awaiting verification
- Verify or deny student activities
- Add notes to verifications
- View verification history

### Admin Role
- All verifier permissions
- Global dashboard and analytics
- User management (future)

## Email Notifications

The system sends emails when:
- A student requests verification for an activity
- A verifier verifies/denies an activity
- An activity status changes

To enable email notifications, configure your email service in the `.env` file and update the email sending code in `app/api/notifications/`.

## Security Notes

1. **Domain Restriction**: Only @thebenjaminschool.org emails can sign in
2. **Role-Based Access**: Students can only see their own activities; verifiers can see activities they need to verify
3. **Audit Logging**: All verifications are logged with timestamps
4. **HTTPS Required**: Always use HTTPS in production

## Troubleshooting

### "Access Denied" Error
- Ensure your email ends with @thebenjaminschool.org
- Check that Google OAuth is configured correctly
- Verify the `hd` parameter in OAuth settings

### Database Errors
- Run `npx prisma generate` to regenerate the client
- Check that `DATABASE_URL` is correct
- Ensure migrations are up to date: `npx prisma migrate dev`

### Role Not Assigned Correctly
- Check `VERIFIER_EMAILS` in `.env`
- Verify the email is in the list (case-insensitive)
- User role is assigned on first sign-in

## Support

For issues or questions, contact the development team.

