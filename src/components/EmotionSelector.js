import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Heart, Send, Smile, Frown, Zap, Coffee, AlertCircle, Star, Target } from 'lucide-react';
import { processUserInput, validateEmotion, validateMessage, RateLimiter } from '../utils/security';

const EmotionSelector = () => {
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const navigate = useNavigate();

  // Initialize rate limiter
  const rateLimiter = new RateLimiter(5, 60000); // 5 submissions per minute

  const emotions = [
    { name: 'Happy', icon: Smile, color: 'bg-yellow-500 hover:bg-yellow-600', bgColor: 'bg-yellow-50' },
    { name: 'Sad', icon: Frown, color: 'bg-blue-500 hover:bg-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Excited', icon: Zap, color: 'bg-orange-500 hover:bg-orange-600', bgColor: 'bg-orange-50' },
    { name: 'Calm', icon: Coffee, color: 'bg-green-500 hover:bg-green-600', bgColor: 'bg-green-50' },
    { name: 'Anxious', icon: AlertCircle, color: 'bg-purple-500 hover:bg-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Grateful', icon: Star, color: 'bg-pink-500 hover:bg-pink-600', bgColor: 'bg-pink-50' },
    { name: 'Frustrated', icon: Target, color: 'bg-red-500 hover:bg-red-600', bgColor: 'bg-red-50' },
    { name: 'Hopeful', icon: Heart, color: 'bg-indigo-500 hover:bg-indigo-600', bgColor: 'bg-indigo-50' }
  ];

  // Cleanup rate limiter on unmount
  useEffect(() => {
    const cleanup = setInterval(() => {
      rateLimiter.cleanup();
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanup);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Security validations
    if (!selectedEmotion || !validateEmotion(selectedEmotion)) {
      setError('Please select a valid emotion.');
      return;
    }

    if (message && !validateMessage(message)) {
      setError('Message contains invalid content. Please check your input.');
      return;
    }

    // Rate limiting check
    const userIdentifier = 'anonymous'; // In a real app, use user ID or session
    if (!rateLimiter.isAllowed(userIdentifier)) {
      setRateLimitError(true);
      setTimeout(() => setRateLimitError(false), 60000); // Clear after 1 minute
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Sanitize inputs
      const sanitizedEmotion = processUserInput(selectedEmotion, 'emotion');
      const sanitizedMessage = processUserInput(message, 'message');

      if (!sanitizedEmotion) {
        setError('Invalid emotion selected.');
        return;
      }

      const { error } = await supabase
        .from('emotions')
        .insert([
          {
            emotion: sanitizedEmotion,
            message: sanitizedMessage.trim() || null,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.log('Database error:', error.message);
        setError('Failed to save emotion. Please check your database configuration.');
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error submitting emotion:', error);
      setError('Failed to share your emotion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmotionSelect = (emotion) => {
    if (validateEmotion(emotion)) {
      setSelectedEmotion(emotion);
      setError(null);
    }
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    if (value.length <= 280) {
      setMessage(value);
      setError(null);
    }
  };

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <Heart className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Thank you for sharing!
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Your emotion has been added to the collective feeling of the world today.
          </p>
          <div className="animate-pulse">
            <p className="text-sm text-gray-500">Redirecting to the landing page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          How are you feeling today?
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Share your current emotion with the world. Your feelings matter and contribute to our collective emotional landscape.
        </p>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700 mb-4">
            {error}
          </p>
        </div>
      )}

      {/* Rate Limit Notice */}
      {rateLimitError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Rate Limit Exceeded</h3>
          <p className="text-yellow-700 mb-4">
            You've shared too many emotions recently. Please wait a moment before sharing again.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        {/* Emotion Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Choose your emotion
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {emotions.map((emotion) => {
              const IconComponent = emotion.icon;
              const isSelected = selectedEmotion === emotion.name;
              
              return (
                <button
                  key={emotion.name}
                  type="button"
                  onClick={() => handleEmotionSelect(emotion.name)}
                  className={`
                    ${isSelected ? emotion.bgColor : 'bg-white'} 
                    ${isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'} 
                    border-2 border-gray-200 rounded-xl p-6 transition-all duration-200 hover:shadow-md
                  `}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className={`
                      ${emotion.color} 
                      p-3 rounded-full text-white transition-all duration-200
                      ${isSelected ? 'scale-110' : 'hover:scale-105'}
                    `}>
                      <IconComponent size={24} />
                    </div>
                    <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {emotion.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Message */}
        <div className="mb-8">
          <label htmlFor="message" className="block text-lg font-medium text-gray-900 mb-3">
            Want to share more? (Optional)
          </label>
          <textarea
            id="message"
            value={message}
            onChange={handleMessageChange}
            placeholder="Share what's on your mind, what made you feel this way, or just leave it blank..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            maxLength={280}
          />
          <div className="text-right text-sm text-gray-500 mt-2">
            {message.length}/280 characters
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={!selectedEmotion || isSubmitting || rateLimitError}
            className={`
              inline-flex items-center space-x-2 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200
              ${selectedEmotion && !isSubmitting && !rateLimitError
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Sharing...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Share My Emotion</span>
              </>
            )}
          </button>
        </div>

        {!selectedEmotion && (
          <p className="text-center text-gray-500 mt-4">
            Please select an emotion to continue
          </p>
        )}
      </form>
    </div>
  );
};

export default EmotionSelector; 