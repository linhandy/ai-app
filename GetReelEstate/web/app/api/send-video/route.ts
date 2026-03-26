import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, videoUrl, script } = await req.json() as {
    email: string;
    videoUrl: string;
    script?: string;
  };

  if (!email || !videoUrl) {
    return NextResponse.json({ error: 'email and videoUrl required' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  // RESEND_FROM_EMAIL must be a verified sender in Resend dashboard.
  // For testing without domain verification: use 'onboarding@resend.dev'
  const from = process.env.RESEND_FROM_EMAIL || 'GetReelEstate <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: '🎬 Your Real Estate Reel is Ready!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:32px;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#f59e0b;border-radius:8px;padding:8px 20px;font-weight:700;color:#1c1917;font-size:18px">
            GetReelEstate
          </div>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Your reel is ready! 🎉</h1>
        <p style="color:#94a3b8;margin-bottom:24px">Your AI-generated real estate video is ready to download and post.</p>
        <div style="text-align:center;margin-bottom:24px">
          <a href="${videoUrl}"
            style="display:inline-block;background:#f59e0b;color:#1c1917;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px">
            ⬇️ Download Your Video
          </a>
        </div>
        ${script ? `
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:24px">
          <div style="font-size:12px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">AI Script</div>
          <p style="color:#e2e8f0;line-height:1.6;margin:0">${script}</p>
        </div>` : ''}
        <p style="color:#475569;font-size:12px;text-align:center;margin:0">
          Ready for Instagram Reels, TikTok, YouTube Shorts &amp; Facebook
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[send-video]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
