import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * API Route: /api/notify
 * Sends critical industrial alerts via email.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asset_id, value, limit, status, timestamp } = body;

    // Email configuration from environment variables
    // For Gmail: Use an "App Password" (https://myaccount.google.com/apppasswords)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"NPA Proactive Agent" <${process.env.EMAIL_USER}>`,
      to: process.env.MANAGER_EMAIL || process.env.EMAIL_USER,
      subject: `🚨 CRITICAL ALERT: ${asset_id} Threshold Breach`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; max-width: 600px;">
          <h2 style="color: #ef4444; margin-top: 0;">Industrial Safety Alert</h2>
          <p>The NPA Digital Twin has detected a critical threshold breach in the HP Separation Train.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">Asset ID:</td><td style="font-weight: bold;">${asset_id}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Current Value:</td><td style="font-weight: bold; color: #ef4444;">${value} barg</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Safety Limit:</td><td style="font-weight: bold;">${limit} barg</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Status:</td><td style="font-weight: bold; text-transform: uppercase;">${status}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Timestamp:</td><td>${timestamp || new Date().toISOString()}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.85rem; color: #64748b;">
            Autonomous intervention initiated: Field Manager outcall has been triggered via Vapi. 
            Please log into the <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/twin">NPA Dashboard</a> to investigate.
          </p>
        </div>
      `,
    };

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email notification skipped: EMAIL_USER or EMAIL_PASS not configured in .env.local');
      return NextResponse.json({ success: false, error: 'Email credentials missing' });
    }

    await transporter.sendMail(mailOptions);
    console.log(`Critical alert email sent for ${asset_id}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email Notification Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
