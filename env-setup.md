# Environment Setup

## Create .env file

1. In your project root folder, create a new file called `.env`
2. Add the following content (replace with your actual values):

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Where to find your values:

1. Go to your Supabase dashboard
2. Click Settings → API
3. Copy the "Project URL" and "anon public" key
4. Replace the placeholder values in your .env file

## Example .env file:

```
REACT_APP_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjU2ODAwMCwiZXhwIjoxOTUyMTQ0MDAwfQ.example
``` 