import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

export default handler;

function handler(req: NextApiRequest, res: NextApiResponse) {
    switch (req.method) {
        case 'GET':
            return _get();
        case 'PUT':
            return _put();
        case 'DELETE':
            return _delete();
        default:
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    async function _get() {
        const session = await getSession({ req });

        const expand = req.query.expand as string;
        const expandCustomer = expand?.includes('customer');
        const expandShipper = expand?.includes('shipper');
        const expandReceiver = expand?.includes('receiver');
        const expandStops = expand?.includes('stops');

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
            include: {
                ...(expandCustomer ? { customer: { select: { id: true, name: true } } } : {}),
                ...(expandShipper
                    ? {
                          shipper: {
                              select: {
                                  id: true,
                                  type: true,
                                  name: true,
                                  street: true,
                                  city: true,
                                  state: true,
                                  zip: true,
                                  country: true,
                                  date: true,
                                  time: true,
                              },
                          },
                      }
                    : {}),
                ...(expandReceiver
                    ? {
                          receiver: {
                              select: {
                                  id: true,
                                  type: true,
                                  name: true,
                                  street: true,
                                  city: true,
                                  state: true,
                                  zip: true,
                                  country: true,
                                  date: true,
                                  time: true,
                              },
                          },
                      }
                    : {}),
                ...(expandStops
                    ? {
                          stops: {
                              select: {
                                  id: true,
                                  type: true,
                                  name: true,
                                  street: true,
                                  city: true,
                                  state: true,
                                  zip: true,
                                  country: true,
                                  date: true,
                                  time: true,
                              },
                          },
                      }
                    : {}),
            },
        });
        return res.status(200).json({
            data: load,
        });
    }

    async function _put() {
        const session = await getSession({ req });

        const load = await prisma.load.findFirst({
            where: {
                id: Number(req.query.id),
                userId: session?.user?.id,
            },
        });

        if (!load) {
            return res.status(404).end('Load not found');
        }

        const updatedLoad = await prisma.load.update({
            where: {
                id: Number(req.query.id),
            },
            data: {
                ...req.body,
            },
        });

        return res.status(200).json({
            data: updatedLoad,
        });
    }

    function _delete() {
        return res.status(200).json({});
    }
}
