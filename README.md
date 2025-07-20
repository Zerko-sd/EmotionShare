# EmotionShare App

A beautiful web application that allows users to share their emotions publicly and see how the world is feeling today. Built with React, Supabase cloud database, and Tailwind CSS.

## Features

- **Emotion Selection**: Choose from 8 different emotions (Happy, Sad, Excited, Calm, Anxious, Grateful, Frustrated, Hopeful)
- **Public Display**: View all shared emotions on the landing page in real-time
- **Optional Messages**: Add personal context to your emotion (optional)
- **Real-time Updates**: Emotions are displayed with timestamps and auto-refresh
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Cloud Database**: Uses Supabase for reliable cloud storage

## Tech Stack

- **Frontend**: React 18, React Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Ready for Vercel, Netlify, or any static hosting

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to SQL Editor
3. Run the following SQL to create the emotions table:

```sql
CREATE TABLE emotions (
  id BIGSERIAL PRIMARY KEY,
  emotion TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE emotions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for public sharing)
CREATE POLICY "Allow all operations" ON emotions FOR ALL USING (true);
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under API.

### 4. Start the Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── Header.js          # Navigation header
│   ├── LandingPage.js     # Public emotions display
│   └── EmotionSelector.js # Emotion selection form
├── App.js                 # Main app component with routing
├── supabase.js           # Supabase client configuration
├── index.js              # React entry point
└── index.css             # Global styles with Tailwind
```

## How It Works

1. **Landing Page (`/`)**: Displays all shared emotions in a beautiful grid layout with real-time updates
2. **Share Page (`/share`)**: Interactive emotion selector with 8 different emotions and optional message input
3. **Database**: All emotions are stored in Supabase with timestamps for real-time display

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Add your environment variables in Netlify dashboard
4. Deploy!

## Environment Variables

- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for your own applications. # EmotionShare
