import React from 'react';
import { GetServerSideProps } from 'next';
import ReactMarkdown from 'react-markdown';
import Layout from '../../components/layout/Layout';
import { PostProps } from '../../components/Post';
import prisma from '../../lib/prisma';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
    const post = await prisma.post.findUnique({
        where: {
            id: Number(params?.id) || -1,
        },
        include: {
            author: {
                select: { name: true },
            },
        },
    });
    return {
        props: post,
    };
};

const Post: React.FC<PostProps> = (props) => {
    let title = props.title;
    if (!props.published) {
        title = `${title} (Draft)`;
    }

    return (
        <Layout>
            <div>
                <h2>{title}</h2>
                <p>By {props?.author?.name || 'Unknown author'}</p>
                <ReactMarkdown>{props.content}</ReactMarkdown>
            </div>
        </Layout>
    );
};

export default Post;
