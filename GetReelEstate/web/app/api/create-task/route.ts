import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, sourceUrls = [] } = body as {
    prompt: string;
    sourceUrls?: string[];
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('videos')
    .insert({ prompt: prompt.trim(), source_urls: sourceUrls, status: 'pending' })
    .select('id')
    .single();

  if (error) {
    console.error('[create-task]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
