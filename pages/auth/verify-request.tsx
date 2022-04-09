import Link from 'next/link';
import React from 'react';

const VerifyRequest: React.FC = () => {
    return (
        <div className="flex flex-col min-h-full py-20 sm:px-6 lg:px-8 bg-gray-50">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <img
                    className="w-auto h-12 mx-auto"
                    src="https://tailwindui.com/img/logos/workflow-mark-blue-600.svg"
                    alt="Workflow"
                />
                <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">Check your email</h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="px-4 py-8 space-y-6 text-center bg-white shadow sm:rounded-lg sm:px-10">
                    <p>A sign in link has been sent to your email address.</p>
                    <div>
                        <Link href="/auth/signin">
                            <button className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Return to sign in
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyRequest;
