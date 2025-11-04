import { NextResponse } from 'next/server';

// Fetch available bicycle colors from biciregistro.es config API
export async function GET() {
  try {
    const response = await fetch(
      'https://www.biciregistro.es/biciregistro/rest/v1/config/getColors',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        cache: 'force-cache',
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const colors = await response.json();
    
    // Transform to simpler format
    const transformedColors = colors.map((c: any) => ({
      id: c.id,
      label: c.color?.trim() || '',
    })).filter((c: any) => c.label);

    return NextResponse.json({
      success: true,
      count: transformedColors.length,
      data: transformedColors,
    });
  } catch (error) {
    console.error('Error fetching colors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch colors' },
      { status: 500 }
    );
  }
}
