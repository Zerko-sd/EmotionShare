import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import EmotionSelector from './components/EmotionSelector';
import Header from './components/Header';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/share" element={<EmotionSelector />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 