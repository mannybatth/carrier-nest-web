import Link from 'next/link';
import React from 'react';
import Layout from '../../components/layout/Layout';

const Blog: React.FC = () => {
    return (
        <Layout>
            <div className="py-6">
                <div className="px-5 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <div className="flex">
                        <h1 className="flex-1 text-2xl font-semibold text-gray-900">All Loads</h1>
                        <div className="">
                            <Link href="/loads/create">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    + Create Load
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="px-5 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <div className="py-4">
                        <div className="border-4 border-gray-200 border-dashed rounded-lg"></div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Blog;
