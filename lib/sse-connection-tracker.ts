// Connection tracking for SSE admin monitoring

interface SSEConnectionInfo {
    id: string;
    userId: string;
    carrierId: string;
    connectedAt: Date;
    lastHeartbeat: Date;
    userAgent: string;
    ipAddress?: string;
}

class SSEConnectionTracker {
    private connections = new Map<string, SSEConnectionInfo>();
    private controllers = new Set<ReadableStreamDefaultController>();

    addConnection(
        controller: ReadableStreamDefaultController,
        userId: string,
        carrierId: string,
        userAgent: string,
        ipAddress?: string,
    ): string {
        const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

        const connectionInfo: SSEConnectionInfo = {
            id: connectionId,
            userId,
            carrierId,
            connectedAt: new Date(),
            lastHeartbeat: new Date(),
            userAgent,
            ipAddress,
        };

        this.connections.set(connectionId, connectionInfo);
        this.controllers.add(controller);

        return connectionId;
    }

    removeConnection(connectionId: string, controller: ReadableStreamDefaultController): void {
        this.connections.delete(connectionId);
        this.controllers.delete(controller);
    }

    updateHeartbeat(connectionId: string): void {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.lastHeartbeat = new Date();
        }
    }

    getActiveConnections(): SSEConnectionInfo[] {
        const now = Date.now();
        const activeConnections: SSEConnectionInfo[] = [];

        this.connections.forEach((connection) => {
            const timeSinceHeartbeat = now - connection.lastHeartbeat.getTime();

            // Only include connections that have had a heartbeat in the last 5 minutes
            if (timeSinceHeartbeat <= 300000) {
                // 5 minutes
                activeConnections.push(connection);
            } else {
                // Clean up stale connections
                this.connections.delete(connection.id);
            }
        });

        return activeConnections;
    }

    getConnectionCount(): number {
        return this.getActiveConnections().length;
    }

    getAllControllers(): Set<ReadableStreamDefaultController> {
        return this.controllers;
    }

    closeAllConnections(): void {
        this.controllers.forEach((controller) => {
            try {
                if (controller.desiredSize !== null) {
                    controller.enqueue(
                        `data: ${JSON.stringify({ type: 'shutdown', message: 'Server shutting down' })}\n\n`,
                    );
                    controller.close();
                }
            } catch (error) {
                console.warn('[SSE] Error closing connection during shutdown:', error);
            }
        });

        this.controllers.clear();
        this.connections.clear();
    }
}

// Singleton instance for global connection tracking
export const sseConnectionTracker = new SSEConnectionTracker();

// Export types for use in other modules
export type { SSEConnectionInfo };
