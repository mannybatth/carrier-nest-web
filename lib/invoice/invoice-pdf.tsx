import { PaperClipIcon } from '@heroicons/react/outline';
import { Carrier, Customer } from '@prisma/client';
import { Document, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import { useSession } from 'next-auth/react';
import React from 'react';
import { ExpandedInvoice, ExpandedLoad } from '../../interfaces/models';
import { getCarrierById } from '../rest/carrier';

const styles = StyleSheet.create({
    body: {
        paddingTop: 35,
        paddingBottom: 65,
        paddingHorizontal: 35,
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        fontFamily: 'Oswald',
    },
    author: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 40,
    },
    subtitle: {
        fontSize: 18,
        margin: 12,
        fontFamily: 'Oswald',
    },
    text: {
        margin: 12,
        fontSize: 14,
        textAlign: 'justify',
        fontFamily: 'Times-Roman',
    },
    image: {
        marginVertical: 15,
        marginHorizontal: 100,
    },
    header: {
        fontSize: 12,
        marginBottom: 20,
        textAlign: 'center',
        color: 'grey',
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 12,
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'grey',
    },
});

type InvoicePDFProps = {
    carrier: Carrier;
    invoice: ExpandedInvoice;
    customer: Customer;
    load: ExpandedLoad;
};

const InvoicePDF: React.FC<InvoicePDFProps> = ({ carrier, invoice, customer, load }) => (
    <Document>
        <Page style={styles.body}>
            <View style={{ backgroundColor: '#497BA0', height: 8, marginBottom: 14 }}></View>

            <View style={{ display: 'flex', flexDirection: 'row', marginBottom: 40 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#497B9F', marginBottom: 6, fontSize: 14 }}>{carrier.name}</Text>
                    <Text style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase' }}>{carrier.street}</Text>
                    <Text style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase' }}>
                        {carrier.city}, {carrier.state} {carrier.zip}
                    </Text>
                    <Text style={{ fontSize: 10, marginBottom: 2 }}>Phone: {carrier.phone}</Text>
                    <Text style={{ fontSize: 10 }}>{carrier.email}</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 18 }}>INVOICE #33</Text>
                </View>
            </View>

            <Text style={{ fontSize: 10, marginBottom: 4 }}>Invoice To:</Text>

            <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, marginBottom: 4, textTransform: 'uppercase' }}>{customer.name}</Text>
                    <Text style={{ fontSize: 10, marginBottom: 2, textTransform: 'uppercase' }}>{customer.street}</Text>
                    <Text style={{ fontSize: 10, textTransform: 'uppercase' }}>
                        {customer.city}, {customer.state} {customer.zip}
                    </Text>
                </View>
                <View style={{ flex: 0.7 }}>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingBottom: 4,
                            borderBottom: '1px solid #929292',
                        }}
                    >
                        <Text style={{ fontSize: 11, marginBottom: 4 }}>Date</Text>
                        <Text style={{ fontSize: 11, marginBottom: 2 }}>Mar 9, 20221</Text>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingTop: 6,
                            paddingBottom: 4,
                            borderBottom: '1px solid #929292',
                        }}
                    >
                        <Text style={{ fontSize: 11, marginBottom: 4 }}>Reference #</Text>
                        <Text style={{ fontSize: 11, marginBottom: 2 }}>9310322</Text>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            paddingTop: 6,
                        }}
                    >
                        <Text style={{ fontSize: 11, marginBottom: 4 }}>Term</Text>
                        <Text style={{ fontSize: 11, marginBottom: 2 }}>Net 30 days</Text>
                    </View>
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
                        fontSize: 12,
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
                        borderBottom: '1px solid #929292',
                        fontSize: 11,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 90 }}>Flat Rate</Text>
                    <Text style={{ flex: 1 }}>Revenue of Load</Text>
                    <Text style={{ flexGrow: 0 }}>$800.00</Text>
                </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', fontSize: 11, marginTop: 4 }}>
                <View style={{ flex: 1 }}></View>
                <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            padding: 10,
                            borderBottom: '1px solid #929292',
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>Sub-Total (US$)</Text>
                            <Text>Zero Rated - Tax</Text>
                        </View>
                        <Text>$800.00</Text>
                    </View>
                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            padding: 10,
                            borderBottom: '1px solid #929292',
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{}}>Total Amount (US$)</Text>
                        </View>
                        <Text>$800.00</Text>
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
                        fontSize: 12,
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
                        borderBottom: '1px solid #929292',
                        fontSize: 11,
                    }}
                >
                    <Text style={{ flexGrow: 0, width: 50 }}>1</Text>
                    <Text style={{ flexGrow: 0, width: 80 }}>Mar 9, 2022</Text>
                    <Text style={{ flexGrow: 0, width: 60 }}>Pick Up</Text>
                    <Text style={{ flex: 1 }}>676 Timeless Run Greenwood, IN 46143</Text>
                </View>
            </View>
        </Page>
    </Document>
);

type DownloadButtonProps = {
    invoice: ExpandedInvoice;
    customer: Customer;
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
        const carrier = await getCarrierById(session.user.carrierId);
        const blob = await pdf(
            <InvoicePDF carrier={carrier} invoice={invoice} customer={customer} load={load} />,
        ).toBlob();

        const pdfUrl = window.URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = pdfUrl;
        tempLink.setAttribute('download', fileName);
        tempLink.click();
    };

    return (
        <a
            className="flex items-center justify-between py-2 pl-3 pr-4 text-sm cursor-pointer hover:bg-gray-50 active:bg-gray-100"
            onClick={handleDownload}
        >
            <div className="flex items-center flex-1 w-0">
                <PaperClipIcon className="flex-shrink-0 w-4 h-4 text-gray-400" aria-hidden="true" />
                <span className="flex-1 w-0 ml-2 truncate">invoice.pdf</span>
            </div>
            <div className="flex-shrink-0 ml-4"></div>
        </a>
    );
};
