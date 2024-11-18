'use client';
import { useState } from "react";

export default function Home() {
  const [transcript, setTranscript] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(event.currentTarget);
    const videoUrl = formData.get('videoUrl') as string;

    try {
      const response = await fetch('/api/transcript', {
        method: 'POST',
        body: JSON.stringify({ videoUrl }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }

      const data = await response.json();
      setTranscript(data.transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">
          YouTube Transcript Fetcher
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="videoUrl" 
              className="block text-sm font-medium mb-2"
            >
              YouTube Video URL
            </label>
            <input
              type="text"
              id="videoUrl"
              name="videoUrl"
              required
              className="w-full p-2 border rounded-md"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Get Transcript'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        {transcript && (
          <div className="p-4 bg-muted rounded-md">
            <h2 className="text-xl font-semibold mb-4">Transcript:</h2>
            <div className="whitespace-pre-wrap">{transcript}</div>
          </div>
        )}
      </div>
    </div>
  );
}
