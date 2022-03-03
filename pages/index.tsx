import React from 'react';
import { GetStaticProps } from 'next';
import Layout from '../components/layout/Layout';
import { ComponentWithAuth } from '../interfaces/auth';

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

type Props = {};

const Dashboard: ComponentWithAuth<Props> = (props: Props) => {
    return (
        <Layout
            smHeaderComponent={
                <div className="flex items-center">
                    <h1 className="flex-1 text-xl font-semibold text-gray-900">Dashboard</h1>
                </div>
            }
        >
            <div className="py-2 mx-auto max-w-7xl">
                <div className="hidden px-5 my-4 md:block sm:px-6 md:px-8">
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <div className="w-full mt-2 mb-1 border-t border-gray-300" />
                </div>
                <div className="px-5 sm:px-6 md:px-8">
                    <div className="border-4 border-gray-200 border-dashed rounded-lg"></div>
                </div>
            </div>
        </Layout>
    );
};

Dashboard.authenticationEnabled = true;

export default Dashboard;
