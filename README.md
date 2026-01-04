# Actify - Student Activity Management Platform

An AI-powered student management platform designed for schools to track, verify, and manage student extracurricular activities, volunteering, clubs, and college preparation.

## Overview

Actify helps schools streamline the management of student activities with features including:

- **AI Assistant** - An intelligent chatbot powered by OpenAI that helps students with college preparation questions, activity suggestions, and platform navigation
- **Activity Verification** - Students log extracurricular activities and supervisors verify them via secure email links
- **Volunteering Management** - Track volunteer hours, set goals, discover opportunities, and get verified service records
- **Club Directory** - Manage school clubs and organizations with approval workflows
- **Alumni Network** - Alumni can share their college application profiles with privacy controls to inspire current students
- **Admin Dashboard** - School administrators can view all students, analytics, export data, and manage organizations

## Features

### For Students
- Log and track extracurricular activities
- Request verification from supervisors via email
- Discover volunteering opportunities
- Set and track volunteering hour goals
- Chat with AI assistant for college prep guidance
- View alumni profiles for inspiration

### For Administrators
- View all student activities and verification status
- Approve/reject club and organization requests
- Access analytics and export data
- Manage volunteering opportunities
- Review and approve petitions

### For Verifiers
- Verify student activities via secure email links
- No account required - one-click verification

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Prisma with SQLite (development) / PostgreSQL (production)
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenAI GPT-4 for the assistant
- **Styling**: Tailwind CSS
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google OAuth credentials
- OpenAI API key (for AI Assistant)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd student-activity-management-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI (for AI Assistant)
OPENAI_API_KEY="your-openai-api-key"

# Email (optional)
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"
FROM_EMAIL="your-email@gmail.com"
```

4. Set up the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth session encryption |
| `NEXTAUTH_URL` | Yes | Base URL of your application |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI Assistant |
| `GMAIL_USER` | No | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | No | Gmail app password |
| `FROM_EMAIL` | No | Sender email address |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js. Make sure to:
- Set all required environment variables
- Use PostgreSQL for production database
- Configure proper CORS and security headers

## License

Proprietary - All rights reserved.
