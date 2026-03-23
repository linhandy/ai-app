import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url: string };

  if (!url?.includes('zillow.com') && !url?.includes('realtor.com') && !url?.includes('redfin.com')) {
    return NextResponse.json({ error: 'Please enter a Zillow, Realtor.com, or Redfin URL' }, { status: 400 });
  }

  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'RapidAPI key not configured' }, { status: 503 });
  }

  const zpid = extractZpid(url);
  if (!zpid) {
    return NextResponse.json({ error: 'Could not extract property ID from URL' }, { status: 400 });
  }

  try {
    // RapidAPI — Real-Time Real Estate Data (real-time-real-estate-data.p.rapidapi.com)
    const apiRes = await fetch(
      `https://real-time-real-estate-data.p.rapidapi.com/property-details?zpid=${zpid}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'real-time-real-estate-data.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!apiRes.ok) {
      const txt = await apiRes.text();
      throw new Error(`RapidAPI error ${apiRes.status}: ${txt.slice(0, 200)}`);
    }

    const json = await apiRes.json();
    // Response is wrapped: { status: 'OK', data: { ... } }
    const data = json.data ?? json;

    // Extract high-res images from responsivePhotos
    const imageUrls: string[] = (
      data.responsivePhotos?.map((p: any) => {
        const jpegs = p.mixedSources?.jpeg ?? [];
        return jpegs[jpegs.length - 1]?.url || jpegs[0]?.url || p.url;
      }) ||
      data.originalPhotos?.map((p: any) => {
        const jpegs = p.mixedSources?.jpeg ?? [];
        return jpegs[jpegs.length - 1]?.url || jpegs[0]?.url;
      }) ||
      []
    ).filter(Boolean).slice(0, 7);

    const resoFacts = data.resoFacts ?? {};
    const price     = data.price ? `$${(data.price / 1000).toFixed(0)}K` : '';
    const beds      = resoFacts.bedrooms ?? data.bedrooms;
    const baths     = resoFacts.bathrooms ?? data.bathrooms;
    const sqft      = resoFacts.livingArea ?? data.livingArea ?? '';
    const city      = data.city || data.address?.city || '';
    const state     = data.state || data.address?.state || '';
    const desc      = data.description || '';

    const description = [
      beds && baths ? `${beds}BR/${baths}BA` : '',
      sqft ? `${sqft}` : '',
      city ? `home in ${city}${state ? ', ' + state : ''}.` : 'home.',
      price ? `Listed at ${price}.` : '',
      desc ? desc.slice(0, 300) : '',
    ].filter(Boolean).join(' ').trim();

    return NextResponse.json({ imageUrls, description });
  } catch (err: any) {
    console.error('[scrape]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function extractZpid(url: string): string {
  // e.g. https://www.zillow.com/homedetails/address/790242_zpid/
  const m = url.match(/(\d{5,12})_zpid/);
  if (m) return m[1];
  // fallback: last numeric segment
  const segs = url.split('/').filter(s => /^\d{5,}$/.test(s));
  return segs[segs.length - 1] || '';
}
