# Steven's Product Transformation Tracker

Interactive initiative tracker with shared state via Supabase, deployed on Netlify.

## Setup (15 min)

### 1. Create Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and create an account/project
2. Once your project is ready, go to **SQL Editor** and run this:

```sql
-- Create the table
create table tracker_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable Row Level Security (required)
alter table tracker_state enable row level security;

-- Allow anyone with the anon key to read/write (public tracker)
create policy "Allow public read" on tracker_state for select using (true);
create policy "Allow public insert" on tracker_state for insert with check (true);
create policy "Allow public update" on tracker_state for update using (true);

-- Enable realtime so multiple viewers stay in sync
alter publication supabase_realtime add table tracker_state;
```

3. Go to **Settings > API** and copy:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon / public key** (the long `eyJ...` string)

### 2. Clone and configure

```bash
git clone <your-repo-url>
cd faria-tracker
npm install
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:5173` - you should see the tracker with data persisting to Supabase.

### 4. Deploy to Netlify

**Option A: Netlify CLI**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**Option B: GitHub + Netlify UI**
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) > "Add new site" > "Import from Git"
3. Select your repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Under **Site settings > Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

That's it. Anyone with the Netlify URL can view and update the tracker in real time.

## How it works

- All state (initiatives, milestones, today marker position) is stored as a single JSON blob in one Supabase row
- Changes are debounced (500ms) to avoid spamming the database
- Supabase Realtime keeps multiple open tabs/viewers in sync
- localStorage is used as a fallback/cache if Supabase is unavailable

## Optional: Lock it down

If you want only specific people to edit, update the RLS policies in Supabase to require authentication, and add a login flow. The free tier supports email/password, magic links, and OAuth.
