import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildAdvisoryRequestKey } from "@/lib/advisory";
import {
  AdvisoryGroupRecord,
  flattenGroupStudentIds,
  loadAdvisorGroups,
  parseAdvisoryRequestValue,
  saveAdvisorGroups,
} from "@/lib/advisory-groups";

type PendingRequest = {
  email: string;
  createdAt: string;
  groupId: string | null;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const groups = await loadAdvisorGroups(prisma, user.id);
  const allStudentIds = flattenGroupStudentIds(groups);

  const students = allStudentIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: allStudentIds },
          role: "student",
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })
    : [];

  const studentMap = new Map(students.map((student) => [student.id, student]));

  const pendingSettings = await prisma.settings.findMany({
    where: {
      key: {
        startsWith: `advisory_request_${user.id}_`,
      },
    },
  });

  const fallbackGroupId = groups[0]?.id ?? null;
  const pendingRequests: PendingRequest[] = pendingSettings.map((req) => {
    const meta = parseAdvisoryRequestValue(req.value);
    return {
      email: req.key.replace(`advisory_request_${user.id}_`, ""),
      createdAt: req.createdAt.toISOString(),
      groupId: meta.groupId ?? fallbackGroupId,
    };
  });

  const groupsWithData = groups.map((group) => {
    const groupStudents = group.studentIds
      .map((id) => studentMap.get(id))
      .filter((student): student is NonNullable<typeof student> => Boolean(student));

    const groupPending = pendingRequests
      .filter((req) => req.groupId === group.id)
      .map(({ email, createdAt }) => ({ email, createdAt }));

    return {
      id: group.id,
      name: group.name,
      studentIds: group.studentIds,
      students: groupStudents,
      pendingRequests: groupPending,
    };
  });

  return NextResponse.json({
    groups: groupsWithData,
    students: groupsWithData.flatMap((group) => group.students),
    pendingRequests,
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const action = typeof body?.action === "string" ? body.action : "invite";

  switch (action) {
    case "create-group":
      return handleCreateGroup(user, body);
    case "rename-group":
      return handleRenameGroup(user, body);
    case "invite":
    default:
      return handleInviteToGroup(user, body);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin" && user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { email } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const requestKey = buildAdvisoryRequestKey(user.id, normalizedEmail);

  try {
    await prisma.settings.delete({
      where: { key: requestKey },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Pending request not found" }, { status: 404 });
    }
    console.error("[advisory] Failed to delete pending request:", error);
    return NextResponse.json({ error: "Failed to cancel request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

async function getMailTransporter() {
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

async function sendAdvisoryInviteEmail({
  to,
  studentName,
  advisorName,
  advisorEmail,
  acceptUrl,
}: {
  to: string;
  studentName: string;
  advisorName: string;
  advisorEmail?: string | null;
  acceptUrl: string;
}) {
  if (!to) return;
  const transporter = await getMailTransporter();
  const fromEmail = process.env.FROM_EMAIL || process.env.GMAIL_USER || "noreply@actify.app";
  const benefits = [
    "Share your activity log for quick advisor feedback",
    "Get curated opportunities and reminders",
    "Collaborate on recommendations and applications",
  ];

  const mailOptions = {
    from: `Actify <${fromEmail}>`,
    to,
    subject: `${advisorName ?? "Your advisor"} invited you to join their advisory`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; background:#f8fafc; padding:32px;">
        <div style="max-width:640px;margin:0 auto;background:white;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="padding:32px;">
            <p style="font-size:14px;text-transform:uppercase;letter-spacing:0.3em;color:#64748b;margin:0 0 16px;">Advisory invitation</p>
            <h1 style="font-size:24px;color:#0f172a;margin:0 0 12px;">Hi ${studentName || "there"},</h1>
            <p style="font-size:16px;color:#334155;margin:0 0 20px;">
              ${advisorName ?? "One of your advisors"} invited you to connect on Actify so they can help manage your organizations,
              activities, and service goals.
            </p>
            <div style="background:#f1f5f9;border-radius:16px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 12px;color:#0f172a;font-weight:600;">What you'll unlock by accepting:</p>
              <ul style="margin:0;padding-left:20px;color:#475569;">
                ${benefits.map((benefit) => `<li style="margin-bottom:8px;">${benefit}</li>`).join("")}
              </ul>
            </div>
            <p style="font-size:15px;color:#475569;margin:0 0 24px;">
              Use the link below to review the invite. You can accept or decline at any time.
            </p>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${acceptUrl}" style="display:inline-block;background:#0f172a;color:white;padding:14px 32px;border-radius:999px;font-weight:600;text-decoration:none;">
                Review invite
              </a>
            </div>
            <p style="font-size:13px;color:#94a3b8;margin:0;">
              Need context? Reply to this email${advisorEmail ? ` or reach ${advisorEmail}` : ""}.
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
Hi ${studentName || "there"},

${advisorName ?? "One of your advisors"} invited you to connect on Actify so they can help manage your activities and service goals.

What you'll unlock:
- Share your activity log for quick advisor feedback
- Get curated opportunities and reminders
- Collaborate on recommendations and applications

Review the invite: ${acceptUrl}

You can accept or decline at any time.
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST && !process.env.GMAIL_USER) {
    console.log("Advisory invite email preview:", nodemailer.getTestMessageUrl(info));
  }
}

async function handleCreateGroup(
  user: { id: string },
  body: { name?: string }
) {
  const groups = await loadAdvisorGroups(prisma, user.id);
  const trimmedName =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : `Advisory ${groups.length + 1}`;

  const newGroup: AdvisoryGroupRecord = {
    id: randomUUID(),
    name: trimmedName,
    studentIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveAdvisorGroups(prisma, user.id, [...groups, newGroup]);

  return NextResponse.json({ group: newGroup });
}

async function handleRenameGroup(
  user: { id: string },
  body: { groupId?: string; name?: string }
) {
  const { groupId, name } = body;
  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const groups = await loadAdvisorGroups(prisma, user.id);
  const index = groups.findIndex((group) => group.id === groupId);

  if (index === -1) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  groups[index] = {
    ...groups[index],
    name: name.trim(),
    updatedAt: new Date().toISOString(),
  };

  await saveAdvisorGroups(prisma, user.id, groups);

  return NextResponse.json({ group: groups[index] });
}

async function handleInviteToGroup(
  user: { id: string; name?: string | null; email?: string | null },
  body: { email?: string; groupId?: string }
) {
  const { email, groupId } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json({ error: "Group is required" }, { status: 400 });
  }

  const groups = await loadAdvisorGroups(prisma, user.id);
  const targetGroup = groups.find((group) => group.id === groupId);

  if (!targetGroup) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const requestKey = buildAdvisoryRequestKey(user.id, normalizedEmail);

  const student = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!student || student.role !== "student") {
    return NextResponse.json(
      { error: "No student found with this email" },
      { status: 404 }
    );
  }

  const allStudentIds = flattenGroupStudentIds(groups);
  if (allStudentIds.includes(student.id)) {
    return NextResponse.json(
      { error: "Student is already in your advisory" },
      { status: 400 }
    );
  }

  const existingRequest = await prisma.settings.findUnique({
    where: { key: requestKey },
  });

  if (existingRequest) {
    return NextResponse.json(
      { error: "Request already sent to this student" },
      { status: 400 }
    );
  }

  await prisma.settings.create({
    data: {
      key: requestKey,
      value: JSON.stringify({ studentId: student.id, groupId: targetGroup.id }),
    },
  });

  const acceptUrl = `${getBaseUrl()}/dashboard#advisory-invites`;

  sendAdvisoryInviteEmail({
    to: student.email,
    studentName: student.name,
    advisorName: user.name ?? "Your advisor",
    advisorEmail: user.email,
    acceptUrl,
  }).catch((error) => {
    console.error("[advisory] Failed to send invite email:", error);
  });

  return NextResponse.json({
    success: true,
    message: "Advisory request sent and the student has been notified",
    groupId: targetGroup.id,
  });
}

