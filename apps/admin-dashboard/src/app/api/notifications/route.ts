import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/config';

// GET /api/notifications - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    
    // Forward request to backend API gateway
    const response = await api.get('/notifications', {
      params: {
        page,
        limit,
        unreadOnly,
      },
    });
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: error.response?.status || 500 }
    );
  }
}

// POST /api/notifications - Create a new notification (for testing/admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await api.post('/notifications', body);
    
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: error.response?.status || 500 }
    );
  }
}

// DELETE /api/notifications - Clear all notifications
export async function DELETE(request: NextRequest) {
  try {
    await api.delete('/notifications');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to clear notifications:', error);
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: error.response?.status || 500 }
    );
  }
}