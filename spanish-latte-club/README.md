# YAM

A private three-person web app for Yassine, Aziz, and Mariam to rate Spanish lattes, compare verdicts, and generate an automatic S/A/B/C/D tier list.

## Run Locally

```bash
npm install
npm run dev
```

Without Supabase environment variables, the app runs in local demo mode with three seeded friends and sample cafes.

## Connect Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor. It creates the tables, storage bucket, RLS policies, and exactly three invited identities:

```bash
yassine@yam.club
aziz@yam.club
mariam@yam.club
```

3. In Supabase Auth > Users, create one user for each of those emails. You can set the same shared club password for all three users if you want the login to feel like name + one simple password. Confirm the users when creating them so they can sign in immediately.
4. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_YAM_YASSINE_EMAIL=yassine@yam.club
NEXT_PUBLIC_YAM_AZIZ_EMAIL=aziz@yam.club
NEXT_PUBLIC_YAM_MARIAM_EMAIL=mariam@yam.club
```

5. The app login screen shows only the three names and a club password field. Choosing a name signs in with the matching hidden Supabase Auth email.
6. Seed the ready-made Bahrain cafe list:

```bash
npm run seed:cafes
```

7. If you later enable email links or deploy to Vercel, set Supabase Auth > URL Configuration:

```bash
Site URL: http://localhost:3002
Redirect URL: http://localhost:3002/auth/callback
```

## Security Model

- Only the three invited identities get profiles.
- `cafes` are readable by authenticated club members.
- `ratings` are readable by authenticated club members.
- A user can insert, update, or delete only ratings where `ratings.user_id = auth.uid()`.
- `unique (cafe_id, user_id)` prevents duplicate ratings from the same friend for the same cafe.
- Photo uploads use the `latte-photos` Supabase Storage bucket.
