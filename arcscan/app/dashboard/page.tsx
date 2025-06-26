// app/dashboard/page.jsx
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebaseConfig';
import YouTubePlayer from '@/components/YouTubePlayer';
import SentimentTimeline from '@/components/SentimentTimeline';

const Dashboard = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sentenceResults, setSentenceResults] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [sentimentSummary, setSentimentSummary] = useState({
    positive: 0,
    negative: 0,
    neutral: 0
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [user] = useAuthState(auth);
  const youtubePlayerRef = useRef(null);

  // Handle analyze request
  const handleAnalyze = async () => {
    if (!videoUrl || !user) return;

    setIsAnalyzing(true);
    setHasAnalyzed(false);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          user_id: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();

      setTranscript(data.transcription);
      setSentenceResults(data.sentences || []);
      setTimelineData(data.timeline_data || []);

      setSentimentSummary({
        positive: data.summary?.Positive?.percentage || 0,
        negative: data.summary?.Negative?.percentage || 0,
        neutral: data.summary?.Neutral?.percentage || 0,
      });

      setHasAnalyzed(true);
    } catch (err) {
      console.error("❌ Error during analysis:", err);
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayerReady = (player) => {
    youtubePlayerRef.current = player;
  };

  // Find the active sentence based on current video time
  const findActiveSentence = () => {
    if (!sentenceResults.length) return null;
    
    return sentenceResults.find(sentence => 
      currentTime >= sentence.start_time && currentTime <= sentence.end_time
    );
  };

  const activeSentence = findActiveSentence();

  // Helper to get color for sentiment
  const getSentimentColor = (sentiment, opacity = 0.2) => {
    const colors = {
      'Positive': `rgba(16, 185, 129, ${opacity})`,
      'Negative': `rgba(239, 68, 68, ${opacity})`,
      'Neutral': `rgba(251, 191, 36, ${opacity})`
    };
    return colors[sentiment] || colors['Neutral'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎬 Analyze a YouTube Video</h1>
        
        {!hasAnalyzed ? (
          <div className="bg-white rounded-xl shadow-md p-6">
            <input
              type="url"
              placeholder="Paste YouTube URL here..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full p-4 mb-4 border border-gray-300 rounded-xl"
            />
            <button
              onClick={handleAnalyze}
              disabled={!videoUrl || isAnalyzing}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing...' : '🚀 Start Analysis'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main content area with improved sizing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Video and Timeline (2/3 width on large screens) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Video Player - More reasonable size */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <YouTubePlayer 
                    videoUrl={videoUrl}
                    onTimeUpdate={setCurrentTime}
                    onReady={handlePlayerReady}
                  />
                </div>
                
                {/* Sentiment Timeline - Reduced height */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">📊 Sentiment Timeline</h2>
                  <div className="h-40"> {/* Reduced height */}
                    <SentimentTimeline 
                      timelineData={timelineData}
                      videoPlayer={youtubePlayerRef.current}
                      currentTime={currentTime}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    Click on the timeline to jump to that point in the video
                  </div>
                </div>
              </div>
              
              {/* Right column - Transcript and Summary (1/3 width on large screens) */}
              <div className="space-y-6">
                {/* Sentiment Summary Pie Chart */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">🤗 Sentiment Summary</h2>
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40"> {/* Smaller pie chart */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="18"
                          strokeDasharray={`${sentimentSummary.positive * 2.51} ${(100 - sentimentSummary.positive) * 2.51}`} 
                          strokeLinecap="round" 
                        />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke="#ef4444" 
                          strokeWidth="18"
                          strokeDasharray={`${sentimentSummary.negative * 2.51} ${(100 - sentimentSummary.negative) * 2.51}`}
                          strokeDashoffset={`-${sentimentSummary.positive * 2.51}`} 
                          strokeLinecap="round" 
                        />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke="#fbbf24" 
                          strokeWidth="18"
                          strokeDasharray={`${sentimentSummary.neutral * 2.51} ${(100 - sentimentSummary.neutral) * 2.51}`}
                          strokeDashoffset={`-${(sentimentSummary.positive + sentimentSummary.negative) * 2.51}`} 
                          strokeLinecap="round" 
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-green-500"></div>
                        <span>😀 Positive</span>
                      </div>
                      <span>{sentimentSummary.positive.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-red-500"></div>
                        <span>😡 Negative</span>
                      </div>
                      <span>{sentimentSummary.negative.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2 bg-yellow-500"></div>
                        <span>😐 Neutral</span>
                      </div>
                      <span>{sentimentSummary.neutral.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Transcript with Highlighted Sentences */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">📝 Transcript</h2>
                  <div className="max-h-[calc(100vh-24rem)] overflow-y-auto text-sm">
                    {sentenceResults.map((sentence, index) => (
                      <span
                        key={index}
                        className={`inline transition-colors duration-200 ${
                          activeSentence && activeSentence.index === sentence.index 
                            ? 'bg-blue-100 rounded' 
                            : ''
                        }`}
                        style={{ 
                          backgroundColor: activeSentence && activeSentence.index === sentence.index 
                            ? 'rgba(59, 130, 246, 0.2)' 
                            : getSentimentColor(sentence.final_sentiment)
                        }}
                        onClick={() => {
                          if (youtubePlayerRef.current) {
                            youtubePlayerRef.current.seekTo(sentence.start_time);
                          }
                        }}
                      >
                        {sentence.text}{' '}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Click on any sentence to jump to that point in the video
                  </div>
                </div>
              </div>
            </div>
            
            {/* Analyze Another Button */}
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setHasAnalyzed(false);
                  setVideoUrl('');
                  setTranscript('');
                  setSentenceResults([]);
                  setTimelineData([]);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all font-medium"
              >
                Analyze Another Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;