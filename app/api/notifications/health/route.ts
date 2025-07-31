import { NextRequest, NextResponse } from 'next/server';

// Simple health check for SSE monitoring
export async function GET(request: NextRequest) {
    try {
        // Basic health check response
        return NextResponse.json(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'notification-sse',
                version: '1.0.0',
                activeConnections: 'Available in production with proper monitoring',
            },
            { status: 200 },
        );
    } catch (error) {
        console.error('[Health Check] Error:', error);
        return NextResponse.json(
            {
                status: 'unhealthy',
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            },
            { status: 500 },
        );
    }
}
