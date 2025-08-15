import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'auth';
import prisma from 'lib/prisma';
import { JSONResponse } from 'interfaces/models';
import { PaginationMetadata } from 'interfaces/table';
import { calcPaginationMetadata } from 'lib/pagination';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { uploadFilesToGCS, getSuccessfulUploads, getFailedUploads } from 'lib/gcs-upload';

const buildOrderBy = (sortBy: string, sortDir: string): Prisma.ExpenseOrderByWithRelationInput => {
    const direction = sortDir === 'asc' ? Prisma.SortOrder.asc : Prisma.SortOrder.desc;

    if (sortBy && sortDir) {
        if (sortBy === 'category') {
            return { category: { name: direction } };
        }
        if (sortBy === 'driver') {
            return { driver: { name: direction } };
        }
        if (sortBy === 'load') {
            return { load: { refNum: direction } };
        }
        return { [sortBy]: direction };
    }
    return { createdAt: Prisma.SortOrder.desc };
};

const buildWhereClause = (params: URLSearchParams, carrierId: string) => {
    const where: any = {
        carrierId,
        deletedAt: null,
    };

    const status = params.get('status');
    if (status) {
        where.approvalStatus = status;
    }

    const categoryId = params.get('categoryId');
    if (categoryId) {
        where.categoryId = categoryId;
    }

    const paidBy = params.get('paidBy');
    if (paidBy) {
        where.paidBy = paidBy;
    }

    const loadId = params.get('loadId');
    if (loadId) {
        where.loadId = loadId;
    }

    const driverId = params.get('driverId');
    if (driverId) {
        where.driverId = driverId;
    }

    const equipmentId = params.get('equipmentId');
    if (equipmentId) {
        where.equipmentId = equipmentId;
    }

    const search = params.get('search');
    if (search) {
        // Limit search length to prevent abuse and improve performance
        const trimmedSearch = search.trim().slice(0, 100);
        if (trimmedSearch.length >= 2) {
            // Minimum search length
            where.OR = [
                { description: { contains: trimmedSearch, mode: 'insensitive' } },
                { vendorName: { contains: trimmedSearch, mode: 'insensitive' } },
                { category: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
                { driver: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
                { load: { refNum: { contains: trimmedSearch, mode: 'insensitive' } } },
                { load: { loadNum: { contains: trimmedSearch, mode: 'insensitive' } } },
            ];
        }
    }

    const minAmount = params.get('minAmount');
    const maxAmount = params.get('maxAmount');
    if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) where.amount.gte = new Decimal(minAmount);
        if (maxAmount) where.amount.lte = new Decimal(maxAmount);
    }

    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Filter by receipt date (useful for driver invoices)
    const receiptStartDate = params.get('receiptStartDate');
    const receiptEndDate = params.get('receiptEndDate');
    if (receiptStartDate || receiptEndDate) {
        where.receiptDate = {};
        if (receiptStartDate) where.receiptDate.gte = new Date(receiptStartDate);
        if (receiptEndDate) where.receiptDate.lte = new Date(receiptEndDate);
    }

    // Filter out expenses already attached to driver invoices (except for specific invoice)
    const excludeAttached = params.get('excludeAttached');
    const allowedInvoiceId = params.get('allowedInvoiceId');
    if (excludeAttached === 'true') {
        if (allowedInvoiceId) {
            // Allow expenses that are either not attached or attached to the specific invoice
            where.OR = [{ driverInvoiceId: null }, { driverInvoiceId: allowedInvoiceId }];
        } else {
            // Only allow expenses that are not attached to any driver invoice
            where.driverInvoiceId = null;
        }
    }

    return where;
};

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);

        // Enforce reasonable pagination limits to prevent abuse
        const requestedLimit = parseInt(searchParams.get('limit') || '50');
        const limit = Math.min(Math.max(requestedLimit, 1), 100); // Between 1 and 100

        const requestedOffset = parseInt(searchParams.get('offset') || '0');
        const offset = Math.max(requestedOffset, 0); // Non-negative

        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortDir = searchParams.get('sortDir') || 'desc';

        const where = buildWhereClause(searchParams, session.user.defaultCarrierId);
        const orderBy = buildOrderBy(sortBy, sortDir);

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: {
                    category: true,
                    load: {
                        select: { id: true, refNum: true, loadNum: true },
                    },
                    driver: {
                        select: { id: true, name: true },
                    },
                    user: {
                        select: { id: true, name: true },
                    },
                    equipment: {
                        select: { id: true, equipmentNumber: true, make: true, model: true },
                    },
                    createdBy: {
                        select: { id: true, name: true },
                    },
                    approvedBy: {
                        select: { id: true, name: true },
                    },
                    documents: {
                        include: {
                            document: true,
                        },
                    },
                },
                orderBy,
                take: limit,
                skip: offset,
            }),
            prisma.expense.count({ where }),
        ]);

        const pagination = calcPaginationMetadata({ total, limit, offset });

        return NextResponse.json({
            expenses,
            pagination,
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);

        // More specific error handling
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
            }
            if (error.code === 'P2002') {
                return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
            }
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.defaultCarrierId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let expenseData: any;
        let files: File[] = [];
        let documentIds: string[] = [];

        // Check if request contains form data (files) or JSON
        const contentType = request.headers.get('content-type');

        if (contentType?.includes('multipart/form-data')) {
            // Handle form data with files
            const formData = await request.formData();

            // Extract files
            const formFiles = formData.getAll('files') as File[];
            files = formFiles.filter((file) => file instanceof File && file.size > 0);

            // Extract expense data from form data
            const expenseDataJson = formData.get('expenseData') as string;
            if (!expenseDataJson) {
                return NextResponse.json({ error: 'Expense data is required' }, { status: 400 });
            }

            try {
                expenseData = JSON.parse(expenseDataJson);
            } catch (parseError) {
                return NextResponse.json({ error: 'Invalid expense data format' }, { status: 400 });
            }
        } else {
            // Handle regular JSON request
            expenseData = await request.json();
            documentIds = expenseData.documentIds || [];
        }

        const {
            categoryId,
            amount,
            currencyCode = 'USD',
            paidBy = 'COMPANY',
            receiptDate,
            loadId,
            driverId,
            equipmentId,
            street,
            city,
            state,
            postalCode,
            country,
            description,
            vendorName,
        } = expenseData;

        // Enhanced validation
        const validationErrors = [];

        if (!categoryId) {
            validationErrors.push('Category is required');
        }

        if (!amount) {
            validationErrors.push('Amount is required');
        } else {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                validationErrors.push('Amount must be a positive number');
            }
            if (numAmount > 999999.99) {
                validationErrors.push('Amount cannot exceed $999,999.99');
            }
        }

        if (receiptDate) {
            const date = new Date(receiptDate);
            if (isNaN(date.getTime())) {
                validationErrors.push('Invalid receipt date format');
            }
            // Allow future dates but warn if too far in future (more than 1 year)
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            if (date > oneYearFromNow) {
                validationErrors.push('Receipt date cannot be more than 1 year in the future');
            }
        }

        if (description && description.length > 1000) {
            validationErrors.push('Description cannot exceed 1000 characters');
        }

        if (vendorName && vendorName.length > 255) {
            validationErrors.push('Vendor name cannot exceed 255 characters');
        }

        if (currencyCode && currencyCode.length !== 3) {
            validationErrors.push('Currency code must be 3 characters (e.g., USD, EUR)');
        }

        if (validationErrors.length > 0) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validationErrors,
                },
                { status: 400 },
            );
        }

        // Upload files if present and get upload results (not creating database records yet)
        if (files.length > 0) {
            try {
                const uploadResults = await uploadFilesToGCS(files);
                const successfulUploads = getSuccessfulUploads(uploadResults);
                const failedUploads = getFailedUploads(uploadResults);

                if (failedUploads.length > 0) {
                    console.warn(
                        'Some file uploads failed:',
                        failedUploads.map((f) => f.error),
                    );
                    return NextResponse.json(
                        {
                            error: 'Some files failed to upload',
                            details: failedUploads.map((f) => `${f.fileName}: ${f.error}`),
                        },
                        { status: 400 },
                    );
                }

                // Create document records in database for successful uploads
                const documentRecords = await Promise.all(
                    successfulUploads.map(async (result) => {
                        return await prisma.document.create({
                            data: {
                                fileName: result.fileName,
                                mimeType: result.mimeType,
                                sizeBytes: result.fileSize,
                                storageUrl: result.uploadResult!.gcsInputUri,
                                uploadedBy: session.user.id,
                            },
                        });
                    }),
                );

                documentIds = documentRecords.map((doc) => doc.id);
            } catch (uploadError) {
                console.error('File upload failed:', uploadError);
                return NextResponse.json(
                    {
                        error: 'Failed to upload files',
                        details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error',
                    },
                    { status: 500 },
                );
            }
        }

        // Create the expense with transaction for consistency
        const result = await prisma.$transaction(async (tx) => {
            // Create the expense
            const expense = await tx.expense.create({
                data: {
                    carrierId: session.user.defaultCarrierId,
                    categoryId,
                    amount: new Decimal(amount),
                    currencyCode,
                    paidBy,
                    receiptDate: receiptDate ? new Date(receiptDate) : null,
                    loadId: loadId || null,
                    driverId: driverId || null,
                    userId: session.user.id,
                    equipmentId: equipmentId || null,
                    street: street || null,
                    city: city || null,
                    state: state || null,
                    postalCode: postalCode || null,
                    country: country || null,
                    description: description || null,
                    vendorName: vendorName || null,
                    createdById: session.user.id,
                    updatedById: session.user.id,
                },
                include: {
                    category: true,
                    load: {
                        select: { id: true, refNum: true, loadNum: true },
                    },
                    driver: {
                        select: { id: true, name: true },
                    },
                    user: {
                        select: { id: true, name: true },
                    },
                    equipment: {
                        select: { id: true, equipmentNumber: true, make: true, model: true },
                    },
                    createdBy: {
                        select: { id: true, name: true },
                    },
                },
            });

            // Link documents if provided
            if (documentIds.length > 0) {
                await Promise.all(
                    documentIds.map((documentId: string) =>
                        tx.expenseDocument.create({
                            data: {
                                expenseId: expense.id,
                                documentId,
                            },
                        }),
                    ),
                );

                // Fetch the documents that were just linked
                const documents = await tx.expenseDocument.findMany({
                    where: { expenseId: expense.id },
                    include: {
                        document: true,
                    },
                });

                return { ...expense, documents };
            }

            return { ...expense, documents: [] };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating expense:', error);

        // More specific error handling
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return NextResponse.json({ error: 'Duplicate expense entry' }, { status: 409 });
            }
            if (error.code === 'P2003') {
                return NextResponse.json({ error: 'Referenced resource not found' }, { status: 400 });
            }
            if (error.code === 'P2025') {
                return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
            }
        }

        if (error instanceof Prisma.PrismaClientValidationError) {
            return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
