'use client'

import React, { useState } from 'react';
import { Upload, Play, PieChart, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { auth } from '@/lib/firebaseConfig';
import { useAuthState } from 'react-firebase-hooks/auth';

const ArcScan = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [viewMode, setViewMode] = useState('pie');

  const [emoRobertaResults, setEmoRobertaResults] = useState({ positive: 0, negative: 0, neutral: 0 });

  const [user] = useAuthState(auth);

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

      const data = await response.json();

      setTranscript(data.transcription);

      setEmoRobertaResults({
        positive: data.summary?.Positive?.percentage || 0,
        negative: data.summary?.Negative?.percentage || 0,
        neutral: data.summary?.Neutral?.percentage || 0,
      });

      setHasAnalyzed(true);
    } catch (err) {
      console.error("❌ Error during analysis:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 100 * 1024 * 1024) {
      setVideoFile(file);
      setVideoUrl('');
    }
  };

  const PieChartComponent = ({ data, title }) => {
    const total = data.positive + data.negative + data.neutral;
    const positivePercent = (data.positive / total) * 100;
    const negativePercent = (data.negative / total) * 100;
    const neutralPercent = (data.neutral / total) * 100;

    return (
      <div className="bg-white rounded-3xl shadow-lg p-8 h-full transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-2xl font-bold mb-6 text-gray-800 font-sans tracking-wide">{title}</h3>
        <div className="relative w-52 h-52 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="url(#positiveGradient)" strokeWidth="18"
              strokeDasharray={`${positivePercent * 2.51} ${(100 - positivePercent) * 2.51}`} strokeLinecap="round" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="url(#negativeGradient)" strokeWidth="18"
              strokeDasharray={`${negativePercent * 2.51} ${(100 - negativePercent) * 2.51}`}
              strokeDashoffset={`-${positivePercent * 2.51}`} strokeLinecap="round" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="url(#neutralGradient)" strokeWidth="18"
              strokeDasharray={`${neutralPercent * 2.51} ${(100 - neutralPercent) * 2.51}`}
              strokeDashoffset={`-${(positivePercent + negativePercent) * 2.51}`} strokeLinecap="round" />
            <defs>
              {/* Green for positive sentiment */}
              <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 1 }} /> {/* Darker green */}
                <stop offset="100%" style={{ stopColor: '#34d399', stopOpacity: 1 }} /> {/* Lighter green */}
              </linearGradient>
              {/* Red for negative sentiment */}
              <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} /> {/* Darker red */}
                <stop offset="100%" style={{ stopColor: '#f87171', stopOpacity: 1 }} /> {/* Lighter red */}
              </linearGradient>
              {/* Yellow for neutral sentiment */}
              <linearGradient id="neutralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} /> {/* Darker yellow */}
                <stop offset="100%" style={{ stopColor: '#fcd34d', stopOpacity: 1 }} /> {/* Lighter yellow */}
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}></div>
              <span>😍 Positive</span>
            </div>
            <span>{data.positive.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}></div>
              <span>😡 Negative</span>
            </div>
            <span>{data.negative.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2" style={{ background: 'linear-gradient(135deg, #fbbf24, #fcd34d)' }}></div>
              <span>😐 Neutral</span>
            </div>
            <span>{data.neutral.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎬 Analyze a YouTube Video</h1>
        <input
          type="url"
          placeholder="Paste YouTube URL here..."
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            setVideoFile(null);
          }}
          className="w-full p-4 mb-4 border border-gray-300 rounded-xl"
        />
        <button
          onClick={handleAnalyze}
          disabled={!videoUrl || isAnalyzing}
          className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all"
        >
          {isAnalyzing ? 'Analyzing...' : '🚀 Start Analysis'}
        </button>

        {hasAnalyzed && (
          <div className="mt-10 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">📝 Transcript</h2>
              <div className="p-4 bg-white rounded-xl shadow-md max-h-64 overflow-y-auto">{transcript}</div>
            </div>
            <PieChartComponent data={emoRobertaResults} title="🤗 EmoRoBERTa Sentiment Summary" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArcScan;