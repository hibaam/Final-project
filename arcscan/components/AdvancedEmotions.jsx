// components/AdvancedEmotions.jsx
'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Color palette for emotions
const EMOTION_COLORS = {
  joy: '#FFD700',            // Gold
  sadness: '#6495ED',        // Cornflower Blue
  anger: '#FF4500',          // Red-Orange  
  fear: '#800080',           // Purple
  surprise: '#00FFFF',       // Cyan
  disgust: '#32CD32',        // Lime Green
  trust: '#FFA07A',          // Light Salmon
  anticipation: '#FF69B4',   // Hot Pink

  // Additional detected emotions
  admiration: '#9370DB',     // Medium Purple
  approval: '#20B2AA',       // Light Sea Green
  neutral: '#87CEEB',        // Sky Blue (Improved for visibility)
  optimism: '#F4A460',       // Sandy Brown
  confusion: '#778899',      // Light Slate Gray
  gratitude: '#DA70D6',      // Orchid
  caring: '#FF6347',         // Tomato
  realization: '#7B68EE',    // Medium Slate Blue
  annoyance: '#B22222',      // Firebrick
  disappointment: '#A0522D', // Sienna
  disapproval: '#2E8B57',    // Sea Green
  grief: '#708090',          // Slate Gray
  love: '#FF1493',           // Deep Pink
  nervousness: '#FF8C00',    // Dark Orange
  relief: '#3CB371',          // Medium Sea Blue
  curiosity: '#40E0D0',   // Turquoise
  excitement: '#FF8C00',  // Dark Orange - 
pride: '#8B0000',       // Dark Red - 
amusement: '#FF69B4'    // Hot Pink - 

}

export default function AdvancedEmotions({ videoUrl, userId }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [advancedData, setAdvancedData] = useState(null)
  const [activeTab, setActiveTab] = useState('timeline')

  const fetchAdvancedAnalysis = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Start the analysis
      const response = await fetch('/api/analyze/advanced-emotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl, user_id: userId }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch advanced analysis')
      }
      
      // If we get an immediate response, use it
      const data = await response.json()
      
      // Check if analysis is complete or if we need to poll for progress
      if (data.status === 'complete' || data.emotion_timeline) {
        setAdvancedData(data)
        setLoading(false)
      } else {
        // Start polling for progress
        pollForProgress()
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }
  
  // Poll for analysis progress
  const pollForProgress = async () => {
    const encodedUrl = encodeURIComponent(videoUrl)
    const pollInterval = setInterval(async () => {
      try {
        const progressRes = await fetch(`/api/progress/advanced/${encodedUrl}`)
        const progressData = await progressRes.json()
        
        setProgress(progressData.progress || 0)
        
        // If complete, fetch the results and stop polling
        if (progressData.status === 'complete' || progressData.status === 'complete_advanced') {
          clearInterval(pollInterval)
          
          // Fetch the completed analysis
          const resultsRes = await fetch(`/api/results/advanced/${encodedUrl}`)
          if (resultsRes.ok) {
            const resultsData = await resultsRes.json()
            setAdvancedData(resultsData)
            setLoading(false)
          } else {
            throw new Error('Failed to retrieve analysis results')
          }
        } else if (progressData.status === 'error' || progressData.status === 'error_advanced') {
          clearInterval(pollInterval)
          throw new Error(progressData.message || 'Analysis failed')
        }
      } catch (err) {
        clearInterval(pollInterval)
        setError(err.message)
        setLoading(false)
      }
    }, 2000) // Poll every 2 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(pollInterval)
  }
  
  // Format timestamp (seconds) to MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Prepare data for pie chart
  const preparePieData = () => {
    if (!advancedData?.emotion_summary) return []
    
    return Object.entries(advancedData.emotion_summary).map(([emotion, data]) => ({
      name: emotion,
      value: data.average_score,
      count: data.occurrences
    }))
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 my-8">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Advanced Emotion Analysis</h3>
        <p className="text-gray-600">
          Discover the complex emotional journey in your video content
        </p>
        
        {!advancedData && !loading && (
          <button
            onClick={fetchAdvancedAnalysis}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-semibold shadow-md transition hover:shadow-lg hover:scale-105"
          >
            Show Complex Emotions
          </button>
        )}
        
        {loading && (
          <div className="mt-6">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                    Analyzing
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-purple-600">
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                <div 
                  style={{ width: `${progress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-500"
                ></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-lg mt-4">
            {error}
          </div>
        )}
      </div>
      
      {advancedData && (
        <>
          {/* Tab Navigation */}
          <div className="flex justify-center mb-6 border-b">
            <button
              className={`px-4 py-2 ${activeTab === 'timeline' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('timeline')}
            >
              Emotion Timeline
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'summary' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('summary')}
            >
              Emotion Summary
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'transcript' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-gray-500'}`}
              onClick={() => setActiveTab('transcript')}
            >
              Emotional Transcript
            </button>
          </div>
          
          {/* Timeline View */}
         {activeTab === 'timeline' && (
  <div className="h-96">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={advancedData.emotion_timeline}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tickFormatter={formatTime}
          label={{ value: 'Time (MM:SS)', position: 'insideBottom', offset: -5 }}
        />
        <YAxis label={{ value: 'Intensity', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          formatter={(value, name) => [
            `${(value * 100).toFixed(1)}%`, 
            name.charAt(0).toUpperCase() + name.slice(1)
          ]}
          labelFormatter={(value) => `Time: ${formatTime(value)}`}
        />
        <Legend />
        {/* Dynamically render only detected emotions with data */}
        {Object.keys(advancedData.emotion_timeline[0] || {})
          .filter(key => key !== 'time')
          .map((emotion) => {
            const hasData = advancedData.emotion_timeline.some(point => point[emotion] > 0.01);
            if (!hasData) return null;

            const color = EMOTION_COLORS[emotion] || 
              `#${Math.floor(Math.random()*16777215).toString(16)}`;

            return (
              <Line
                key={emotion}
                type="monotone"
                dataKey={emotion}
                stroke={color}
                activeDot={{ r: 8 }}
                strokeWidth={2}
                name={emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              />
            );
          })}
      </LineChart>
    </ResponsiveContainer>
  </div>

          )}
          
          {/* Summary View */}
          {activeTab === 'summary' && (
            <div className="flex flex-col md:flex-row items-center">
              {/* Pie Chart */}
              <div className="w-full md:w-1/2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePieData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {preparePieData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={EMOTION_COLORS[entry.name] || '#CCCCCC'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Text Summary */}
              <div className="w-full md:w-1/2 p-4">
                <h4 className="text-xl font-bold mb-4">Emotional Profile</h4>
                <div className="space-y-3">
                  {Object.entries(advancedData.emotion_summary || {}).sort((a, b) => 
                    b[1].average_score - a[1].average_score
                  ).map(([emotion, data]) => (
                    <div key={emotion} className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: EMOTION_COLORS[emotion] || '#CCCCCC' }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">{emotion}</span>
                          <span>{data.average_score}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ 
                              width: `${data.average_score}%`, 
                              backgroundColor: EMOTION_COLORS[emotion] || '#CCCCCC' 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Transcript View */}
          {activeTab === 'transcript' && (
            <div className="max-h-96 overflow-y-auto">
              {(advancedData.sentence_emotions || []).map((item, index) => (
                <div key={index} className="mb-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                  </div>
                  <p className="mb-2">{item.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {(item.emotions || []).map((emotion, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full text-white"
                        style={{ 
                          backgroundColor: EMOTION_COLORS[emotion.emotion] || '#888',
                          opacity: Math.max(0.5, emotion.score / 100)  // Ensure minimum opacity for readability
                        }}
                      >
                        {emotion.emotion}: {emotion.score}%
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}