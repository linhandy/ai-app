import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { email, subject, floorLabel, svgDataUrl, designSummary } = await req.json();
  if (!email || !svgDataUrl) return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });

  // Convert data URL to base64 attachment
  const base64Data = svgDataUrl.replace(/^data:image\/png;base64,/, '');

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@handyai.cc',
      to: [email],
      subject: subject || `您的自建房户型设计图 — ${floorLabel}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <div style="background: #1a1c1e; padding: 24px 32px;">
            <h1 style="color: #fff; font-size: 20px; margin: 0;">🏠 自建房设计大师</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">您的户型设计图已生成</h2>
            <div style="background: #f5f4f2; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 14px; color: #666;">
              ${designSummary || ''}
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              请查看附件中的户型平面图（PNG 格式）。如需下载 SVG 矢量图或 DXF 工程图，请访问我们的网站重新生成并下载。
            </p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0dfdc; font-size: 12px; color: #999;">
              此邮件由自建房设计大师自动发送，请勿直接回复。
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `户型图_${floorLabel}.png`,
          content: base64Data,
          contentType: 'image/png',
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '邮件发送失败';
    console.error('[send-email] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
