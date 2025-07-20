import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Heart, Share2, Clock, Users } from 'lucide-react';
import { processUserInput, validateIP, RateLimiter } from '../utils/security';

const LandingPage = () => {
  const [emotions, setEmotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [error, setError] = useState(null);
  const [likedEmotions, setLikedEmotions] = useState(new Set());
  const [userIp, setUserIp] = useState(null);
  const [likeLoading, setLikeLoading] = useState(new Set());

  // Initialize rate limiter for likes
  const likeRateLimiter = new RateLimiter(20, 60000); // 20 likes per minute

  useEffect(() => {
    fetchUserIp();
    fetchEmotions();
    const interval = setInterval(fetchEmotions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Cleanup rate limiter
  useEffect(() => {
    const cleanup = setInterval(() => {
      likeRateLimiter.cleanup();
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  const fetchUserIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const sanitizedIp = processUserInput(data.ip, 'ip');
      setUserIp(sanitizedIp || 'unknown');
    } catch (error) {
      setUserIp('unknown');
    }
  };

  const fetchEmotions = async () => {
    try {
      const { data, error } = await supabase
        .from('emotions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setError('Unable to load emotions. Please check your database configuration.');
        setEmotions([]);
        setStats({ total: 0, today: 0 });
      } else {
        // Sanitize emotion data before displaying
        const sanitizedEmotions = (data || []).map(emotion => ({
          ...emotion,
          emotion: processUserInput(emotion.emotion, 'emotion'),
          message: emotion.message ? processUserInput(emotion.message, 'message') : null
        }));

        setEmotions(sanitizedEmotions);
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayEmotions = sanitizedEmotions.filter(e => e.created_at.startsWith(today)) || [];
        
        setStats({
          total: sanitizedEmotions.length || 0,
          today: todayEmotions.length
        });

        // Fetch user's liked emotions
        if (userIp && userIp !== 'unknown') {
          fetchLikedEmotions(sanitizedEmotions);
        }
      }
    } catch (error) {
      setError('Unable to load emotions. Please check your database configuration.');
      setEmotions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedEmotions = async (emotions) => {
    try {
      const emotionIds = emotions.map(e => e.id);
      const { data: likedData, error } = await supabase
        .from('emotion_likes')
        .select('emotion_id')
        .in('emotion_id', emotionIds)
        .eq('user_ip', userIp);

      if (!error && likedData) {
        const likedIds = new Set(likedData.map(like => like.emotion_id));
        setLikedEmotions(likedIds);
      }
    } catch (error) {
      // Silent fail for liked emotions
    }
  };

  const handleLike = async (emotionId) => {
    // Prevent multiple clicks
    if (likeLoading.has(emotionId)) {
      return;
    }

    // Rate limiting for likes
    const userIdentifier = userIp || 'anonymous';
    if (!likeRateLimiter.isAllowed(userIdentifier)) {
      return; // Silently ignore if rate limited
    }

    setLikeLoading(prev => new Set(prev).add(emotionId));

    try {
      // Validate emotion ID
      if (!emotionId || typeof emotionId !== 'number' || emotionId <= 0) {
        return;
      }

      // First, try to update the likes count directly
      const currentEmotion = emotions.find(e => e.id === emotionId);
      const currentLikes = currentEmotion?.likes || 0;
      const isCurrentlyLiked = likedEmotions.has(emotionId);
      
      // Optimistic update
      const newLikeCount = isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1;
      
      // Update UI immediately
      setEmotions(prevEmotions => 
        prevEmotions.map(emotion => 
          emotion.id === emotionId 
            ? { ...emotion, likes: newLikeCount }
            : emotion
        )
      );

      // Update liked state
      setLikedEmotions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(emotionId)) {
          newSet.delete(emotionId);
        } else {
          newSet.add(emotionId);
        }
        return newSet;
      });

      // Try to call the database function first
      if (userIp && userIp !== 'unknown') {
        try {
          const { data, error } = await supabase.rpc('toggle_emotion_like', {
            emotion_id: emotionId,
            user_ip: userIp
          });

          if (error) {
            // Fallback to direct table updates
            await handleLikeFallback(emotionId, isCurrentlyLiked, newLikeCount);
          }
        } catch (functionError) {
          // Fallback to direct table updates
          await handleLikeFallback(emotionId, isCurrentlyLiked, newLikeCount);
        }
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLikeLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(emotionId);
        return newSet;
      });
    }
  };

  const handleLikeFallback = async (emotionId, isCurrentlyLiked, newLikeCount) => {
    try {
      // Validate inputs
      if (!emotionId || !userIp || userIp === 'unknown') {
        return;
      }

      // Update the emotion's like count directly
      await supabase
        .from('emotions')
        .update({ likes: newLikeCount })
        .eq('id', emotionId);

      // Update the emotion_likes table
      if (isCurrentlyLiked) {
        // Remove like
        await supabase
          .from('emotion_likes')
          .delete()
          .eq('emotion_id', emotionId)
          .eq('user_ip', userIp);
      } else {
        // Add like
        await supabase
          .from('emotion_likes')
          .insert({
            emotion_id: emotionId,
            user_ip: userIp
          });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      'Happy': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Sad': 'bg-blue-100 text-blue-800 border-blue-200',
      'Excited': 'bg-orange-100 text-orange-800 border-orange-200',
      'Calm': 'bg-green-100 text-green-800 border-green-200',
      'Anxious': 'bg-purple-100 text-purple-800 border-purple-200',
      'Grateful': 'bg-pink-100 text-pink-800 border-pink-200',
      'Frustrated': 'bg-red-100 text-red-800 border-red-200',
      'Hopeful': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[emotion] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Unknown time';
      
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown time';
    }
  };

  const renderMessage = (message) => {
    if (!message) return null;
    
    // Sanitize and escape HTML content
    const sanitizedMessage = processUserInput(message, 'message');
    return (
      <p className="text-gray-700 mb-4 leading-relaxed">
        "{sanitizedMessage}"
      </p>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          How is the world feeling today?
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          See what emotions people around the world are sharing right now. 
          Every feeling matters and contributes to our collective emotional landscape.
        </p>
        
        {/* Stats */}
        <div className="flex justify-center space-x-8 mb-8">
          <div className="flex items-center space-x-2 text-gray-600">
            <Users size={20} />
            <span className="font-semibold">{stats.total} total emotions shared</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock size={20} />
            <span className="font-semibold">{stats.today} shared today</span>
          </div>
        </div>

        <Link 
          to="/share"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Share2 size={24} />
          <span>Share Your Emotion</span>
        </Link>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Database Connection Error</h3>
          <p className="text-red-700 mb-4">
            {error}
          </p>
          <div className="bg-white rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Please check:</p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Your .env file has correct Supabase credentials</li>
              <li>The emotions table was created in Supabase</li>
              <li>Your Supabase project is active</li>
            </ol>
          </div>
        </div>
      )}

      {/* Emotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emotions.map((emotion) => {
          const isLiked = likedEmotions.has(emotion.id);
          const likeCount = emotion.likes || 0;
          const isLikeLoading = likeLoading.has(emotion.id);
          
          return (
            <div key={emotion.id} className="emotion-card">
              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getEmotionColor(emotion.emotion)}`}>
                  {emotion.emotion}
                </div>
                <div className="flex items-center space-x-1 text-gray-500 text-sm">
                  <Clock size={14} />
                  <span>{formatTime(emotion.created_at)}</span>
                </div>
              </div>
              
              {renderMessage(emotion.message)}
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Anonymous</span>
                <button
                  onClick={() => handleLike(emotion.id)}
                  disabled={isLikeLoading}
                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                    isLiked 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isLikeLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Heart 
                      size={16} 
                      className={`transition-all duration-200 ${
                        isLiked ? 'text-red-500 fill-current' : 'text-gray-400'
                      }`}
                    />
                  )}
                  <span>{likeCount}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {emotions.length === 0 && !error && (
        <div className="text-center py-12">
          <Heart size={64} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No emotions shared yet</h3>
          <p className="text-gray-500">Be the first to share how you're feeling today!</p>
        </div>
      )}
    </div>
  );
};

export default LandingPage; 