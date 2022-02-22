import React from 'react';
import Layout from '../../components/layout/Layout';

const Blog: React.FC = () => {
    return (
        <Layout>
            <div className="py-6">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Loads</h1>
                </div>
                <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <div className="py-4">
                        <div className="border-4 border-gray-200 border-dashed rounded-lg"></div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Blog;
