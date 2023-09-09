import { PaperClipIcon } from '@heroicons/react/24/outline';
import { Carrier, Customer } from '@prisma/client';
import { Document, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import { useSession } from 'next-auth/react';
import React from 'react';
import { ExpandedInvoice, ExpandedLoad } from '../../interfaces/models';
import { invoiceTermOptions } from '../../lib/invoice/invoice-utils';
import { getCarrierById } from '../../lib/rest/carrier';
import { formatValue } from 'react-currency-input-field';

const styles = StyleSheet.create({
    body: {
        paddingTop: 35,
        paddingBottom: 65,
        paddingHorizontal: 35,
    },
});

type InvoicePDFProps = {
    carrier: Carrier;
    invoice: ExpandedInvoice;
    customer: Partial<Customer>;
    load: ExpandedLoad;
};

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ carrier, invoice, customer, load }) => (
    <Document>
        <Page size={[612, 792]} style={styles.body}>
            <View style={{ backgroundColor: '#497BA0', height: 8, marginBottom: 14 }}></View>

            <View style={{ display: 'flex', flexDirection: 'row', marginBottom: 30 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#497B9F', marginBottom: 6, fontSize: 14, fontFamily: 'Helvetica-Bold' }}>
                        {carrier.name}
                    </Text>
                    {carrier.street ? (
                        <Text style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase' }}>
                            {carrier.street}
                        </Text>
                    ) : null}
                    {carrier.city || carrier.state || carrier.zip ? (
                        <Text style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase' }}>
                            {carrier.city ? carrier.city + ', ' : null}
                            {carrier.state ? carrier.state + ' ' : null}
                            {carrier.zip}
                        </Text>
                    ) : null}
                    {carrier.phone ? (
                        <Text style={{ fontSize: 10, marginBottom: 2 }}>Phone: {carrier.phone}</Text>
                    ) : null}
                    {carrier.email ? <Text style={{ fontSize: 10 }}>{carrier.email}</Text> : null}
                </View>
                <View>
                    <Text style={{ fontSize: 18 }}>INVOICE # {invoice.invoiceNum}</Text>
                </View>
            </View>

            <Text style={{ fontSize: 10, marginBottom: 4 }}>Invoice To:</Text>

            <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 14,
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            fontFamily: 'Helvetica-Bold',
                        }}
                    >
                        {customer.name}
                    </Text>
                    <Text style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase' }}>{customer.street}</Text>
                    {customer.city || customer.state || customer.zip ? (
                        <Text style={{ fontSize: 10, textTransform: 'uppercase' }}>
                            {customer.city ? customer.city + ', ' : null}
                            {customer.state ? customer.state + ' ' : null}
                            {customer.zip}
                        </Text>
                    ) : null}
                </View>
                <View style={{ flex: 0.7 }}>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingBottom: 4,
                            borderBottom: '1px solid #D1D1D1',
                        }}
                    >
                        <Text style={{ fontSize: 11, marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>Date</Text>
                        <Text style={{ fontSize: 11, marginBottom: 2 }}>
                            {new Intl.DateTimeFormat('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit',
                            }).format(new Date(invoice.invoicedAt))}
                        </Text>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingTop: 6,
                            paddingBottom: 4,
                            borderBottom: '1px solid #D1D1D1',
                        }}
                    >
                        <Text style={{ fontSize: 11, marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>Reference #</Text>
                        <Text style={{ fontSize: 11, marginBottom: 2 }}>{load.refNum}</Text>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingTop: 6,
                        }}
                    >
                        <Text style={{ fontSize: 11, marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>Term</Text>
                        <Text style={{ fontSize: 11, marginBottom: 2 }}>
                            {invoiceTermOptions.find((option) => option.value === invoice.dueNetDays)?.label}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={{ marginTop: 20, fontSize: 13 }}>Stop Details</Text>

            <View style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
                <View
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        backgroundColor: '#497BA0',
                        padding: 10,
                        color: 'white',
                        fontSize: 10,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 50 }}>Stop #</Text>
                    <Text style={{ flexGrow: 0, width: 80 }}>Date</Text>
                    <Text style={{ flexGrow: 0, width: 60 }}>Action</Text>
                    <Text style={{ flex: 1 }}>Location</Text>
                </View>
                <View
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        padding: 10,
                        borderBottom: '1px solid #D1D1D1',
                        fontSize: 10,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 50 }}>1</Text>
                    <Text style={{ flexGrow: 0, width: 80 }}>
                        {new Intl.DateTimeFormat('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                        }).format(new Date(load.shipper.date))}
                    </Text>
                    <Text style={{ flexGrow: 0, width: 60 }}>Pick Up</Text>
                    <Text style={{ flex: 1 }}>
                        {load.shipper.street} {load.shipper.city}, {load.shipper.state} {load.shipper.zip}
                    </Text>
                </View>
                {load.stops.map((stop, index) => (
                    <View
                        key={index}
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            padding: 10,
                            borderBottom: '1px solid #D1D1D1',
                            fontSize: 10,
                        }}
                    >
                        <Text style={{ flexGrow: 0, width: 50 }}>{index + 2}</Text>
                        <Text style={{ flexGrow: 0, width: 80 }}>
                            {new Intl.DateTimeFormat('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit',
                            }).format(new Date(stop.date))}
                        </Text>
                        <Text style={{ flexGrow: 0, width: 60 }}>Stop #{index + 1}</Text>
                        <Text style={{ flex: 1 }}>
                            {stop.street} {stop.city}, {stop.state} {stop.zip}
                        </Text>
                    </View>
                ))}
                <View
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        padding: 10,
                        borderBottom: '1px solid #D1D1D1',
                        fontSize: 10,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 50 }}>{load.stops.length + 2}</Text>
                    <Text style={{ flexGrow: 0, width: 80 }}>
                        {new Intl.DateTimeFormat('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                        }).format(new Date(load.receiver.date))}
                    </Text>
                    <Text style={{ flexGrow: 0, width: 60 }}>Drop Off</Text>
                    <Text style={{ flex: 1 }}>
                        {load.receiver.street} {load.receiver.city}, {load.receiver.state} {load.receiver.zip}
                    </Text>
                </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
                <View
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        backgroundColor: '#497BA0',
                        padding: 10,
                        color: 'white',
                        fontSize: 10,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 90 }}>Item</Text>
                    <Text style={{ flex: 1 }}>Description</Text>
                    <Text style={{ flexGrow: 0 }}>Price</Text>
                </View>
                <View
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        padding: 10,
                        borderBottom: '1px solid #D1D1D1',
                        fontSize: 10,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 90, fontFamily: 'Helvetica-Bold' }}>Flat Rate</Text>
                    <Text style={{ flex: 1 }}>Revenue of Load</Text>
                    <Text style={{ flexGrow: 0 }}>
                        {formatValue({
                            value: load.rate.toString(),
                            groupSeparator: ',',
                            decimalSeparator: '.',
                            prefix: '$',
                            decimalScale: 2,
                        })}
                    </Text>
                </View>
                {invoice.extraItems && invoice.extraItems.length > 0
                    ? invoice.extraItems.map((item) => (
                          <View
                              key={item.id}
                              style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  padding: 10,
                                  borderBottom: '1px solid #D1D1D1',
                                  fontSize: 10,
                              }}
                          >
                              <Text style={{ flexGrow: 0, width: 90, fontFamily: 'Helvetica-Bold' }}>Additional</Text>
                              <Text style={{ flex: 1 }}>{item.title}</Text>
                              <Text style={{ flexGrow: 0 }}>
                                  {formatValue({
                                      value: item.amount.toString(),
                                      groupSeparator: ',',
                                      decimalSeparator: '.',
                                      prefix: '$',
                                      decimalScale: 2,
                                  })}
                              </Text>
                          </View>
                      ))
                    : null}
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', fontSize: 11, marginTop: 4 }}>
                <View style={{ flex: 1 }}></View>
                <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            padding: 10,
                            borderBottom: '1px solid #D1D1D1',
                            fontSize: 10,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Sub-Total (US$)</Text>
                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Zero Rated - Tax</Text>
                        </View>
                        <Text>
                            {formatValue({
                                value: invoice.totalAmount.toString(),
                                groupSeparator: ',',
                                decimalSeparator: '.',
                                prefix: '$',
                                decimalScale: 2,
                            })}
                        </Text>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            padding: 10,
                            borderBottom: '1px solid #D1D1D1',
                            fontSize: 10,
                        }}
                    >
                        <View style={{ flex: 1, fontFamily: 'Helvetica-Bold' }}>
                            <Text style={{}}>Total Amount (US$)</Text>
                        </View>
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                            {formatValue({
                                value: invoice.totalAmount.toString(),
                                groupSeparator: ',',
                                decimalSeparator: '.',
                                prefix: '$',
                                decimalScale: 2,
                            })}
                        </Text>
                    </View>
                </View>
            </View>
        </Page>
    </Document>
);

type DownloadButtonProps = {
    invoice: ExpandedInvoice;
    customer: Partial<Customer>;
    load: ExpandedLoad;
    fileName: string;
};

export const DownloadInvoicePDFButton: React.FC<DownloadButtonProps> = ({
    invoice,
    customer,
    load,
    fileName = 'invoice.pdf',
}) => {
    const { data: session } = useSession();

    const handleDownload = async () => {
        await downloadInvoice(session.user.defaultCarrierId, invoice, customer, load, fileName);
    };

    return (
        <button
            className="flex items-center justify-between w-full py-2 pl-3 pr-4 text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100"
            onClick={handleDownload}
        >
            <div className="flex items-center flex-1 w-0">
                <PaperClipIcon className="flex-shrink-0 w-4 h-4 text-gray-400" aria-hidden="true" />
                <span className="flex-1 w-0 ml-2 text-left truncate">{fileName}</span>
            </div>
            <div className="flex-shrink-0 ml-4"></div>
        </button>
    );
};

export const createInvoicePdfBlob = async (
    carrierId: string,
    invoice: ExpandedInvoice,
    customer: Partial<Customer>,
    load: ExpandedLoad,
) => {
    const carrier = await getCarrierById(carrierId);
    const blob = await pdf(<InvoicePDF carrier={carrier} invoice={invoice} customer={customer} load={load} />).toBlob();

    return blob;
};

export const downloadInvoice = async (
    carrierId: string,
    invoice: ExpandedInvoice,
    customer: Partial<Customer>,
    load: ExpandedLoad,
    fileName = 'invoice.pdf',
) => {
    const blob = await createInvoicePdfBlob(carrierId, invoice, customer, load);

    const pdfUrl = window.URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = pdfUrl;
    tempLink.setAttribute('download', fileName);
    tempLink.click();
};
