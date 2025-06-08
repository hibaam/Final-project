'use client'

import React, { useState } from 'react';
import { Upload, Play, PieChart, User, BarChart3, Clock, TrendingUp } from 'lucide-react';

const ArcScan = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [showTextBlob, setShowTextBlob] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [viewMode, setViewMode] = useState('pie'); // 'pie' or 'bar'

  // Mock data for demonstration
  const mockTranscript = "Welcome to our product showcase! This is an amazing opportunity to see how our innovative solution can transform your business. We're excited to share these groundbreaking features with you. Some challenges may arise during implementation, but our team is dedicated to helping you succeed. Overall, we believe this will bring tremendous value to your organization.";
  
  const emoRobertaResults = {
    positive: 65,
    negative: 15,
    neutral: 20
  };

  const textBlobResults = {
    positive: 58,
    negative: 22,
    neutral: 20
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasAnalyzed(true);
      setTranscript(mockTranscript);
    }, 2000);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 100 * 1024 * 1024) { // 100MB limit
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
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#positiveGradient)"
              strokeWidth="18"
              strokeDasharray={`${positivePercent * 2.51} ${(100 - positivePercent) * 2.51}`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#negativeGradient)"
              strokeWidth="18"
              strokeDasharray={`${negativePercent * 2.51} ${(100 - negativePercent) * 2.51}`}
              strokeDashoffset={`-${positivePercent * 2.51}`}
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="url(#neutralGradient)"
              strokeWidth="18"
              strokeDasharray={`${neutralPercent * 2.51} ${(100 - neutralPercent) * 2.51}`}
              strokeDashoffset={`-${(positivePercent + negativePercent) * 2.51}`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#10b981', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#34d399', stopOpacity:1}} />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#f97316', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#fb923c', stopOpacity:1}} />
              </linearGradient>
              <linearGradient id="neutralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#fbbf24', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'#fcd34d', stopOpacity:1}} />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
            <div className="flex items-center">
              <span className="text-2xl mr-3">😍</span>
              <span className="font-semibold text-gray-700">Positive</span>
            </div>
            <span className="text-lg font-bold text-green-600">{data.positive}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
            <div className="flex items-center">
              <span className="text-2xl mr-3">😡</span>
              <span className="font-semibold text-gray-700">Negative</span>
            </div>
            <span className="text-lg font-bold text-orange-600">{data.negative}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl">
            <div className="flex items-center">
              <span className="text-2xl mr-3">😐</span>
              <span className="font-semibold text-gray-700">Neutral</span>
            </div>
            <span className="text-lg font-bold text-yellow-600">{data.neutral}%</span>
          </div>
        </div>
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
          <p className="text-sm text-gray-700 font-medium">
            This video is mostly <span className="font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">positive</span> with a sentiment score indicating {data.positive > 50 ? '✨ optimistic' : data.negative > 50 ? '⚡ critical' : '🤝 balanced'} content.
          </p>
        </div>
      </div>
    );
  };

  const BarChartComponent = ({ data, title }) => {
    const maxValue = Math.max(data.positive, data.negative, data.neutral);
    
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8 h-full transform hover:scale-105 transition-all duration-300 hover:shadow-xl">
        <h3 className="text-2xl font-bold mb-6 text-gray-800 font-sans tracking-wide">{title}</h3>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-2xl mr-3">😍</span>
                <span className="font-semibold text-gray-700">Positive</span>
              </div>
              <span className="text-lg font-bold text-green-600">{data.positive}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(data.positive / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-2xl mr-3">😡</span>
                <span className="font-semibold text-gray-700">Negative</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{data.negative}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-400 to-red-500 h-4 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(data.negative / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-2xl mr-3">😐</span>
                <span className="font-semibold text-gray-700">Neutral</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{data.neutral}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-amber-500 h-4 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(data.neutral / maxValue) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
          <p className="text-sm text-gray-700 font-medium">
            This video is mostly <span className="font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">positive</span> with a sentiment score indicating {data.positive > 50 ? '✨ optimistic' : data.negative > 50 ? '⚡ critical' : '🤝 balanced'} content.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section 1: Upload or Analyze */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-purple-100 hover:shadow-2xl transition-all duration-300">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 font-sans tracking-wide">
            🎬 Analyze Your Video
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                YouTube URL
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setVideoFile(null);
                }}
                className="w-full px-4 py-4 border-2 border-purple-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all duration-300 text-lg"
              />
            </div>

            <div className="text-center text-gray-500 font-bold text-lg">✨ OR ✨</div>

            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-3">
                Upload Video File
              </label>
              <div className="border-3 border-dashed border-purple-300 rounded-2xl p-8 text-center hover:border-orange-400 hover:bg-gradient-to-r hover:from-purple-50 hover:to-orange-50 transition-all duration-300 cursor-pointer">
                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-purple-600 hover:text-orange-500 font-bold text-lg transition-colors">
                    🎥 Click to upload
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-md text-gray-600 mt-2 font-medium">
                  Supports YouTube links or MP4 uploads under 100MB
                </p>
              </div>
              {videoFile && (
                <p className="mt-3 text-md text-green-600 font-semibold">
                  ✅ File selected: {videoFile.name}
                </p>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!videoUrl && !videoFile || isAnalyzing}
              className="w-full bg-gradient-to-r from-lime-500 to-green-500 text-white py-4 px-6 rounded-2xl hover:from-lime-600 hover:to-green-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isAnalyzing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  🔄 Analyzing Magic...
                </div>
              ) : (
                '🚀 Analyze'
              )}
            </button>
          </div>
        </div>

        {/* Section 2: Video Display */}
        {(videoUrl || videoFile) && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-purple-100 hover:shadow-2xl transition-all duration-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 font-sans tracking-wide">🎬 Video Preview</h3>
            
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              {videoUrl ? (
                <div className="w-full h-full">
                  <iframe
                    width="100%"
                    height="100%"
                    src={videoUrl.replace('watch?v=', 'embed/')}
                    frameBorder="0"
                    allowFullScreen
                    className="rounded-2xl shadow-lg"
                  ></iframe>
                </div>
              ) : (
                <div className="text-center">
                  <Play className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-semibold text-lg">🎥 Video uploaded: {videoFile?.name}</p>
                </div>
              )}
            </div>

            {hasAnalyzed && transcript && (
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-4 font-sans">📝 Extracted Transcript</h4>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 h-36 overflow-y-auto shadow-inner border border-purple-100">
                  <p className="text-md text-gray-700 leading-relaxed font-medium">{transcript}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Sentiment Analysis Results */}
        {hasAnalyzed && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-8 border border-purple-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 font-sans tracking-wide mb-4 md:mb-0">
                📊 Sentiment Overview
              </h3>
              <div className="flex bg-purple-100 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode('pie')}
                  className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    viewMode === 'pie' 
                      ? 'bg-white text-purple-600 shadow-md' 
                      : 'text-purple-500 hover:text-purple-700'
                  }`}
                >
                  🥧 Pie Chart
                </button>
                <button
                  onClick={() => setViewMode('bar')}
                  className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 ${
                    viewMode === 'bar' 
                      ? 'bg-white text-purple-600 shadow-md' 
                      : 'text-purple-500 hover:text-purple-700'
                  }`}
                >
                  📊 Bar Chart
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Panel A: HuggingFace Results */}
              {viewMode === 'pie' ? (
                <PieChartComponent 
                  data={emoRobertaResults}
                  title="🤗 HuggingFace (EmoRoBERTa)"
                />
              ) : (
                <BarChartComponent 
                  data={emoRobertaResults}
                  title="🤗 HuggingFace (EmoRoBERTa)"
                />
              )}

              {/* Panel B: TextBlob Results */}
              <div className={`transition-all duration-500 ${showTextBlob ? 'opacity-100' : 'opacity-60'}`}>
                {showTextBlob ? (
                  viewMode === 'pie' ? (
                    <PieChartComponent 
                      data={textBlobResults}
                      title="🔤 TextBlob Analysis"
                    />
                  ) : (
                    <BarChartComponent 
                      data={textBlobResults}
                      title="🔤 TextBlob Analysis"
                    />
                  )
                ) : (
                  <div className="bg-white rounded-3xl shadow-lg p-8 h-full flex flex-col items-center justify-center transform hover:scale-105 transition-all duration-300 hover:shadow-xl border-2 border-dashed border-purple-200 hover:border-orange-300">
                    <div className="text-6xl mb-6">🔮</div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-800 font-sans">TextBlob Magic</h3>
                    <p className="text-gray-600 text-center mb-6 font-medium text-lg leading-relaxed">
                      Ready to reveal alternative sentiment insights? ✨
                    </p>
                    <button
                      onClick={() => setShowTextBlob(true)}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 py-3 rounded-2xl hover:from-violet-600 hover:to-purple-700 transition-all duration-300 font-bold text-lg transform hover:scale-105 shadow-lg"
                    >
                      🎭 Show TextBlob Results
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Future Expansion Placeholder */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-purple-100 hover:shadow-2xl transition-all duration-300">
          <div className="text-center py-16">
            <div className="relative mb-8">
              <TrendingUp className="w-24 h-24 text-purple-300 mx-auto mb-4" />
              <div className="absolute -top-2 -right-2 text-4xl animate-bounce">📈</div>
              <div className="absolute -bottom-2 -left-2 text-3xl animate-pulse">😍</div>
              <div className="absolute top-1/2 -right-4 text-3xl animate-bounce delay-500">😐</div>
              <div className="absolute top-1/2 -left-4 text-3xl animate-pulse delay-1000">😡</div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4 font-sans tracking-wide">
              ✨ Sentiment Progression
            </h3>
            <p className="text-purple-600 mb-6 font-bold text-xl">Coming Soon!</p>
            <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 rounded-2xl p-6 mx-auto max-w-md">
              <div className="flex items-center justify-center text-lg text-gray-600 font-medium">
                <Clock className="w-6 h-6 mr-3 text-purple-400" />
                📊 Visual emotional journey throughout the video
              </div>
            </div>
            
            {/* Playful timeline preview */}
            <div className="mt-8 flex justify-center items-end space-x-4 opacity-30">
              <div className="w-3 h-12 bg-green-300 rounded-full"></div>
              <div className="w-3 h-8 bg-yellow-300 rounded-full"></div>
              <div className="w-3 h-16 bg-green-300 rounded-full"></div>
              <div className="w-3 h-6 bg-orange-300 rounded-full"></div>
              <div className="w-3 h-14 bg-green-300 rounded-full"></div>
              <div className="w-3 h-4 bg-yellow-300 rounded-full"></div>
              <div className="w-3 h-18 bg-green-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArcScan;