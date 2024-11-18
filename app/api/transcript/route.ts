import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';

// Define types for the transcript response
interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
}

function extractVideoId(url: string): string | null {
  try {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchTranscriptWithRetry(videoId: string, retries = 2): Promise<TranscriptItem[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try different language options if available
      const options = [
        { lang: 'en' },
        { lang: 'en-US' },
        { lang: 'en-GB' },
        {} // try without language specification
      ];

      for (const option of options) {
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(videoId, option);
          if (transcript && transcript.length > 0) {
            return transcript;
          }
        } catch {
          // Continue to next option if this one fails
          continue;
        }
      }

      throw new Error('No transcript available in any language');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === retries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      await new Promise(resolve => 
        setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt) + jitter, 5000))
      );
    }
  }
  
  throw lastError || new Error('Failed to fetch transcript after retries');
}

export const runtime = 'edge';
export async function POST(request: Request) {
  try {
    const { videoUrl } = await request.json();

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL. Please provide a valid YouTube video URL' },
        { status: 400 }
      );
    }

    try {
      const transcriptItems = await fetchTranscriptWithRetry(videoId);
      
      if (!transcriptItems || transcriptItems.length === 0) {
        return NextResponse.json(
          { error: 'No transcript available for this video' },
          { status: 404 }
        );
      }

      const transcript = transcriptItems
        .map(item => item.text)
        .join('\n');

      return NextResponse.json({ transcript });
    } catch (transcriptError) {
      console.error('Transcript error:', transcriptError);

      if (transcriptError instanceof Error) {
        const errorMessage = transcriptError.message.toLowerCase();
        
        if (errorMessage.includes('timeout')) {
          return NextResponse.json(
            { error: 'Request timed out. Please try again.' },
            { status: 408 }
          );
        }
        if (errorMessage.includes('transcript is disabled') || errorMessage.includes('no transcript available')) {
          return NextResponse.json(
            { error: 'No transcript is available for this video' },
            { status: 404 }
          );
        }
        if (errorMessage.includes('video is unavailable')) {
          return NextResponse.json(
            { error: 'This video is unavailable or private' },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Unable to fetch transcript. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
} 