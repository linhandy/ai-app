import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

// Lazy init — avoid build-time error when key is empty
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

const APP_URL     = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
const PRICE_CENTS = parseInt(process.env.STRIPE_PRICE_CENTS || '990', 10);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body) return NextResponse.json({ error: 'Empty request body' }, { status: 400 });

    const { prompt, sourceUrls = [] } = JSON.parse(body) as {
      prompt: string;
      sourceUrls?: string[];
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // 1. Create task record in DB
    const { data: task, error: dbErr } = await supabaseAdmin
      .from('videos')
      .insert({ prompt: prompt.trim(), source_urls: sourceUrls, status: 'pending', paid: false })
      .select('id')
      .single();

    if (dbErr) {
      console.error('[checkout] DB insert failed:', dbErr);
      return NextResponse.json({ error: 'DB error: ' + dbErr.message }, { status: 500 });
    }

    // 2. Create Stripe Checkout Session
    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'Real Estate Reel — GetReelEstate',
            description: 'AI-generated 16:9 property marketing video with voiceover & captions',
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${APP_URL}/create?session_id={CHECKOUT_SESSION_ID}&video_id=${task.id}`,
      cancel_url:  `${APP_URL}/create?canceled=1`,
      metadata: {
        video_id: task.id,
        prompt:   prompt.trim().slice(0, 500),
      },
    });

    // 3. Store Stripe session ID
    await supabaseAdmin
      .from('videos')
      .update({ stripe_session_id: session.id })
      .eq('id', task.id);

    return NextResponse.json({ url: session.url, videoId: task.id });

  } catch (err: any) {
    console.error('[checkout] error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
