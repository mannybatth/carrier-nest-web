/**
 * @fileoverview This file is used to redirect the old API route to the new one.
 */

import { JSONResponse } from 'interfaces/models';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    const { id } = req.query;
    const queryString = req.url?.split('?')[1] || '';
    const newUrl = `/api/assignments/${id}?${queryString}`;

    // Forward the request to the new route
    res.writeHead(301, { Location: newUrl });
    res.end();
}
