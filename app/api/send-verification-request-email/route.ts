import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// This API route sends an email to a verifier asking them to verify a student's activity

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      studentName,
      studentEmail,
      activityName,
      activityDescription,
      activityCategory,
      activityOrganization,
      activityStartDate,
      activityEndDate,
      activityId,
    } = body;

    // Validate required fields
    if (!to || !studentName || !activityName || !activityId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    
    const acceptUrl = `${baseUrl}/api/verify-activity?activityId=${activityId}&action=accept`;
    const rejectUrl = `${baseUrl}/api/verify-activity?activityId=${activityId}&action=reject`;

    // Configure email transporter
    // Option 1: Using Gmail SMTP (requires app password)
    // Option 2: Using custom SMTP
    // Option 3: Using Resend (uncomment and use if you have RESEND_API_KEY)
    
    let transporter;
    
    if (process.env.RESEND_API_KEY) {
      // Using Resend (recommended for production)
      transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Using custom SMTP
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      // Using Gmail SMTP
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    } else {
      // Fallback: Use Ethereal Email for testing (creates a test account)
      console.warn("No email configuration found. Using Ethereal Email for testing.");
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const fromEmail = process.env.FROM_EMAIL || process.env.GMAIL_USER || "noreply@actify.app";
    
    const mailOptions = {
      from: `Actify <${fromEmail}>`,
      to: to,
      subject: `Verification Request: ${studentName} - ${activityName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Actify Verification Request</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${studentName}</strong> (${studentEmail}) is claiming the following activity and needs your verification:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong style="color: #2563eb;">Activity:</strong> ${activityName}</p>
              <p style="margin: 10px 0;"><strong style="color: #2563eb;">Category:</strong> ${activityCategory}</p>
              ${activityOrganization ? `<p style="margin: 10px 0;"><strong style="color: #2563eb;">Organization:</strong> ${activityOrganization}</p>` : ''}
              <p style="margin: 10px 0;"><strong style="color: #2563eb;">Description:</strong> ${activityDescription}</p>
              <p style="margin: 10px 0;"><strong style="color: #2563eb;">Start Date:</strong> ${new Date(activityStartDate).toLocaleDateString()}</p>
              ${activityEndDate ? `<p style="margin: 10px 0;"><strong style="color: #2563eb;">End Date:</strong> ${new Date(activityEndDate).toLocaleDateString()}</p>` : '<p style="margin: 10px 0;"><strong style="color: #2563eb;">Status:</strong> Ongoing</p>'}
            </div>
            
            <p style="font-size: 16px; margin: 30px 0 20px 0; text-align: center;">
              Please verify if this information is correct:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-right: 10px; display: inline-block; font-weight: bold; font-size: 16px;">✓ Confirm</a>
              <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">✗ Reject</a>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              If you did not expect this email, please ignore it.<br>
              This is an automated message from Actify.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Actify Verification Request

${studentName} (${studentEmail}) is claiming the following activity:

Activity: ${activityName}
Category: ${activityCategory}
${activityOrganization ? `Organization: ${activityOrganization}` : ''}
Description: ${activityDescription}
Start Date: ${new Date(activityStartDate).toLocaleDateString()}
${activityEndDate ? `End Date: ${new Date(activityEndDate).toLocaleDateString()}` : 'Status: Ongoing'}

Please verify if this information is correct:

Confirm: ${acceptUrl}
Reject: ${rejectUrl}

If you did not expect this email, please ignore it.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // If using Ethereal Email (test mode), log the preview URL
    if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST && !process.env.GMAIL_USER) {
      console.log("Test email sent! Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
      messageId: info.messageId,
      acceptUrl,
      rejectUrl,
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send verification email" },
      { status: 500 }
    );
  }
}

