// app/dashboard/page.jsx
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebaseConfig';
import YouTubePlayer from '@/components/YouTubePlayer';
import SentimentTimeline from '@/components/SentimentTimeline';
import AnalysisProgress from '@/components/AnalysisProgress';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import AdvancedEmotions from '@/components/AdvancedEmotions';


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
  
  // Progress tracking states
  const [progress, setProgress] = useState({ status: "starting", progress: 5, message: "Starting analysis..." });
  const [partialResults, setPartialResults] = useState(null);
  const firebaseListenerRef = useRef(null);

  // Generate document ID in the same way as your backend
  const generateDocId = (url) => {
    return url.replace(/\W+/g, '_');
  };

  // Set up Firebase listener for progress updates
  const setupFirebaseListener = (videoUrl) => {
    if (!videoUrl) return;
    
    // Clear any existing listener
    if (firebaseListenerRef.current) {
      firebaseListenerRef.current();
      firebaseListenerRef.current = null;
    }
    
    const docId = generateDocId(videoUrl);
    console.log("Setting up listener for:", docId);
    
    // Create the listener
    firebaseListenerRef.current = onSnapshot(
      doc(db, "analysis_progress", docId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log("Firebase progress update:", data);
          
          // Update the progress state
          setProgress(data);
          
          // If we've reached the transcribed state, fetch partial results
          if (data.status === 'transcribed' && !partialResults) {
            fetchPartialResults(videoUrl);
          }
          
          // If analysis is complete, fetch the final results
          if (data.status === 'complete' && !hasAnalyzed && progress?.status !== 'complete') {
            fetchFinalResults(videoUrl);
          }
        } else {
          console.log("No progress document found yet");
        }
      },
      (err) => {
        console.error("Error listening to progress updates:", err);
      }
    );
  };

  // Fetch partial results to show transcript preview
  const fetchPartialResults = async (videoUrl) => {
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
      
      if (response.ok) {
        const data = await response.json();
        if (data.transcription) {
          setPartialResults({
            transcription: data.transcription
          });
        }
      }
    } catch (e) {
      console.error("Error fetching partial results:", e);
    }
  };

  // Trigger the analysis with the backend
  const triggerAnalysis = async (videoUrl) => {
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

    if (data.status === 'complete') {
      // Analysis was already cached, show results immediately
      setTranscript(data.transcription);
      setSentenceResults(data.sentences || []);
      setTimelineData(data.timeline_data || []);

      setSentimentSummary({
        positive: data.summary?.Positive?.percentage || 0,
        negative: data.summary?.Negative?.percentage || 0,
        neutral: data.summary?.Neutral?.percentage || 0,
      });

      setHasAnalyzed(true);
      setIsAnalyzing(false);

      // Force progress UI to consider analysis complete
      setProgress({ status: 'complete', progress: 100, message: 'Analysis already completed' });
    }
  } catch (err) {
    console.error("❌ Error during analysis:", err);
    setIsAnalyzing(false);
    setProgress({ status: 'error', progress: 0, message: err.message });
    alert(`Analysis failed: ${err.message}`);
  }
};


  // Fetch final analysis results
  const fetchFinalResults = async (videoUrl) => {
  if (hasAnalyzed) {
    console.log("Results already fetched, skipping redundant request");
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:8000/results/${encodeURIComponent(videoUrl)}`);
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
    setIsAnalyzing(false);
    setProgress(null);
    setPartialResults(null);
  } catch (err) {
    console.error("❌ Error fetching final results:", err);
    setIsAnalyzing(false);
    alert(`Failed to fetch results: ${err.message}`);
  }
};


  // Handle analyze request
  const handleAnalyze = async () => {
    if (!videoUrl || !user) return;

    // Reset analysis state
    setIsAnalyzing(true);
    setHasAnalyzed(false);
    setProgress({ status: "starting", progress: 5, message: "Starting analysis..." });
    setPartialResults(null);
    
    // Set up Firebase listener
    setupFirebaseListener(videoUrl);
    
    // Trigger the analysis
    await triggerAnalysis(videoUrl);
  };

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (firebaseListenerRef.current) {
        firebaseListenerRef.current();
        firebaseListenerRef.current = null;
      }
    };
  }, []);

  const handlePlayerReady = (player) => {
    youtubePlayerRef.current = player;
  };

  const findActiveSentence = () => {
    if (!sentenceResults.length) return null;
    return sentenceResults.find(sentence => 
      currentTime >= sentence.start_time && currentTime <= sentence.end_time
    );
  };

  const activeSentence = findActiveSentence();

  const getSentimentColor = (sentiment, opacity = 0.2) => {
    const colors = {
      'Positive': `rgba(16, 185, 129, ${opacity})`,
      'Negative': `rgba(239, 68, 68, ${opacity})`,
      'Neutral': `rgba(251, 191, 36, ${opacity})`
    };
    return colors[sentiment] || colors['Neutral'];
  };

  // Reset function
  const resetAnalysis = () => {
    if (firebaseListenerRef.current) {
      firebaseListenerRef.current();
      firebaseListenerRef.current = null;
    }
    setHasAnalyzed(false);
    setIsAnalyzing(false);
    setVideoUrl('');
    setTranscript('');
    setSentenceResults([]);
    setTimelineData([]);
    setProgress(null);
    setPartialResults(null);
    setSentimentSummary({ positive: 0, negative: 0, neutral: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎬 Analyze a YouTube Video</h1>
        
        {/* Input Form - Only show when not analyzing or analyzed */}
        {!isAnalyzing && !hasAnalyzed && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <input
              type="url"
              placeholder="Paste YouTube URL here..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={!videoUrl}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Start Analysis
            </button>
          </div>
        )}

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="space-y-6">
            <AnalysisProgress 
              progress={progress} 
              partialResults={partialResults}
            />
            
            <div className="text-center">
              <button
                onClick={resetAnalysis}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
              >
                Cancel Analysis
              </button>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {hasAnalyzed && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <YouTubePlayer 
                    videoUrl={videoUrl}
                    onTimeUpdate={setCurrentTime}
                    onReady={handlePlayerReady}
                  />
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">📊 Sentiment Timeline</h2>
                  <div className="h-40">
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
              
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">🤗 Sentiment Summary</h2>
                  <div className="flex justify-center">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="18"
                          strokeDasharray={`${sentimentSummary.positive * 2.51} ${(100 - sentimentSummary.positive) * 2.51}`} 
                          strokeLinecap="round" 
                        />
                        <circle 
                          cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="18"
                          strokeDasharray={`${sentimentSummary.negative * 2.51} ${(100 - sentimentSummary.negative) * 2.51}`}
                          strokeDashoffset={`-${sentimentSummary.positive * 2.51}`} 
                          strokeLinecap="round" 
                        />
                        <circle 
                          cx="50" cy="50" r="40" fill="none" stroke="#fbbf24" strokeWidth="18"
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

                <div className="bg-white rounded-xl shadow-md p-4">
                  <h2 className="text-xl font-semibold mb-2">📝 Transcript</h2>
                  <div className="max-h-[calc(100vh-24rem)] overflow-y-auto text-sm">
                    {sentenceResults.map((sentence, index) => (
                      <span
                        key={index}
                        className={`inline transition-colors duration-200 cursor-pointer hover:bg-opacity-40 ${
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
            
            <div className="text-center mt-4">
              <button
                onClick={resetAnalysis}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all font-medium"
              >
                Analyze Another Video
              </button>
            </div>
            <div className="my-10 border-t border-gray-200"></div>

<AdvancedEmotions 
  videoUrl={videoUrl} 
  userId={user?.uid} 
/>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;