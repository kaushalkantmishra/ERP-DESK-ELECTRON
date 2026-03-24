import nodemailer from 'nodemailer';

let rfqMailTransporter: nodemailer.Transporter | null = null;

function isTruthy(value?: string) {
    return !!value && value.trim().length > 0;
}

export function isMailerConfigured() {
    return isTruthy(process.env.SMTP_HOST)
        && isTruthy(process.env.SMTP_PORT)
        && isTruthy(process.env.SMTP_USER)
        && isTruthy(process.env.SMTP_PASS)
        && isTruthy(process.env.SMTP_FROM_EMAIL);
}

function getMailTransporter() {
    if (rfqMailTransporter) return rfqMailTransporter;

    rfqMailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    return rfqMailTransporter;
}

export async function sendRfqInvitationEmail(params: {
    rfqNo: string;
    rfqId: number;
    prNo?: string;
    dueDate?: Date | null;
    vendor: { name: string; email?: string | null };
    attachment?: {
        filename: string;
        content: Buffer;
        contentType?: string;
    };
}) {
    if (!isMailerConfigured()) {
        return { sent: false, skipped: true, reason: 'SMTP is not configured' };
    }

    if (!params.vendor.email) {
        return { sent: false, skipped: true, reason: 'Vendor email is missing' };
    }

    const dueDateText = params.dueDate ? params.dueDate.toLocaleDateString() : 'Not specified';
    const fromName = process.env.SMTP_FROM_NAME || 'ERP Procurement';

    await getMailTransporter().sendMail({
        from: `"${fromName}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: params.vendor.email,
        subject: `RFQ Invitation: ${params.rfqNo}`,
        text: [
            `Dear ${params.vendor.name},`,
            '',
            `You have been invited to submit a quotation for RFQ ${params.rfqNo}.`,
            params.prNo ? `Reference PR: ${params.prNo}` : '',
            `Due Date: ${dueDateText}`,
            '',
            'The quotation template is attached in Excel format with the PR item list prefilled. Please enter only the quoted price and import it back into the ERP to simulate the quotation response.',
            '',
            'Please review the RFQ and submit your quotation before the due date.',
            '',
            'Regards,',
            fromName,
        ].filter(Boolean).join('\n'),
        html: `
            <p>Dear ${params.vendor.name},</p>
            <p>You have been invited to submit a quotation for <strong>RFQ ${params.rfqNo}</strong>.</p>
            <p>${params.prNo ? `Reference PR: <strong>${params.prNo}</strong><br/>` : ''}Due Date: <strong>${dueDateText}</strong></p>
            <p>The quotation template is attached in Excel format with the PR item list already filled. Please enter only the quoted price and import it back into the ERP to simulate the quotation response.</p>
            <p>Please review the RFQ and submit your quotation before the due date.</p>
            <p>Regards,<br/>${fromName}</p>
        `,
        attachments: params.attachment ? [{
            filename: params.attachment.filename,
            content: params.attachment.content,
            contentType: params.attachment.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }] : undefined,
    });

    return { sent: true, skipped: false };
}

export async function sendPurchaseOrderEmail(params: {
    poNo: string;
    vendor: { name: string; email?: string | null };
    prNo?: string | null;
    rfqNo?: string | null;
    quotationId?: number | null;
    requestConfirmation?: boolean;
    attachment?: {
        filename: string;
        content: Buffer;
        contentType?: string;
    };
    deliveryDate?: Date | null;
    totalAmount?: number;
    items: Array<{
        itemCode?: string | null;
        itemName: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        totalAmount?: number;
    }>;
}) {
    if (!isMailerConfigured()) {
        return { sent: false, skipped: true, reason: 'SMTP is not configured' };
    }

    if (!params.vendor.email) {
        return { sent: false, skipped: true, reason: 'Vendor email is missing' };
    }

    const fromName = process.env.SMTP_FROM_NAME || 'ERP Procurement';
    const deliveryDateText = params.deliveryDate ? params.deliveryDate.toLocaleDateString() : 'Not specified';
    const totalText = typeof params.totalAmount === 'number' ? params.totalAmount.toFixed(2) : '0.00';
    const introText = params.requestConfirmation
        ? `Please review and confirm purchase order ${params.poNo}.`
        : `Please find the purchase order ${params.poNo}.`;
    const closingText = params.requestConfirmation
        ? 'Please confirm acceptance of this purchase order.'
        : 'Please supply the items as per the issued purchase order details below.';

    const itemRowsHtml = params.items.map((item) => `
        <tr>
            <td style="padding:8px;border:1px solid #d1d5db;">${item.itemCode ? `${item.itemCode} - ` : ''}${item.itemName}</td>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${item.quantity.toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${item.unitPrice.toFixed(2)}</td>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${(item.taxRate || 0).toFixed(2)}%</td>
            <td style="padding:8px;border:1px solid #d1d5db;text-align:right;">${(item.totalAmount || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    await getMailTransporter().sendMail({
        from: `"${fromName}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: params.vendor.email,
        subject: `${params.requestConfirmation ? 'PO Confirmation Required' : 'Purchase Order'}: ${params.poNo}`,
        text: [
            `Dear ${params.vendor.name},`,
            '',
            introText,
            params.prNo ? `Reference PR: ${params.prNo}` : '',
            params.rfqNo ? `Reference RFQ: ${params.rfqNo}` : '',
            params.quotationId ? `Reference Quotation ID: ${params.quotationId}` : '',
            `Expected Delivery Date: ${deliveryDateText}`,
            `Total Amount: ${totalText}`,
            '',
            closingText,
            '',
            'Items:',
            ...params.items.map((item) => `- ${item.itemCode ? `${item.itemCode} - ` : ''}${item.itemName}: Qty ${item.quantity.toFixed(2)}, Unit Price ${item.unitPrice.toFixed(2)}, Tax ${(item.taxRate || 0).toFixed(2)}%, Line Total ${(item.totalAmount || 0).toFixed(2)}`),
            '',
            'Regards,',
            fromName,
        ].filter(Boolean).join('\n'),
        html: `
            <p>Dear ${params.vendor.name},</p>
            <p>${introText.replace(params.poNo, `<strong>${params.poNo}</strong>`)}</p>
            <p>
                ${params.prNo ? `Reference PR: <strong>${params.prNo}</strong><br/>` : ''}
                ${params.rfqNo ? `Reference RFQ: <strong>${params.rfqNo}</strong><br/>` : ''}
                ${params.quotationId ? `Reference Quotation ID: <strong>${params.quotationId}</strong><br/>` : ''}
                Expected Delivery Date: <strong>${deliveryDateText}</strong><br/>
                Total Amount: <strong>${totalText}</strong>
            </p>
            <p>${closingText}</p>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
                <thead>
                    <tr>
                        <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Item</th>
                        <th style="padding:8px;border:1px solid #d1d5db;text-align:right;">Qty</th>
                        <th style="padding:8px;border:1px solid #d1d5db;text-align:right;">Unit Price</th>
                        <th style="padding:8px;border:1px solid #d1d5db;text-align:right;">Tax %</th>
                        <th style="padding:8px;border:1px solid #d1d5db;text-align:right;">Line Total</th>
                    </tr>
                </thead>
                <tbody>${itemRowsHtml}</tbody>
            </table>
            <p>Regards,<br/>${fromName}</p>
        `,
        attachments: params.attachment ? [{
            filename: params.attachment.filename,
            content: params.attachment.content,
            contentType: params.attachment.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }] : undefined,
    });

    return { sent: true, skipped: false };
}

