# Quick Start Guide - Benjamin School Activity Verification

## Immediate Next Steps

### 1. Install Dependencies (if needed)
The Google OAuth provider is included in NextAuth v4, so no additional packages needed.

### 2. Set Up Google OAuth (REQUIRED)

1. Go to https://console.cloud.google.com/
2. Create a new project: "Benjamin School Activity Verification"
3. Enable APIs:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Benjamin School Activity Verification"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
5. Copy the Client ID and Client Secret

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here-generate-with-openssl-rand-base64-32

# Google OAuth (from step 2)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Verifier Emails (comma-separated, no spaces)
VERIFIER_EMAILS=teacher1@thebenjaminschool.org,teacher2@thebenjaminschool.org
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Run Database Migration

⚠️ **WARNING**: This will reset your database. Backup if needed.

```bash
npx prisma generate
npx prisma migrate dev --name benjamin_school_schema
```

### 5. Start Development Server

```bash
npm run dev
```

### 6. Test Authentication

1. Visit http://localhost:3000
2. Click "Sign In with Google"
3. Use a @thebenjaminschool.org email
4. You should be redirected to dashboard

## What's Been Changed

### ✅ Completed
- Database schema updated for Benjamin School
- Google OAuth authentication configured
- Domain restriction to @thebenjaminschool.org
- Role-based system (student/verifier/admin)
- Updated home page with school branding
- Updated sign-in page

### ⏳ Still Needs Work
- Dashboard views for students vs verifiers
- Activity forms with Common App format
- Verification workflow
- Email notifications
- Full UI rebranding (colors, logos)

## Current Status

The authentication system is ready to test. Once you:
1. Set up Google OAuth credentials
2. Add them to .env
3. Run migrations
4. Start the server

You can sign in with a @thebenjaminschool.org email and test the authentication flow.

## Next Development Steps

1. Update dashboard to show role-specific views
2. Create activity form with Common App fields
3. Build verifier interface for pending activities
4. Add email notification system
5. Complete UI rebranding

See `IMPLEMENTATION_STATUS.md` for detailed progress.

