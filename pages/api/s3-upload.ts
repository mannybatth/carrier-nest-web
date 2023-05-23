// pages/api/s3-upload.js
// https://next-s3-upload.codingvalue.com/

import { APIRoute } from 'next-s3-upload';
import { v4 as uuidv4 } from 'uuid';

export default APIRoute.configure({
    async key(req, filename) {
        return `load-docs/${uuidv4()}/${filename.replace(/\s/g, '-')}`;
    },
});
