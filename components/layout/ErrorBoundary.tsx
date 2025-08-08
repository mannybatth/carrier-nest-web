import React, { Component, ErrorInfo, ReactNode } from 'react';
import { signOut } from 'next-auth/react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);

        // Check if this is a session-related error
        if (
            error.message?.includes('ACCOUNT_DEACTIVATED') ||
            error.message?.includes('SESSION_EXPIRED') ||
            error.message?.includes('JWT')
        ) {
            console.log('Session error detected in ErrorBoundary, redirecting to sign-in');
            window.location.href = '/auth/signin?error=SESSION_EXPIRED';
        }
    }

    public render() {
        if (this.state.hasError) {
            // Check if this is a session error and redirect instead of showing error UI
            if (
                this.state.error?.message?.includes('ACCOUNT_DEACTIVATED') ||
                this.state.error?.message?.includes('SESSION_EXPIRED') ||
                this.state.error?.message?.includes('JWT')
            ) {
                // Component will be unmounted, so just return a loading state
                return (
                    <div className="flex items-center justify-center h-screen">
                        <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600">Redirecting to sign in...</p>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center max-w-md">
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Something went wrong</h1>
                        <p className="text-gray-600 mb-6">
                            An unexpected error occurred. Please try refreshing the page or contact support if the
                            problem persists.
                        </p>
                        <div className="space-y-3">
                            <button
                                className="w-full px-4 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors duration-200"
                                onClick={() => window.location.reload()}
                            >
                                Reload Page
                            </button>
                            <button
                                className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                                onClick={() => this.setState({ hasError: false })}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
