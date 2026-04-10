import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { filename, pdfBase64 } = body;

        if (!filename || !pdfBase64) {
            return NextResponse.json({ success: false, error: 'Missing filename or pdfBase64' }, { status: 400 });
        }

        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            console.warn('[EMAIL] SMTP credenciais não configuradas. Envio ignorado.');
            return NextResponse.json({ 
                success: false, 
                error: `SMTP não configurado. USER: ${user ? 'presente' : 'faltando'}, PASS: ${pass ? 'presente' : 'faltando'}` 
            }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: user,
                pass: pass
            }
        });

        const mailOptions = {
            from: `"Dimais Hub" <${user}>`,
            to: 'dimaiscorpfinance@gmail.com',
            subject: filename,
            text: `Segue em anexo o arquivo gerado automaticamente pelo sistema: ${filename}`,
            attachments: [
                {
                    filename: filename,
                    content: pdfBase64,
                    encoding: 'base64'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
        console.error('[EMAIL] Send error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
