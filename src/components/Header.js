import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-gray-900">
            <Heart className="text-red-500" size={32} />
            <span>EmotionShare</span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              View Emotions
            </Link>
            <Link 
              to="/share" 
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
            >
              <Share2 size={16} />
              <span>Share Your Emotion</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 