import { NextResponse } from 'next/server';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Fetch available bicycle brands from biciregistro.es config API
export async function GET() {
  try {
    const response = await fetch(
      'https://www.biciregistro.es/biciregistro/rest/v1/config/getMarcas',
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        cache: 'force-cache',
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const brands = await response.json();
    
    // Transform to simpler format
    const transformedBrands = brands.map((b: any) => ({
      id: b.id,
      label: b.marca?.trim() || '',
    })).filter((b: any) => b.label);

    return NextResponse.json({
      success: true,
      count: transformedBrands.length,
      data: transformedBrands,
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
