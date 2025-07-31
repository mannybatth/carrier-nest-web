import React, { useState, useEffect } from 'react';
import { useSSENotifications } from '../../hooks/useSSENotifications';
import { useSession } from 'next-auth/react';
import { PageWithAuth } from '../../interfaces/auth';
import Head from 'next/head';

interface NotificationStats {
    totalNotifications: number;
    todayNotifications: number;
    activeConnections: number;
    errorRate: number;
    avgResponseTime: number;
    lastProcessed: string;
    systemHealth: 'healthy' | 'warning' | 'critical';
}

interface NotificationLog {
    id: string;
    timestamp: string;
    type: string;
    userContact: string; // Changed from userEmail to userContact
    carrierId: string;
    status: 'sent' | 'failed' | 'filtered';
    title: string;
}

interface SSEConnection {
    id: string;
    userId: string;
    carrierId: string;
    connectedAt: string;
    lastHeartbeat: string;
    status: 'active' | 'stale' | 'disconnected';
    userAgent: string;
}

const NotificationAdminPage = () => {
    const { data: session } = useSession();
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [connections, setConnections] = useState<SSEConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'overview' | 'logs' | 'connections' | 'health'>('overview');
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Pagination state for logs
    const [currentPage, setCurrentPage] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    const [logsLoading, setLogsLoading] = useState(false);
    const logsPerPage = 100;

    // Real-time updates for admin monitoring
    const { connected: sseConnected, error: sseError } = useSSENotifications((notification) => {
        // Update logs in real-time when new notifications are processed
        if (selectedTab === 'logs') {
            // Reset to first page to show newest notifications
            setCurrentPage(1);
            fetchLogs(1);
        }
        fetchStats();
    });

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/notifications/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchLogs = async (page: number = currentPage) => {
        setLogsLoading(true);
        try {
            const offset = (page - 1) * logsPerPage;
            const response = await fetch(`/api/admin/notifications/logs?limit=${logsPerPage}&offset=${offset}`);
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs || data); // Handle both paginated and non-paginated responses
                if (data.total !== undefined) {
                    setTotalLogs(data.total);
                }
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLogsLoading(false);
        }
    };

    const fetchConnections = async () => {
        try {
            const response = await fetch('/api/admin/notifications/connections');
            if (response.ok) {
                const data = await response.json();
                setConnections(data);
            }
        } catch (err) {
            console.error('Failed to fetch connections:', err);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchStats(),
                selectedTab === 'logs' ? fetchLogs() : Promise.resolve(),
                fetchConnections(),
            ]);
            setError(null);
        } catch (err) {
            setError('Failed to load notification data');
        } finally {
            setLoading(false);
        }
    };

    // Function to handle page changes
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchLogs(page);
    };

    // Calculate pagination info
    const totalPages = Math.ceil(totalLogs / logsPerPage);
    const startRecord = (currentPage - 1) * logsPerPage + 1;
    const endRecord = Math.min(currentPage * logsPerPage, totalLogs);

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(fetchAllData, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    // Load logs when logs tab is selected
    useEffect(() => {
        if (selectedTab === 'logs' && logs.length === 0) {
            fetchLogs(1);
        }
    }, [selectedTab]);

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'healthy':
                return 'text-green-600 bg-green-100';
            case 'warning':
                return 'text-yellow-600 bg-yellow-100';
            case 'critical':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent':
            case 'active':
                return 'text-green-600 bg-green-100';
            case 'failed':
            case 'disconnected':
                return 'text-red-600 bg-red-100';
            case 'filtered':
            case 'stale':
                return 'text-yellow-600 bg-yellow-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    // Check if user is admin
    if (!session || !session.user?.isSiteAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600">You need site admin privileges to access this page.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Notification Admin Dashboard</title>
            </Head>
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Notification System Dashboard</h1>
                                <p className="mt-2 text-gray-600">
                                    Monitor and manage the real-time notification system
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <div
                                        className={`w-3 h-3 rounded-full mr-2 ${
                                            sseConnected ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                    ></div>
                                    <span className="text-sm text-gray-600">
                                        SSE {sseConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`px-3 py-1 text-sm rounded-md ${
                                        autoRefresh ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
                                </button>
                                <button
                                    onClick={fetchAllData}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Stats Overview */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Total Notifications</h3>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.totalNotifications.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Today&apos;s Notifications</h3>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.todayNotifications.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">Active Connections</h3>
                                <p className="text-2xl font-bold text-gray-900">{stats.activeConnections}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-sm font-medium text-gray-500">System Health</h3>
                                <div className="flex items-center mt-2">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(
                                            stats.systemHealth,
                                        )}`}
                                    >
                                        {stats.systemHealth.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            {['overview', 'logs', 'connections', 'health'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setSelectedTab(tab as any)}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                        selectedTab === tab
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {selectedTab === 'overview' && stats && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Error Rate</span>
                                            <span
                                                className={`font-medium ${
                                                    stats.errorRate > 5 ? 'text-red-600' : 'text-green-600'
                                                }`}
                                            >
                                                {stats.errorRate.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Avg Response Time</span>
                                            <span className="font-medium">{stats.avgResponseTime}ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Last Processed</span>
                                            <span className="font-medium">
                                                {new Date(stats.lastProcessed).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-lg shadow">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">SSE Endpoint</span>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    sseConnected
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {sseConnected ? 'Operational' : 'Down'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Database</span>
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Operational
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-600">Notification Service</span>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(
                                                    stats.systemHealth,
                                                )}`}
                                            >
                                                {stats.systemHealth === 'healthy' ? 'Operational' : stats.systemHealth}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'logs' && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Recent Notification Logs</h3>
                                    <div className="flex items-center space-x-4">
                                        {totalLogs > 0 && (
                                            <span className="text-sm text-gray-500">
                                                Showing {startRecord}-{endRecord} of {totalLogs.toLocaleString()} logs
                                            </span>
                                        )}
                                        <button
                                            onClick={() => fetchLogs(currentPage)}
                                            disabled={logsLoading}
                                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                                        >
                                            {logsLoading ? 'Loading...' : 'Refresh'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Timestamp
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User Contact
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {logsLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center">
                                                    <div className="flex justify-center items-center">
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                        <span className="ml-2 text-gray-500">Loading logs...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    No logs found
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {log.type}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {log.userContact || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                                log.status,
                                                            )}`}
                                                        >
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {log.title || 'No title'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalLogs > logsPerPage && (
                                <div className="px-6 py-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-500">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handlePageChange(1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                First
                                            </button>
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>

                                            {/* Page numbers */}
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }

                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className={`px-3 py-1 text-sm border rounded-md ${
                                                            currentPage === pageNum
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                            <button
                                                onClick={() => handlePageChange(totalPages)}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Last
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTab === 'connections' && (
                        <div className="bg-white rounded-lg shadow">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-medium text-gray-900">Active SSE Connections</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Connection ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Connected At
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Last Heartbeat
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                User Agent
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {connections.map((connection) => (
                                            <tr key={connection.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {connection.id ? connection.id.slice(0, 8) + '...' : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {connection.userId ? connection.userId.slice(0, 8) + '...' : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(connection.connectedAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(connection.lastHeartbeat).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                            connection.status,
                                                        )}`}
                                                    >
                                                        {connection.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                                                    {connection.userAgent}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedTab === 'health' && stats && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">System Health Check</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Overall System Status</h4>
                                            <p className="text-sm text-gray-600">
                                                General health of the notification system
                                            </p>
                                        </div>
                                        <span
                                            className={`px-3 py-2 rounded-full text-sm font-medium ${getHealthColor(
                                                stats.systemHealth,
                                            )}`}
                                        >
                                            {stats.systemHealth.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Error Rate</h4>
                                            <p className="text-sm text-gray-600">Percentage of failed notifications</p>
                                        </div>
                                        <span
                                            className={`px-3 py-2 rounded-full text-sm font-medium ${
                                                stats.errorRate > 10
                                                    ? 'bg-red-100 text-red-800'
                                                    : stats.errorRate > 5
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}
                                        >
                                            {stats.errorRate.toFixed(2)}%
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Response Time</h4>
                                            <p className="text-sm text-gray-600">
                                                Average notification processing time
                                            </p>
                                        </div>
                                        <span
                                            className={`px-3 py-2 rounded-full text-sm font-medium ${
                                                stats.avgResponseTime > 1000
                                                    ? 'bg-red-100 text-red-800'
                                                    : stats.avgResponseTime > 500
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                            }`}
                                        >
                                            {stats.avgResponseTime}ms
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Active Connections</h4>
                                            <p className="text-sm text-gray-600">Number of live SSE connections</p>
                                        </div>
                                        <span className="px-3 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                            {stats.activeConnections} active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

NotificationAdminPage.authenticationEnabled = true;

export default NotificationAdminPage;
