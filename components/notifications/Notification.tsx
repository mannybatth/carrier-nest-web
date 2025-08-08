import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React from 'react';
import toast from 'react-hot-toast';

type Props = {
    title: string;
    message?: string;
    type?: 'success' | 'error';
};

export const notify = ({ title, message, type = 'success' }: Props) =>
    toast.custom(
        (t) => (
            <div
                className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full pointer-events-auto group`}
            >
                {/* Apple-style Liquid Glass Container */}
                <div className="relative">
                    {/* Main notification card with enhanced glass effect */}
                    <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/15 border border-white/40 ring-1 ring-gray-900/5 transition-all duration-300 hover:shadow-3xl hover:shadow-black/20 hover:scale-[1.02] overflow-hidden">
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-gray-100/20 pointer-events-none" />

                        <div className="relative p-5">
                            <div className="flex items-start gap-4">
                                {/* Enhanced icon with background */}
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                                        type === 'success'
                                            ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-green-500/25'
                                            : 'bg-gradient-to-br from-red-400 to-red-500 shadow-red-500/25'
                                    }`}
                                >
                                    {type === 'success' ? (
                                        <CheckCircleIcon
                                            className="w-5 h-5 text-white drop-shadow-sm"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <XMarkIcon className="w-5 h-5 text-white drop-shadow-sm" aria-hidden="true" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-gray-900 leading-5 tracking-tight">
                                        {title}
                                    </h3>
                                    {message && <p className="mt-1.5 text-sm text-gray-700 leading-5">{message}</p>}
                                </div>

                                {/* Enhanced close button */}
                                <button
                                    className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100/60 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:scale-110 active:scale-95"
                                    onClick={() => toast.dismiss(t.id)}
                                >
                                    <span className="sr-only">Close</span>
                                    <XMarkIcon className="w-4 h-4 text-gray-500" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Soft glow effect */}
                    <div
                        className={`absolute inset-0 rounded-3xl blur-xl -z-10 ${
                            type === 'success' ? 'bg-green-400/10' : 'bg-red-400/10'
                        }`}
                    />
                </div>
            </div>
        ),
        { duration: 6000, position: 'bottom-right' },
    );
