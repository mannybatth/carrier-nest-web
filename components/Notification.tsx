import { CheckCircleIcon, XIcon } from '@heroicons/react/outline';
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
                className={`${
                    t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <CheckCircleIcon className="w-6 h-6 text-green-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3 w-0 flex-1 pt-0.5">
                            <p className="text-sm font-medium text-gray-900">{title}</p>
                            <p className="mt-1 text-sm text-gray-500">{message}</p>
                        </div>
                        <div className="flex flex-shrink-0 ml-4">
                            <button
                                className="inline-flex text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                onClick={() => toast.dismiss(t.id)}
                            >
                                <span className="sr-only">Close</span>
                                <XIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ),
        { duration: 5000, position: 'top-right' },
    );
