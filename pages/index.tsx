import React from 'react';
import { GetStaticProps } from 'next';
import Layout from '../components/layout/Layout';
import Post, { PostProps } from '../components/Post';
import prisma from '../lib/prisma';

export const getStaticProps: GetStaticProps = async () => {
    // const feed = await prisma.post.findMany({
    //     where: { published: true },
    //     include: {
    //         author: {
    //             select: { name: true },
    //         },
    //     },
    // });
    const feed = [];
    return { props: { feed } };
};

type Props = {
    feed: PostProps[];
};

const Blog: React.FC<Props> = (props) => {
    return (
        <Layout>
            <div className="py-6">
                <div className="px-5 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                </div>
                <div className="px-5 mx-auto max-w-7xl sm:px-6 md:px-8">
                    <div className="py-4">
                        <div className="border-4 border-gray-200 border-dashed rounded-lg">
                            {props.feed.map((post) => (
                                <div key={post.id} className="post">
                                    <Post post={post} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Blog;
