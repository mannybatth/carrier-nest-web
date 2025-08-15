'use client';

import type React from 'react';
import { Document, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ExpandedDriverInvoice } from 'interfaces/models';

// Helper for formatting currency
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters and format as (XXX) XXX-XXXX
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
};

// Define styles for the PDF
const styles = StyleSheet.create({
    page: {
        padding: 30,
        paddingBottom: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        color: '#374151', // gray-700
        backgroundColor: '#FFFFFF',
        position: 'relative', // For absolute positioning of footer
    },
    accentBar: {
        height: 10,
        backgroundColor: '#cccccc',
        marginBottom: 16,
        borderRadius: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 48,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
        color: '#111827', // gray-900
        textTransform: 'capitalize',
    },
    headerSubtitle: {
        fontSize: 10,
        color: '#4B5563', // gray-600
    },
    invoiceNumber: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#111827', // gray-900
        textAlign: 'right',
        marginBottom: 4,
    },
    section: {
        marginBottom: 16,
        // This helps prevent section from breaking across pages
        breakInside: 'avoid',
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 4,
        paddingBottom: 2,
        borderBottomWidth: 2,
        borderBottomColor: '#efefef', // gray-200
        color: '#111827', // gray-900
    },
    twoColumn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    column: {
        width: '48%',
    },
    companyName: {
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
        fontSize: 10,
        color: '#000000',
    },
    companyDetails: {
        fontSize: 9,
        lineHeight: 1.2,
        color: '#6B7280', // gray-500
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    detailLabel: {
        width: 70,
        fontFamily: 'Helvetica',
        color: '#4B5563', // gray-600
    },
    detailValue: {
        flex: 1,
        fontFamily: 'Helvetica',
        color: '#111827', // gray-900
        fontSize: 9,
    },
    card: {
        backgroundColor: '#F9FAFB', // gray-50
        borderRadius: 4,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB', // gray-200
        // This prevents the card from breaking across pages
        breakInside: 'avoid',
    },
    cardHeader: {
        borderBottomWidth: 1,
        borderStyle: 'dashed',
        borderBottomColor: '#E5E7EB', // gray-200
        paddingBottom: 6,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        color: '#111827', // gray-900
    },
    cardAmount: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 11,
        color: '#2eb82e', // emerald-500
    },
    cardContent: {
        flexDirection: 'column',
    },
    cardRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    cardLabel: {
        fontFamily: 'Helvetica-Bold',
        color: '#6B7280', // gray-500
        width: '20%',
    },
    cardValue: {
        color: '#111827', // gray-900
        width: '80%',
    },
    lineItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6', // gray-100
    },
    lineItemLastRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    lineItemDescription: {
        flex: 1,
    },
    lineItemAmount: {
        fontFamily: 'Helvetica',
        textAlign: 'right',
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        paddingVertical: 2,
    },
    totalsLabel: {
        fontFamily: 'Helvetica',
        color: '#4B5563', // gray-600
    },
    totalsValue: {
        fontFamily: 'Helvetica',
        textAlign: 'right',
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingTop: 4,
        paddingBottom: 4,
        borderBottomWidth: 3,
        borderTopWidth: 1,
        borderTopStyle: 'dashed',
        borderBottomStyle: 'solid',
        borderTopColor: '#cccccc', // gray-200
        borderBottomColor: '#666666', // gray-200
    },
    grandTotalLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        color: '#111827', // gray-900
    },
    grandTotalValue: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        color: '#2eb82e', // emerald-500
        textAlign: 'right',
    },
    paymentRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    paymentDate: {
        width: 80,
        fontFamily: 'Helvetica',
    },
    paymentNotes: {
        flex: 1,
    },
    paymentAmount: {
        width: 80,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
    },
    noPayments: {
        fontStyle: 'italic',
        color: '#6B7280', // gray-500
    },
    notes: {
        color: '#4B5563', // gray-600
        lineHeight: 1.4,
    },
    // Status badge styles
    statusBadge: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 12,
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        alignSelf: 'flex-end',
    },
    statusDraft: {
        backgroundColor: '#E5E7EB', // gray-200
        color: '#4B5563', // gray-600
    },
    statusPending: {
        backgroundColor: '#FEF3C7', // yellow-100
        color: '#92400E', // yellow-800
    },
    statusApproved: {
        backgroundColor: '#DBEAFE', // blue-100
        color: '#1E40AF', // blue-800
    },
    statusPaid: {
        backgroundColor: '#10B981', // emerald-500
        color: '#FFFFFF',
    },
    statusPartiallyPaid: {
        backgroundColor: '#D1FAE5', // emerald-100
        color: '#065F46', // emerald-800
    },
    symbol: {
        marginRight: 2,
        fontFamily: 'Helvetica-Bold',
    },
    // Payment history page styles
    paymentHistoryHeader: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 16,
        color: '#111827', // gray-900
        textAlign: 'center',
    },
    paymentHistorySubheader: {
        fontSize: 12,
        color: '#4B5563', // gray-600
        marginBottom: 24,
        textAlign: 'center',
    },
    // Footer styles
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 9,
        color: '#6B7280', // gray-500
    },
    pageNumber: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#4B5563', // gray-600
        textAlign: 'right',
    },
});

export const DriverInvoicePDF: React.FC<{ invoice: ExpandedDriverInvoice }> = ({ invoice }) => {
    // Compute totals
    const assignmentsTotal = invoice.assignments.reduce((sum, a) => {
        let amt = 0;
        switch (a.chargeType) {
            case 'PER_MILE':
                const baseMiles = Number(a.billedDistanceMiles ?? a.routeLeg.distanceMiles);
                const emptyMiles = Number(a.emptyMiles || 0);
                const totalMiles = baseMiles + emptyMiles;
                amt = totalMiles * Number(a.chargeValue);
                break;
            case 'PER_HOUR':
                amt = Number(a.billedDurationHours ?? a.routeLeg.durationHours) * Number(a.chargeValue);
                break;
            case 'PERCENTAGE_OF_LOAD':
                amt = (Number(a.billedLoadRate ?? a.load.rate) * Number(a.chargeValue)) / 100 || 0;
                break;
            case 'FIXED_PAY':
                amt = Number(a.chargeValue);
                break;
        }
        return sum + amt;
    }, 0);

    const lineItemsTotal = invoice.lineItems.reduce((sum, li) => sum + Number(li.amount), 0);

    // Calculate expenses total
    const expensesTotal = invoice.expenses
        ? invoice.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
        : 0;

    // Unicode symbols as icon replacements
    const symbols = {
        document: '📄',
        calendar: '📅',
        truck: '🚚',
        map: '📍',
        clock: '⏱️',
        money: '💰',
        check: '✓',
        pending: '⏳',
    };

    // Helper function to render status badge
    const renderStatusBadge = (status: string) => {
        let badgeStyle;

        switch (status) {
            case 'PENDING':
                badgeStyle = styles.statusPending;
                break;
            case 'APPROVED':
                badgeStyle = styles.statusApproved;
                break;
            case 'PAID':
                badgeStyle = styles.statusPaid;
                break;
            case 'PARTIALLY_PAID':
                badgeStyle = styles.statusPartiallyPaid;
                break;
            default:
                badgeStyle = styles.statusPending;
        }

        return (
            <View style={[styles.statusBadge, badgeStyle]}>
                <Text>{status.replace('_', ' ')}</Text>
            </View>
        );
    };

    const safeFixed = (value: unknown, decimals: number): string => {
        const num = Number(value);
        if (Number.isNaN(num)) {
            return (0).toFixed(decimals);
        }
        return num.toFixed(decimals);
    };

    return (
        <Document>
            {/* Main Invoice Page */}
            <Page size="LETTER" style={styles.page}>
                {/* Top Accent Bar */}
                <View style={styles.accentBar} />

                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>{invoice.driver.name}</Text>
                        {invoice.driver.phone && (
                            <Text style={styles.headerSubtitle}>Phone: {formatPhoneNumber(invoice.driver.phone)}</Text>
                        )}
                    </View>
                    <View>
                        <Text style={styles.invoiceNumber}>INVOICE #{invoice.invoiceNum}</Text>
                        {renderStatusBadge(invoice.status)}
                    </View>
                </View>

                {/* Bill To & Details */}
                <View style={[styles.section, styles.twoColumn]} wrap={false}>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={styles.companyName}>{invoice.carrier.name}</Text>
                        <Text style={styles.companyDetails}>{invoice.carrier.street}</Text>
                        <Text style={styles.companyDetails}>
                            {invoice.carrier.city}, {invoice.carrier.state} {invoice.carrier.zip}
                        </Text>
                        <Text style={[styles.companyDetails, { marginTop: 8 }]}>
                            Phone: {formatPhoneNumber(invoice.carrier.phone)}
                        </Text>
                        <Text style={styles.companyDetails}>Email: {invoice.carrier.email}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{symbols.calendar} Created At:</Text>
                            <Text style={styles.detailValue}>
                                {new Date(invoice.createdAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    second: 'numeric',
                                    hour12: true,
                                })}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{symbols.calendar} Updated At:</Text>
                            <Text style={styles.detailValue}>
                                {new Date(invoice.updatedAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    second: 'numeric',
                                    hour12: true,
                                })}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>{symbols.calendar} Period:</Text>
                            <Text style={styles.detailValue}>
                                {(() => {
                                    // Parse date correctly to avoid timezone issues
                                    const parseDate = (date: string | Date | null | undefined) => {
                                        if (!date) return null;
                                        if (typeof date === 'string') {
                                            const parts = date.split('-');
                                            if (parts.length === 3) {
                                                const year = parseInt(parts[0], 10);
                                                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                                                const day = parseInt(parts[2], 10);
                                                return new Date(year, month, day);
                                            }
                                            return new Date(date);
                                        }
                                        return date;
                                    };

                                    const fromDate = parseDate(invoice.fromDate);
                                    const toDate = parseDate(invoice.toDate);

                                    return `${fromDate?.toLocaleDateString()} – ${toDate?.toLocaleDateString()}`;
                                })()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                {invoice.notes && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Invoice Notes</Text>
                        <Text style={styles.notes}>{invoice.notes}</Text>
                    </View>
                )}

                {/* Assignments */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Assignments ({invoice.assignments.length})</Text>

                    {invoice.assignments.map((a) => {
                        // Calculate amount
                        let amount = 0;
                        switch (a.chargeType) {
                            case 'PER_MILE':
                                const baseMiles = Number(a.billedDistanceMiles ?? a.routeLeg.distanceMiles);
                                const emptyMiles = Number(a.emptyMiles || 0);
                                const totalMiles = baseMiles + emptyMiles;
                                amount = totalMiles * Number(a.chargeValue);
                                break;
                            case 'PER_HOUR':
                                amount =
                                    Number(a.billedDurationHours ?? a.routeLeg.durationHours) * Number(a.chargeValue);
                                break;
                            case 'PERCENTAGE_OF_LOAD':
                                amount = (Number(a.billedLoadRate ?? a.load.rate) * Number(a.chargeValue)) / 100 || 0;
                                break;
                            case 'FIXED_PAY':
                                amount = Number(a.chargeValue);
                                break;
                        }

                        // Format route & trip details
                        const route = a.routeLeg.locations
                            .map((loc) =>
                                loc.loadStop
                                    ? `${loc.loadStop.name} (${loc.loadStop.city}, ${loc.loadStop.state})`
                                    : loc.location
                                    ? `${loc.location.name} (${loc.location.city}, ${loc.location.state})`
                                    : '',
                            )
                            .join(' > ');

                        const baseMiles = Number(a.billedDistanceMiles ?? a.routeLeg?.distanceMiles);
                        const emptyMiles = Number(a.emptyMiles || 0);
                        const totalMiles = baseMiles + emptyMiles;

                        const trip = [
                            `${safeFixed(baseMiles, 0)} mi${
                                emptyMiles > 0
                                    ? ` + ${safeFixed(emptyMiles, 0)} empty = ${safeFixed(totalMiles, 0)} total mi`
                                    : ''
                            }`,
                            safeFixed(a.billedDurationHours ?? a.routeLeg?.durationHours, 1) + ' hr',
                        ].join(' / ');

                        let chargeLabel = '';
                        switch (a.chargeType) {
                            case 'PER_MILE':
                                const baseMilesForLabel = Number(a.billedDistanceMiles ?? a.routeLeg.distanceMiles);
                                const emptyMilesForLabel = Number(a.emptyMiles || 0);
                                const totalMilesForLabel = baseMilesForLabel + emptyMilesForLabel;
                                chargeLabel = `${a.chargeValue}/mi for ${totalMilesForLabel} miles${
                                    emptyMilesForLabel > 0
                                        ? ` (${baseMilesForLabel} loaded + ${emptyMilesForLabel} empty)`
                                        : ''
                                }`;
                                break;
                            case 'PER_HOUR':
                                chargeLabel = `${a.chargeValue}/hr for ${
                                    a.billedDurationHours ?? a.routeLeg.durationHours
                                } hours`;
                                break;
                            case 'PERCENTAGE_OF_LOAD':
                                chargeLabel = `${a.chargeValue}% of load rate (${formatCurrency(
                                    Number(a.billedLoadRate ?? a.load.rate),
                                )})`;
                                break;
                            case 'FIXED_PAY':
                                chargeLabel = 'Fixed Pay';
                                break;
                        }

                        return (
                            <View key={a.id} style={styles.card} wrap={false}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>
                                        {symbols.document} Order #{a.load.refNum}
                                    </Text>
                                    <Text style={styles.cardAmount}>{formatCurrency(amount)}</Text>
                                </View>

                                <View style={styles.cardContent}>
                                    <View style={styles.cardRow}>
                                        <Text style={styles.cardLabel}>{symbols.map} Route</Text>
                                        <Text style={styles.cardValue}>{route}</Text>
                                    </View>
                                    <View style={styles.cardRow}>
                                        <Text style={styles.cardLabel}>{symbols.truck} Trip Details</Text>
                                        <Text style={styles.cardValue}>{trip}</Text>
                                    </View>
                                    {a.chargeType === 'PER_MILE' && Number(a.emptyMiles || 0) > 0 && (
                                        <View style={styles.cardRow}>
                                            <Text style={styles.cardLabel}>🛣️ Empty Miles</Text>
                                            <Text style={styles.cardValue}>
                                                {safeFixed(Number(a.emptyMiles), 1)} miles (deadhead/repositioning)
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.cardRow}>
                                        <Text style={styles.cardLabel}>{symbols.money} Charge Type</Text>
                                        <Text style={styles.cardValue}>{chargeLabel}</Text>
                                    </View>
                                    <View style={styles.cardRow}>
                                        <Text style={styles.cardLabel}>{symbols.clock} Status</Text>
                                        <Text style={styles.cardValue}>
                                            Completed @
                                            {new Date(a.routeLeg.endedAt).toLocaleString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: '2-digit',
                                                hour: 'numeric',
                                                minute: 'numeric',
                                                second: 'numeric',
                                                hour12: true,
                                            })}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Driver Expenses */}
                {invoice.expenses && invoice.expenses.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Driver Expenses</Text>
                        {invoice.expenses.map((expense, index) => {
                            // Build detailed description
                            const descriptionParts = [];

                            // Add category
                            if (expense.category?.name) {
                                descriptionParts.push(expense.category.name);
                            }

                            // Add description if available
                            if (expense.description) {
                                descriptionParts.push(expense.description);
                            }

                            // Add vendor name if available
                            if (expense.vendorName) {
                                descriptionParts.push(`Vendor: ${expense.vendorName}`);
                            }

                            // Add receipt date
                            if (expense.receiptDate) {
                                const receiptDate = new Date(expense.receiptDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                });
                                descriptionParts.push(`Date: ${receiptDate}`);
                            }

                            // Add created at date
                            if (expense.createdAt) {
                                const createdDate = new Date(expense.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: '2-digit',
                                });
                                descriptionParts.push(`Submitted: ${createdDate}`);
                            }

                            const finalDescription =
                                descriptionParts.length > 0 ? descriptionParts.join(' • ') : 'Expense';

                            return (
                                <View
                                    key={expense.id}
                                    style={
                                        index + 1 !== invoice.expenses.length
                                            ? styles.lineItemRow
                                            : styles.lineItemLastRow
                                    }
                                >
                                    <Text style={styles.lineItemDescription}>{finalDescription}</Text>
                                    <Text
                                        style={[
                                            styles.lineItemAmount,
                                            { color: Number(expense.amount) > 0 ? '#2eb82e' : '#e62e00' },
                                        ]}
                                    >
                                        {formatCurrency(Number(expense.amount))}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Line Items */}
                {invoice.lineItems.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>Line Items</Text>
                        {invoice.lineItems.map((li, index) => (
                            <View
                                key={li.id}
                                style={
                                    index + 1 !== invoice.lineItems.length ? styles.lineItemRow : styles.lineItemLastRow
                                }
                            >
                                <Text style={styles.lineItemDescription}>{li.description}</Text>
                                <Text
                                    style={[
                                        styles.lineItemAmount,
                                        { color: Number(li.amount) > 0 ? '#2eb82e' : '#e62e00' },
                                    ]}
                                >
                                    {formatCurrency(Number(li.amount))}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Totals */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>Invoice Total</Text>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Assignments Total</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(assignmentsTotal)}</Text>
                    </View>
                    {invoice.expenses && invoice.expenses.length > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Driver Expenses Total</Text>
                            <Text style={styles.totalsValue}>{formatCurrency(expensesTotal)}</Text>
                        </View>
                    )}
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Line Items Total</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(lineItemsTotal)}</Text>
                    </View>
                    <View style={[styles.grandTotal, { marginTop: 8 }]}>
                        <Text style={styles.grandTotalLabel}>Grand Total</Text>
                        <Text style={styles.grandTotalValue}>
                            {formatCurrency(assignmentsTotal + expensesTotal + lineItemsTotal)}
                        </Text>
                    </View>
                </View>

                {/* Footer with page number */}
                <View fixed style={styles.footer}>
                    <Text style={styles.footerText}>Invoice #{invoice.invoiceNum}</Text>
                    <Text
                        style={styles.pageNumber}
                        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
                    />
                </View>
            </Page>

            {/* Payment History Page */}
            <Page size="LETTER" style={styles.page}>
                {/* Top Accent Bar */}
                <View style={styles.accentBar} />

                {/* Header for Payment History Page */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={styles.paymentHistoryHeader}>Payment History</Text>
                    <Text style={styles.paymentHistorySubheader}>
                        Invoice #{invoice.invoiceNum} - {invoice.driver.name}
                    </Text>
                </View>

                {/* Payment History Content */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Records</Text>
                    {!invoice.payments || invoice.payments.length === 0 ? (
                        <View style={{ marginTop: 20, marginBottom: 20 }}>
                            <Text style={styles.noPayments}>No payments recorded yet.</Text>
                        </View>
                    ) : (
                        invoice.payments.map((p) => (
                            <View key={p.id} style={[styles.card, { marginBottom: 12 }]} wrap={false}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>
                                        {symbols.calendar} {new Date(p.paymentDate).toLocaleDateString()}
                                    </Text>
                                    <Text style={styles.cardAmount}>{formatCurrency(Number(p.amount))}</Text>
                                </View>
                                <View style={{ padding: 4 }}>
                                    <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
                                        Payment Notes:
                                    </Text>
                                    <Text>{p.notes || 'No additional notes'}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Payment Summary */}
                <View style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>Payment Summary</Text>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Invoice Total</Text>
                        <Text style={styles.totalsValue}>{formatCurrency(Number(invoice.totalAmount))}</Text>
                    </View>

                    {invoice.payments && invoice.payments.length > 0 && (
                        <>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Total Payments</Text>
                                <Text style={styles.totalsValue}>
                                    {formatCurrency(invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0))}
                                </Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Balance Due</Text>
                                <Text style={[styles.totalsValue, { fontFamily: 'Helvetica-Bold' }]}>
                                    {formatCurrency(
                                        Number(invoice.totalAmount) -
                                            invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0),
                                    )}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                {/* Footer with page number */}
                <View fixed style={styles.footer}>
                    <Text style={styles.footerText}>Payment History for Invoice #{invoice.invoiceNum}</Text>
                    <Text
                        style={styles.pageNumber}
                        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
};

// PDF generation & download helpers
export const createDriverInvoicePdfBlob = async (invoice: ExpandedDriverInvoice) => {
    return await pdf(<DriverInvoicePDF invoice={invoice} />).toBlob();
};

export const downloadDriverInvoice = async (
    invoice: ExpandedDriverInvoice,
    fileName = `driver-invoice-${invoice.invoiceNum}.pdf`,
) => {
    const blob = await createDriverInvoicePdfBlob(invoice);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.click();
};

// Download button component
export const DownloadDriverInvoicePDFButton: React.FC<{
    invoice: ExpandedDriverInvoice;
}> = ({ invoice }) => {
    const handleDownload = async () => {
        await downloadDriverInvoice(invoice);
    };

    return (
        <button
            onClick={handleDownload}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
        >
            Download Driver Invoice PDF
        </button>
    );
};
