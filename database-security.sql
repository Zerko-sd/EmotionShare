-- Database Security Measures for Emotion Share App

-- 1. Enable Row Level Security on all tables
ALTER TABLE emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_likes ENABLE ROW LEVEL SECURITY;

-- 2. Create secure RLS policies for emotions table
DROP POLICY IF EXISTS "Allow public read access to emotions" ON emotions;
CREATE POLICY "Allow public read access to emotions" ON emotions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to emotions" ON emotions;
CREATE POLICY "Allow public insert to emotions" ON emotions
  FOR INSERT WITH CHECK (
    emotion IN ('Happy', 'Sad', 'Excited', 'Calm', 'Anxious', 'Grateful', 'Frustrated', 'Hopeful') AND
    (message IS NULL OR length(message) <= 280)
  );

DROP POLICY IF EXISTS "Allow public update likes" ON emotions;
CREATE POLICY "Allow public update likes" ON emotions
  FOR UPDATE USING (true) WITH CHECK (
    likes >= 0 AND likes <= 10000 -- Prevent unreasonable like counts
  );

-- 3. Create secure RLS policies for emotion_likes table
DROP POLICY IF EXISTS "Allow public read access to emotion_likes" ON emotion_likes;
CREATE POLICY "Allow public read access to emotion_likes" ON emotion_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to emotion_likes" ON emotion_likes;
CREATE POLICY "Allow public insert to emotion_likes" ON emotion_likes
  FOR INSERT WITH CHECK (
    user_ip IS NOT NULL AND 
    length(user_ip) <= 45 AND -- IPv6 max length
    emotion_id > 0
  );

DROP POLICY IF EXISTS "Allow public delete from emotion_likes" ON emotion_likes;
CREATE POLICY "Allow public delete from emotion_likes" ON emotion_likes
  FOR DELETE USING (true);

-- 4. Create input validation functions
CREATE OR REPLACE FUNCTION validate_emotion_input(emotion_text TEXT, message_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate emotion
  IF emotion_text NOT IN ('Happy', 'Sad', 'Excited', 'Calm', 'Anxious', 'Grateful', 'Frustrated', 'Hopeful') THEN
    RETURN FALSE;
  END IF;
  
  -- Validate message length
  IF message_text IS NOT NULL AND length(message_text) > 280 THEN
    RETURN FALSE;
  END IF;
  
  -- Check for suspicious content in message
  IF message_text IS NOT NULL AND (
    message_text ILIKE '%<script%' OR
    message_text ILIKE '%javascript:%' OR
    message_text ILIKE '%onclick%' OR
    message_text ILIKE '%onload%' OR
    message_text ILIKE '%eval(%' OR
    message_text ILIKE '%document.%' OR
    message_text ILIKE '%window.%'
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a secure emotion insertion function
CREATE OR REPLACE FUNCTION insert_emotion_secure(
  emotion_text TEXT,
  message_text TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
  new_id BIGINT;
BEGIN
  -- Validate input
  IF NOT validate_emotion_input(emotion_text, message_text) THEN
    RAISE EXCEPTION 'Invalid input data';
  END IF;
  
  -- Insert the emotion
  INSERT INTO emotions (emotion, message, created_at)
  VALUES (emotion_text, message_text, NOW())
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a secure like toggle function with additional validation
CREATE OR REPLACE FUNCTION toggle_emotion_like_secure(emotion_id BIGINT, user_ip TEXT)
RETURNS INTEGER AS $$
DECLARE
  like_exists BOOLEAN;
  new_likes INTEGER;
  emotion_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF emotion_id IS NULL OR emotion_id <= 0 THEN
    RAISE EXCEPTION 'Invalid emotion ID';
  END IF;
  
  IF user_ip IS NULL OR length(user_ip) > 45 THEN
    RAISE EXCEPTION 'Invalid user IP';
  END IF;
  
  -- Check if emotion exists
  SELECT EXISTS(SELECT 1 FROM emotions WHERE id = emotion_id) INTO emotion_exists;
  IF NOT emotion_exists THEN
    RAISE EXCEPTION 'Emotion not found';
  END IF;
  
  -- Check if user already liked this emotion
  SELECT EXISTS(SELECT 1 FROM emotion_likes WHERE emotion_id = $1 AND user_ip = $2) INTO like_exists;
  
  IF like_exists THEN
    -- Unlike: remove the like record and decrease count
    DELETE FROM emotion_likes WHERE emotion_id = $1 AND user_ip = $2;
    UPDATE emotions SET likes = GREATEST(likes - 1, 0) WHERE id = $1;
    SELECT likes INTO new_likes FROM emotions WHERE id = $1;
    RETURN new_likes;
  ELSE
    -- Like: add the like record and increase count
    INSERT INTO emotion_likes (emotion_id, user_ip) VALUES ($1, $2);
    UPDATE emotions SET likes = LEAST(likes + 1, 10000) WHERE id = $1;
    SELECT likes INTO new_likes FROM emotions WHERE id = $1;
    RETURN new_likes;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create indexes for better performance and security
CREATE INDEX IF NOT EXISTS idx_emotions_created_at ON emotions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_likes_user_ip ON emotion_likes(user_ip);
CREATE INDEX IF NOT EXISTS idx_emotion_likes_emotion_id ON emotion_likes(emotion_id);

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_emotion_input(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_emotion_input(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_emotion_secure(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION insert_emotion_secure(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_emotion_like_secure(BIGINT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION toggle_emotion_like_secure(BIGINT, TEXT) TO authenticated;

-- 9. Create a cleanup function for old data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_emotions(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM emotion_likes 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  DELETE FROM emotions 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Set up automatic cleanup (optional - uncomment if you want auto-cleanup)
-- SELECT cron.schedule('cleanup-old-emotions', '0 2 * * *', 'SELECT cleanup_old_emotions(30);'); 