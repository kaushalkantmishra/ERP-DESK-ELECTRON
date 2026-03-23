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

    const appUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const rfqLink = `${appUrl}/procurement/rfq/${params.rfqId}`;
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
            `View RFQ: ${rfqLink}`,
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
            <p><a href="${rfqLink}">Open RFQ</a></p>
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