# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication for your Places History application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for the project to be created

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings → API
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Update the values with your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

## 4. Configure Google OAuth (Optional)

To enable Google sign-in:

1. Go to Authentication → Providers in your Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
   - Set authorized redirect URI to: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

## 5. Configure Email Templates (Optional)

1. Go to Authentication → Email Templates in Supabase
2. Customize the confirmation and recovery email templates
3. Set up your SMTP settings if you want to use custom email service

## 6. Database Schema (Optional)

If you want to store additional user data, you can create custom tables:

```sql
-- Create a profiles table for additional user information
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

## 7. Test Your Setup

1. Run your development server: `npm run dev`
2. Navigate to `/auth` to see the login/signup forms
3. Try creating an account with email/password
4. Test Google sign-in (if configured)

## 8. Production Deployment

1. Update your production environment variables
2. Ensure your Supabase project is in production mode
3. Configure custom domains if needed
4. Set up proper CORS settings in Supabase

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error**: Check your environment variables
2. **Google OAuth not working**: Verify redirect URIs and credentials
3. **Email confirmation not sending**: Check Supabase email settings
4. **CORS errors**: Configure allowed origins in Supabase

### Support:

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## Security Notes

- Never expose your Supabase service role key in client-side code
- Use Row Level Security (RLS) for database tables
- Regularly rotate your API keys
- Monitor your Supabase dashboard for unusual activity
