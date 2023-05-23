// pages/api/s3-upload.js
// https://next-s3-upload.codingvalue.com/

import { getServerSession } from 'next-auth';
import { APIRoute } from 'next-s3-upload';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from './auth/[...nextauth]';

export default APIRoute.configure({
    async key(req, filename) {
        const session = await getServerSession(req, null, authOptions);
        return `load-docs/${session.user.id}/${uuidv4()}/${filename.replace(/\s/g, '-')}`;
    },
});
