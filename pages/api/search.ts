import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { JSONResponse } from '../../interfaces/models';
import { authOptions } from './auth/[...nextauth]';
import { customerSearch } from './customers/search';
import { driverSearch } from './drivers/search';
import { loadSearch } from './loads/search';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse<JSONResponse<any>>) {
    switch (req.method) {
        case 'GET':
            return _get();
        default:
            return res.status(405).send({
                code: 405,
                errors: [{ message: `Method ${req.method} Not Allowed` }],
            });
    }

    async function _get() {
        const session = await getServerSession(req, res, authOptions);

        const q = req.query.q as string;
        const loads = await loadSearch(q, session.user.defaultCarrierId);
        const customers = await customerSearch(q, session.user.defaultCarrierId);
        const drivers = await driverSearch(q, session.user.defaultCarrierId);

        return res.status(200).json({
            code: 200,
            data: {
                loads,
                customers,
                drivers,
            },
        });
    }
}
