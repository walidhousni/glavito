import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10'; 

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        results: [],
        totalCount: 0,
        searchTime: 0,
        suggestions: [],
      });
    }

    // Forward the request to the API gateway
    const apiUrl = process.env.API_GATEWAY_URL || 'http://localhost:3001';
    const response = await fetch(
      `${apiUrl}/api/search/federated?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${(session as any).accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        results: [],
        totalCount: 0,
        searchTime: 0,
        suggestions: [],
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}