import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';

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

async function fetchTranscriptWithRetry(videoId: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en', // Try English first
      });
      return transcript;
    } catch (error) {
      if (attempt === retries) throw error;
      // Wait for a short time before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

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

      // Combine all transcript parts into one text
      const transcript = transcriptItems
        .map((item: any) => item.text)
        .join('\n');

      return NextResponse.json({ transcript });
    } catch (transcriptError: any) {
      console.error('Specific transcript error:', transcriptError);

      // Handle specific error cases
      if (transcriptError.message?.includes('Transcript is disabled')) {
        return NextResponse.json(
          { error: 'Transcripts are disabled for this video' },
          { status: 403 }
        );
      }

      if (transcriptError.message?.includes('Video is unavailable')) {
        return NextResponse.json(
          { error: 'This video is unavailable or private' },
          { status: 404 }
        );
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