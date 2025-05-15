'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoginButton from '@/components/ui/LoginButton';

export default function Dashboard() {
  const [videoUrl, setVideoUrl] = useState('');
  const [transcription, setTranscription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUrlChange = (e) => {
    setVideoUrl(e.target.value);
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTranscription('');

    try {
      const response = await fetch('http://127.0.0.1:8000/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze the video. Please try again.');
      }

      const data = await response.json();
      if (data.transcription) {
        setTranscription(data.transcription);
      } else {
        setError(data.error || 'No transcription available.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <LoginButton />
      </div>

      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Analyze Video</CardTitle>
            <CardDescription>
              Provide a YouTube URL for transcription analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">YouTube URL</TabsTrigger>
              </TabsList>
              <TabsContent value="url">
                <form onSubmit={handleUrlSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="video-url">YouTube URL</Label>
                    <Input
                      type="url"
                      id="video-url"
                      value={videoUrl}
                      onChange={handleUrlChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </form>
                {error && <p className="text-red-500 mt-4">{error}</p>}
                {transcription && (
                  <div className="mt-4">
                    <h2 className="text-lg font-bold">Transcription:</h2>
                    <p className="whitespace-pre-wrap">{transcription}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
