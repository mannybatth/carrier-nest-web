import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { NextAuthRequest } from 'next-auth/lib';
import { sseConnectionTracker, SSEConnectionInfo } from '../../../../../lib/sse-connection-tracker';

interface SSEConnection {
    id: string;
    userId: string;
    carrierId: string;
    connectedAt: string;
    lastHeartbeat: string;
    status: 'active' | 'stale' | 'disconnected';
    userAgent: string;
}

export const GET = auth(async (req: NextAuthRequest) => {
    const session = req.auth;

    if (!session || !session.user?.isSiteAdmin) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    try {
        // Get real active connections from the connection tracker
        const activeConnections = sseConnectionTracker.getActiveConnections();

        // Transform the connection data to match the expected interface
        const connections: SSEConnection[] = activeConnections.map((conn: SSEConnectionInfo) => {
            const timeSinceHeartbeat = Date.now() - conn.lastHeartbeat.getTime();

            let status: 'active' | 'stale' | 'disconnected' = 'active';
            if (timeSinceHeartbeat > 300000) {
                // 5 minutes
                status = 'disconnected';
            } else if (timeSinceHeartbeat > 180000) {
                // 3 minutes
                status = 'stale';
            }

            return {
                id: conn.id,
                userId: conn.userId,
                carrierId: conn.carrierId,
                connectedAt: conn.connectedAt.toISOString(),
                lastHeartbeat: conn.lastHeartbeat.toISOString(),
                status,
                userAgent: conn.userAgent,
            };
        });

        // Sort by connection time (newest first)
        connections.sort((a, b) => new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime());

        return NextResponse.json(connections);
    } catch (error) {
        console.error('Error fetching SSE connections:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
