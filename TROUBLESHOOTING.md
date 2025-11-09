# Troubleshooting Guide

## "Sign in with Google" Button Does Nothing

If clicking the "Sign in with Google" button doesn't do anything, check the following:

### 1. Check Browser Console
Open your browser's developer console (F12 or right-click → Inspect → Console) and look for errors.

### 2. Verify Environment Variables
Make sure your `.env` file has the following variables set:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

**To check if they're set:**
```bash
# In your project root
cat .env | grep GOOGLE
```

If they're missing or empty, you need to:
1. Set up Google OAuth credentials (see QUICK_START.md)
2. Add them to your `.env` file
3. Restart your dev server

### 3. Restart Development Server
After adding/changing environment variables, you MUST restart the server:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### 4. Check Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Verify your OAuth 2.0 Client ID exists
4. Check that the authorized redirect URI includes:
   - `http://localhost:3000/api/auth/callback/google` (for development)

### 5. Common Errors

#### "Configuration" Error
- **Cause**: Missing or invalid Google OAuth credentials
- **Fix**: Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env` and restart server

#### "AccessDenied" Error
- **Cause**: Email domain not allowed
- **Fix**: Make sure you're using @thebenjaminschool.org or @stanford.edu email

#### No Error, But Nothing Happens
- **Cause**: Missing environment variables or server not restarted
- **Fix**: 
  1. Check `.env` file has all required variables
  2. Restart dev server: `npm run dev`
  3. Check browser console for JavaScript errors

### 6. Test OAuth Configuration

You can test if the OAuth is configured by checking the NextAuth API route:

Visit: `http://localhost:3000/api/auth/providers`

You should see:
```json
{
  "google": {
    "id": "google",
    "name": "Google",
    "type": "oauth",
    ...
  }
}
```

If you see an error or empty response, the OAuth is not configured correctly.

### 7. Debug Mode

Add this to see more detailed errors. In `app/api/auth/[...nextauth]/route.ts`, add:

```typescript
export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development", // Add this line
  providers: [
    // ...
  ],
  // ...
};
```

Then check your server console (terminal) for detailed error messages.

### 8. Network Issues

If the button works but redirects fail:
- Check your firewall/antivirus isn't blocking localhost:3000
- Try a different browser
- Clear browser cache and cookies

## Still Not Working?

1. Check the server terminal for error messages
2. Check browser console for JavaScript errors
3. Verify all environment variables are set correctly
4. Make sure you've restarted the dev server after adding env variables
5. Try accessing the providers endpoint: `http://localhost:3000/api/auth/providers`

