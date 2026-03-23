import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Create a free task (no payment required).
 * Client tracks usage in localStorage; server does not enforce limits.
 */
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

    const { data: task, error: dbErr } = await supabaseAdmin
      .from('videos')
      .insert({
        prompt: prompt.trim(),
        source_urls: sourceUrls,
        status: 'pending',
        paid: true,          // Free — skip payment
      })
      .select('id')
      .single();

    if (dbErr) {
      console.error('[claim-free] DB error:', dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ videoId: task.id });

  } catch (err: any) {
    console.error('[claim-free] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
