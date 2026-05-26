import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await resend.emails.send({
      from:    "WriteMate Feedback <onboarding@resend.dev>",
      to:      "rahul.chauhan@successive.tech",
      replyTo: email,
      subject: `WriteMate Feedback from ${name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#6366f1;margin-bottom:4px;">WriteMate — New Feedback</h2>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:3px solid #6366f1;margin:8px 0;padding:8px 16px;background:#f9fafb;border-radius:4px;">
            ${message.replace(/\n/g, "<br/>")}
          </blockquote>
        </div>`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback email error:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
