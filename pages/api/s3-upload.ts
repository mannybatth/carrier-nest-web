// pages/api/s3-upload.js
// https://next-s3-upload.codingvalue.com/

import { getSession } from 'next-auth/react';
import { APIRoute } from 'next-s3-upload';
import { v4 as uuidv4 } from 'uuid';

export default APIRoute.configure({
    async key(req, filename) {
        const session = await getSession({ req });
        return `load-docs/${session.user.id}/${uuidv4()}/${filename.replace(/\s/g, '-')}`;
    },
});
