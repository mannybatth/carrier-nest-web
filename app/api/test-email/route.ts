import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
    try {
        // Check if email environment variables are set
        const emailConfig = {
            host: process.env.EMAIL_SERVER_HOST,
            port: process.env.EMAIL_SERVER_PORT,
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
            from: process.env.EMAIL_FROM,
        };

        console.log('Email configuration check:', {
            host: emailConfig.host ? 'SET' : 'NOT SET',
            port: emailConfig.port ? 'SET' : 'NOT SET',
            user: emailConfig.user ? 'SET' : 'NOT SET',
            pass: emailConfig.pass ? 'SET' : 'NOT SET',
            from: emailConfig.from ? 'SET' : 'NOT SET',
        });

        if (!emailConfig.host || !emailConfig.user || !emailConfig.pass) {
            return NextResponse.json({
                success: false,
                error: 'Email configuration incomplete',
                config: {
                    host: emailConfig.host ? 'SET' : 'NOT SET',
                    port: emailConfig.port ? 'SET' : 'NOT SET',
                    user: emailConfig.user ? 'SET' : 'NOT SET',
                    pass: emailConfig.pass ? 'SET' : 'NOT SET',
                    from: emailConfig.from ? 'SET' : 'NOT SET',
                },
            });
        }

        // Test connection
        const transport = nodemailer.createTransport({
            host: emailConfig.host,
            port: parseInt(emailConfig.port || '587'),
            secure: parseInt(emailConfig.port || '587') === 465,
            auth: {
                user: emailConfig.user,
                pass: emailConfig.pass,
            },
        });

        await transport.verify();

        return NextResponse.json({
            success: true,
            message: 'Email configuration is valid and SMTP connection successful',
            config: {
                host: emailConfig.host,
                port: emailConfig.port,
                from: emailConfig.from,
                user: emailConfig.user?.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email for security
            },
        });
    } catch (error) {
        console.error('Email test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
}
