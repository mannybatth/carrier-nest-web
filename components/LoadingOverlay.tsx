import React from 'react';

interface LoadingOverlayProps {
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500 ease-out">
            <div role="status" className="relative">
                {/* Outer ring */}
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-100 rounded-full animate-pulse"></div>

                {/* Spinning ring */}
                <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 border-r-blue-500 rounded-full animate-spin"></div>

                {/* Inner dot */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping"></div>
            </div>

            <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-gray-800 animate-pulse">{message}</p>
                <div className="flex justify-center mt-2 space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                    ></div>
                </div>
            </div>

            <span className="sr-only">{message}</span>
        </div>
    </div>
);
