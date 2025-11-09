# Email Notification Setup

The platform includes email notification functionality that requires backend configuration. Currently, the email API route is set up as a placeholder.

## Current Status

The email notification system is ready but needs an email service provider to be configured. When organizations send verifications, the system attempts to send an email notification to the applicant.

## Setting Up Email Notifications

### Option 1: Resend (Recommended)

1. Sign up for a free account at [Resend](https://resend.com)
2. Get your API key from the dashboard
3. Add to your `.env.local` file:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
4. Update `app/api/send-verification-email/route.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { to, organizationName, title, applicantExists } = body;

  await resend.emails.send({
    from: 'verifications@yourdomain.com', // Must be verified domain
    to: to,
    subject: `New Verification Request from ${organizationName}`,
    html: `
      <h2>New Verification Request</h2>
      <p>${organizationName} has sent you a verification request for:</p>
      <p><strong>${title}</strong></p>
      <p>${applicantExists 
        ? 'Log in to your profile to accept or reject this verification.' 
        : 'Create an account to view and accept this verification.'}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}">View Verification</a>
    `,
  });

  return NextResponse.json({ success: true });
}
```

### Option 2: SendGrid

1. Sign up at [SendGrid](https://sendgrid.com)
2. Get your API key
3. Add to `.env.local`:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```
4. Install SendGrid: `npm install @sendgrid/mail`
5. Update the API route accordingly

### Option 3: AWS SES

1. Set up AWS SES
2. Configure credentials
3. Install AWS SDK: `npm install @aws-sdk/client-ses`
4. Update the API route to use SES

### Option 4: Nodemailer (SMTP)

1. Install Nodemailer: `npm install nodemailer`
2. Configure SMTP settings in `.env.local`
3. Update the API route to use Nodemailer

## Environment Variables

Add these to your `.env.local` file:

```
# Email Service (choose one)
RESEND_API_KEY=your_resend_key
# OR
SENDGRID_API_KEY=your_sendgrid_key
# OR
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

The email system will gracefully fail if not configured - verifications will still be sent and stored, but email notifications won't be delivered. Check the browser console for any email-related errors.

## Production

For production, make sure to:
1. Use a verified domain for the "from" email address
2. Set up proper SPF/DKIM records
3. Monitor email delivery rates
4. Handle bounce and spam reports

