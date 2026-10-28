# KIET HPL 2026 — Hostel Premier League

Responsive public leaderboard and secure admin portal for KIET Group of Institutions, Ghaziabad.

## Website features
- Public leaderboard with six hostels, Gold/Silver tally, points and rank. All hostels begin at zero.
- 24 sports/events seeded by the database setup file.
- Public results page with sport filter, search, student names and academic year.
- Admin login for adding, editing and deleting results. Each result has one sport, one hostel, one medal, and as many student names as needed.
- Scoring: Gold = 2 points, Silver = 1 point.
- Responsive layout for phones and desktop.

## Step 1 — Create the online database
1. Open https://supabase.com and create a project.
2. In the project, open SQL Editor → New query.
3. Open `supabase/schema.sql` from this folder, copy all of it into the SQL editor and press Run.
4. This creates the six hostels and 24 sports, with no medal results entered yet (so every hostel starts at zero).

## Step 2 — Secure the admin account
1. In Supabase, open Authentication settings and disable public sign-ups.
2. Open Authentication → Users → Add user; create only your admin account with an email and a strong password.
3. Do not create student accounts. With public sign-ups disabled, only the admin account you create should be able to write.
4. Never put a service-role key in frontend code.

## Step 3 — Add environment variables
1. Open Project Settings → API in Supabase. Copy the Project URL and publishable/anon key.
2. Copy `.env.example` to `.env` and fill in the values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

## Step 4 — Run locally (optional)
Install Node.js LTS, open a terminal in this folder, and run:

```bash
npm install
npm run dev
```

## Step 5 — Deploy to Vercel
1. Upload/push this project to a GitHub repository.
2. Import that repository on https://vercel.com.
3. In Vercel → Project Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy/redeploy.

## Important limitations and security
- This code is prepared for deployment, but it is not live until you create the Supabase project and deploy it to your own Vercel account.
- The app uses the public anon/publishable key in the browser; this is normal only with Row Level Security enabled. Do not use a service-role key.
- The SQL policies allow writes to authenticated users. Disable public sign-ups and create only one admin user; never create other authenticated users unless you intend to grant them write access.
- 200–300 visitors is a reasonable target for a read-heavy leaderboard, but exact capacity depends on Supabase plan, query traffic and project settings. Test before a major event.
- Each sport has at most one Gold and one Silver result in this version.
