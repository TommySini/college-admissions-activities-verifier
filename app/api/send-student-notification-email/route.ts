import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// This API route sends notification emails to students when their activity is verified/rejected

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      studentName,
      activityName,
      activityDescription,
      activityCategory,
      activityOrganization,
      verifierName,
      status, // "verified" or "denied"
      dashboardUrl,
    } = body;

    // Validate required fields
    if (!to || !studentName || !activityName || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const isVerified = status === "verified" || status === "accepted";

    // Configure email transporter (same as verification request email)
    let transporter;
    
    if (process.env.RESEND_API_KEY) {
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
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
    } else {
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const viewUrl = dashboardUrl || `${baseUrl}/activities`;
    
    const mailOptions = {
      from: `Actify <${fromEmail}>`,
      to: to,
      subject: isVerified 
        ? `✓ Your activity "${activityName}" has been verified!`
        : `Activity "${activityName}" verification update`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${isVerified ? '#10b981' : '#ef4444'} 0%, ${isVerified ? '#059669' : '#dc2626'} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">
              ${isVerified ? '✓ Activity Verified!' : 'Activity Verification Update'}
            </h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi <strong>${studentName}</strong>,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${isVerified 
                ? `Great news! Your activity has been verified by <strong>${verifierName || 'a verifier'}</strong>.`
                : `Your activity verification request has been ${status === 'denied' ? 'rejected' : 'updated'} by <strong>${verifierName || 'a verifier'}</strong>.`
              }
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${isVerified ? '#10b981' : '#ef4444'}; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong style="color: ${isVerified ? '#10b981' : '#ef4444'};">Activity:</strong> ${activityName}</p>
              ${activityCategory ? `<p style="margin: 10px 0;"><strong style="color: ${isVerified ? '#10b981' : '#ef4444'};">Category:</strong> ${activityCategory}</p>` : ''}
              ${activityOrganization ? `<p style="margin: 10px 0;"><strong style="color: ${isVerified ? '#10b981' : '#ef4444'};">Organization:</strong> ${activityOrganization}</p>` : ''}
              ${activityDescription ? `<p style="margin: 10px 0;"><strong style="color: ${isVerified ? '#10b981' : '#ef4444'};">Description:</strong> ${activityDescription}</p>` : ''}
            </div>
            
            ${isVerified 
              ? `<p style="font-size: 16px; margin: 30px 0 20px 0; text-align: center; color: #059669;">
                  Your activity is now verified and will appear in your profile!
                </p>`
              : `<p style="font-size: 16px; margin: 30px 0 20px 0; text-align: center; color: #dc2626;">
                  If you believe this is an error, please contact the verifier or add a new activity.
                </p>`
            }
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${viewUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">View Dashboard</a>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              This is an automated message from Actify.<br>
              You're receiving this because you submitted an activity for verification.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
${isVerified ? '✓ Activity Verified!' : 'Activity Verification Update'}

Hi ${studentName},

${isVerified 
  ? `Great news! Your activity has been verified by ${verifierName || 'a verifier'}.`
  : `Your activity verification request has been ${status === 'denied' ? 'rejected' : 'updated'} by ${verifierName || 'a verifier'}.`
}

Activity: ${activityName}
${activityCategory ? `Category: ${activityCategory}` : ''}
${activityOrganization ? `Organization: ${activityOrganization}` : ''}
${activityDescription ? `Description: ${activityDescription}` : ''}

${isVerified 
  ? 'Your activity is now verified and will appear in your profile!'
  : 'If you believe this is an error, please contact the verifier or add a new activity.'
}

View Dashboard: ${viewUrl}

This is an automated message from Actify.
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST && !process.env.GMAIL_USER) {
      console.log("Test email sent! Preview URL:", nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json({
      success: true,
      message: "Notification email sent successfully",
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification email" },
      { status: 500 }
    );
  }
}

