# Quick Setup Guide

## 🚀 Get Started in 3 Steps

### 1. Set up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a free account
2. Create a new project
3. In the SQL Editor, run this code:

```sql
CREATE TABLE emotions (
  id BIGSERIAL PRIMARY KEY,
  emotion TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE emotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations" ON emotions FOR ALL USING (true);
```

### 2. Configure Environment Variables

1. Copy `env.example` to `.env`
2. Get your Supabase URL and anon key from Project Settings → API
3. Update the `.env` file with your values

### 3. Start the App

```bash
npm start
```

Visit `http://localhost:3000` to see your emotion sharing app!

## 🎯 What You'll Get

- **Landing Page**: See all shared emotions in real-time
- **Share Page**: Interactive emotion selector with 8 emotions
- **Cloud Database**: All data stored securely in Supabase
- **Beautiful UI**: Modern, responsive design

## 🔧 Troubleshooting

- **Database errors**: Make sure you've created the table and set the environment variables
- **Build errors**: Run `npm install` again
- **CORS issues**: Check your Supabase RLS policies

## 📱 Features

- ✅ Real-time emotion sharing
- ✅ Beautiful, responsive design
- ✅ Cloud database storage
- ✅ Optional message sharing
- ✅ Public emotion display
- ✅ Auto-refresh updates 