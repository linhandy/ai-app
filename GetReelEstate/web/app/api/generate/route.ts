import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        paid: true,
        user_id: userId,
      })
      .select('id')
      .single();

    if (dbErr) {
      console.error('[generate] DB error:', dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ videoId: task.id });

  } catch (err: any) {
    console.error('[generate] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
