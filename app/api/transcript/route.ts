import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';

function extractVideoId(url: string): string | null {
  try {
    // Handle different YouTube URL formats
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
  } catch (_) {
    return null;
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

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcriptItems || transcriptItems.length === 0) {
      return NextResponse.json(
        { error: 'No transcript available for this video' },
        { status: 404 }
      );
    }

    // Combine all transcript parts into one text
    const transcript = transcriptItems
      .map(item => item.text)
      .join('\n');

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcript fetch error:', error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No transcript available')) {
        return NextResponse.json(
          { error: 'No transcript available for this video' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch transcript. Please make sure the video exists and has captions available.' },
      { status: 500 }
    );
  }
} 