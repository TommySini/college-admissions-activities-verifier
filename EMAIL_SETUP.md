# Email Setup Guide for Actify

Actify uses nodemailer to send verification emails. You can configure it in several ways:

## Option 1: Gmail SMTP (Easiest for Testing)

1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Actify" as the name
   - Copy the generated 16-character password

4. Add to your `.env` file:
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
FROM_EMAIL=your-email@gmail.com
```

## Option 2: Resend (Recommended for Production)

1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Add to your `.env` file:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
```

## Option 3: Custom SMTP

Add to your `.env` file:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
FROM_EMAIL=your-email@example.com
```

## Option 4: Test Mode (No Configuration)

If no email configuration is provided, Actify will use Ethereal Email for testing. Check the server console for the preview URL to view test emails.

## Environment Variables

- `NEXT_PUBLIC_APP_URL` - Your app's public URL (e.g., `https://actify.app` or `http://localhost:3000`)
- `FROM_EMAIL` - The email address to send from (optional, defaults to GMAIL_USER or "noreply@actify.app")

## Testing

After setting up, test by:
1. Creating an activity with a verifier email
2. Clicking "Send Email"
3. Checking the recipient's inbox (or Ethereal preview URL if in test mode)
