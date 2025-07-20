-- Step 1: Update the emotions table to include likes column
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- Step 2: Create the emotion_likes table to track who liked what
CREATE TABLE IF NOT EXISTS emotion_likes (
  id BIGSERIAL PRIMARY KEY,
  emotion_id BIGINT REFERENCES emotions(id) ON DELETE CASCADE,
  user_ip TEXT, -- Store IP address to prevent duplicate likes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(emotion_id, user_ip)
);

-- Step 3: Enable Row Level Security on the new table
ALTER TABLE emotion_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on emotion_likes" ON emotion_likes FOR ALL USING (true);

-- Step 4: Create the function to handle likes
CREATE OR REPLACE FUNCTION toggle_emotion_like(emotion_id BIGINT, user_ip TEXT)
RETURNS INTEGER AS $$
DECLARE
  like_exists BOOLEAN;
  new_likes INTEGER;
BEGIN
  -- Check if user already liked this emotion
  SELECT EXISTS(SELECT 1 FROM emotion_likes WHERE emotion_id = $1 AND user_ip = $2) INTO like_exists;
  
  IF like_exists THEN
    -- Unlike: remove the like record and decrease count
    DELETE FROM emotion_likes WHERE emotion_id = $1 AND user_ip = $2;
    UPDATE emotions SET likes = likes - 1 WHERE id = $1;
    SELECT likes INTO new_likes FROM emotions WHERE id = $1;
    RETURN new_likes;
  ELSE
    -- Like: add the like record and increase count
    INSERT INTO emotion_likes (emotion_id, user_ip) VALUES ($1, $2);
    UPDATE emotions SET likes = likes + 1 WHERE id = $1;
    SELECT likes INTO new_likes FROM emotions WHERE id = $1;
    RETURN new_likes;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION toggle_emotion_like(BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION toggle_emotion_like(BIGINT, TEXT) TO authenticated; 