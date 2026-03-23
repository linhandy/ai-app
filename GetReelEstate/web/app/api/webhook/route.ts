import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature')!;

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] signature failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const videoId = session.metadata?.video_id;

    if (videoId) {
      const customerEmail = session.customer_details?.email ?? null;

      // 标记为已支付 — Worker 会监听 paid=true 的 pending 任务
      const { error } = await supabaseAdmin
        .from('videos')
        .update({ paid: true, user_email: customerEmail })
        .eq('id', videoId);

      if (error) {
        console.error('[webhook] db update failed:', error);
        return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
      }
      console.log('[webhook] paid:', videoId);
    }
  }

  return NextResponse.json({ received: true });
}

// 必须关闭 body parser，Stripe 需要原始 body 校验签名
export const config = { api: { bodyParser: false } };
