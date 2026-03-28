import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'real-time-real-estate-data.p.rapidapi.com';

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url: string };

  if (!url?.includes('zillow.com') && !url?.includes('realtor.com') && !url?.includes('redfin.com')) {
    return NextResponse.json({ error: 'Please enter a Zillow, Realtor.com, or Redfin URL' }, { status: 400 });
  }

  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'RapidAPI key not configured' }, { status: 503 });
  }

  try {
    let data: any;

    if (url.includes('zillow.com')) {
      // Zillow: extract zpid and fetch directly
      const zpid = extractZpid(url);
      if (zpid) {
        data = await fetchByZpid(zpid);
      } else {
        // Fallback: try address extraction from Zillow URL
        const address = extractAddressFromZillowUrl(url);
        if (address) data = await fetchBySearch(address);
      }
    } else {
      // Realtor.com and Redfin: extract address from URL, then search
      const address = extractAddressFromUrl(url);
      if (!address) {
        return NextResponse.json({ error: 'Could not extract address from URL. Please try a Zillow URL or upload photos directly.' }, { status: 400 });
      }
      data = await fetchBySearch(address);
    }

    if (!data) {
      return NextResponse.json({ error: 'Property not found. Try a different URL or upload photos directly.' }, { status: 404 });
    }

    // Extract high-res images
    const imageUrls: string[] = extractImages(data);

    if (!imageUrls.length) {
      return NextResponse.json({ error: 'No photos found for this property. Try uploading photos directly.' }, { status: 404 });
    }

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
      sqft ? `${String(sqft).replace(/\s*sqft/i, '')} sqft` : '',
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

// ── Fetch by Zillow zpid ─────────────────────────────────────────────────────

async function fetchByZpid(zpid: string) {
  const apiRes = await fetch(
    `https://${RAPIDAPI_HOST}/property-details?zpid=${zpid}`,
    { headers: rapidApiHeaders() }
  );

  if (!apiRes.ok) {
    const txt = await apiRes.text();
    throw new Error(`API error ${apiRes.status}: ${txt.slice(0, 200)}`);
  }

  const json = await apiRes.json();
  return json.data ?? json;
}

// ── Fetch by address search (works for all platforms) ────────────────────────
// Two-step: search to find zpid, then get full property details

async function fetchBySearch(address: string) {
  console.log('[scrape] searching for address:', address);

  const searchRes = await fetch(
    `https://${RAPIDAPI_HOST}/search?location=${encodeURIComponent(address)}&limit=1`,
    { headers: rapidApiHeaders() }
  );

  if (!searchRes.ok) {
    const txt = await searchRes.text();
    throw new Error(`Search failed (${searchRes.status}): ${txt.slice(0, 200)}`);
  }

  const searchJson = await searchRes.json();
  const results = searchJson.data;

  if (!Array.isArray(results) || results.length === 0) {
    console.log('[scrape] no search results for:', address);
    return null;
  }

  const first = results[0];
  console.log('[scrape] found:', first.streetAddress, '| zpid:', first.zpid, '| photos:', first.responsivePhotos?.length);

  // If the search result already has full photos, use it directly
  if (first.responsivePhotos?.length > 0) {
    return first;
  }

  // Otherwise, if we got a zpid, fetch full property details
  if (first.zpid) {
    console.log('[scrape] fetching full details for zpid:', first.zpid);
    return fetchByZpid(String(first.zpid));
  }

  // Last resort: return the search result as-is (may have miniCardPhotos)
  return first;
}

// ── Extract images from property data ────────────────────────────────────────

function extractImages(data: any): string[] {
  // Try high-res responsive photos first
  if (data.responsivePhotos?.length) {
    return data.responsivePhotos.map((p: any) => {
      const jpegs = p.mixedSources?.jpeg ?? [];
      return jpegs[jpegs.length - 1]?.url || jpegs[0]?.url || p.url;
    }).filter(Boolean).slice(0, 7);
  }

  // Try original photos
  if (data.originalPhotos?.length) {
    return data.originalPhotos.map((p: any) => {
      const jpegs = p.mixedSources?.jpeg ?? [];
      return jpegs[jpegs.length - 1]?.url || jpegs[0]?.url;
    }).filter(Boolean).slice(0, 7);
  }

  // Try generic photos array
  if (data.photos?.length) {
    return data.photos.map((p: any) => p.href || p.url).filter(Boolean).slice(0, 7);
  }

  // Fallback: miniCardPhotos from search results
  if (data.miniCardPhotos?.length) {
    return data.miniCardPhotos.map((p: any) => p.url).filter(Boolean).slice(0, 7);
  }

  // Last resort: single image
  if (data.imgSrc) return [data.imgSrc];

  return [];
}

// ── URL Parsers ──────────────────────────────────────────────────────────────

function extractZpid(url: string): string {
  const m = url.match(/(\d{5,12})_zpid/);
  if (m) return m[1];
  const segs = url.split('/').filter(s => /^\d{5,}$/.test(s));
  return segs[segs.length - 1] || '';
}

function extractAddressFromZillowUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    // /homedetails/123-Main-St-City-State-12345/zpid
    const match = pathname.match(/\/homedetails\/([^/]+)\//);
    if (match) {
      return match[1].replace(/-/g, ' ');
    }
  } catch { /* */ }
  return null;
}

/**
 * Extract a street address from Realtor.com or Redfin URLs.
 */
function extractAddressFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;

    // ── Realtor.com ──
    // /realestateandhomes-detail/123-Main-St_City_State_12345_M...
    if (url.includes('realtor.com')) {
      const match = pathname.match(/\/realestateandhomes-detail\/([^/]+)/);
      if (match) {
        const slug = match[1];
        const parts = slug.split('_').filter(Boolean);
        if (parts.length >= 3) {
          const street = parts[0].replace(/-/g, ' ');
          const city = parts[1].replace(/-/g, ' ');
          const state = parts[2];
          const zip = parts[3] && /^\d{5}/.test(parts[3]) ? parts[3].slice(0, 5) : '';
          return `${street}, ${city}, ${state}${zip ? ' ' + zip : ''}`;
        }
      }
    }

    // ── Redfin ──
    // /CA/Los-Angeles/123-Main-St-90001/home/12345678
    if (url.includes('redfin.com')) {
      const homeMatch = pathname.match(/\/([A-Z]{2})\/([\w-]+)\/([\w-]+)\/home\//);
      if (homeMatch) {
        const state = homeMatch[1];
        const city = homeMatch[2].replace(/-/g, ' ');
        const streetAndZip = homeMatch[3].replace(/-/g, ' ');
        return `${streetAndZip}, ${city}, ${state}`;
      }

      // Fallback
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 3) {
        const state = segments.find(s => /^[A-Z]{2}$/.test(s));
        if (state) {
          const stateIdx = segments.indexOf(state);
          const city = segments[stateIdx + 1]?.replace(/-/g, ' ');
          const street = segments[stateIdx + 2]?.replace(/-/g, ' ');
          if (city && street) return `${street}, ${city}, ${state}`;
        }
      }
    }
  } catch { /* */ }

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rapidApiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': RAPIDAPI_KEY!,
  };
}
