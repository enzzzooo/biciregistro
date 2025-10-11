import { NextRequest, NextResponse } from 'next/server';
import type { Bicycle, SearchFilters } from '@/types/bicycle';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

// This function scrapes biciregistro.es for bicycle data with pagination support
async function fetchBicyclesFromBiciregistro(filters: SearchFilters): Promise<Bicycle[]> {
  try {
    const allBicycles: Bicycle[] = [];
    let page = 1;
    let hasMorePages = true;

    // Fetch all pages
    while (hasMorePages) {
      const bicycles = await fetchBicyclesPage(filters, page);
      
      if (bicycles.length === 0) {
        hasMorePages = false;
      } else {
        allBicycles.push(...bicycles);
        page++;
        
        // Safety limit to prevent infinite loops
        if (page > 100) {
          console.warn('Reached maximum page limit (100)');
          hasMorePages = false;
        }
      }
    }

    console.log(`Fetched ${allBicycles.length} bicycles from ${page - 1} pages`);
    return allBicycles;
  } catch (error) {
    console.error('Error fetching bicycles:', error);
    // Return mock data for development/demo purposes
    return getMockBicycles(filters);
  }
}

// Fetch a single page of bicycles
async function fetchBicyclesPage(filters: SearchFilters, page: number): Promise<Bicycle[]> {
  try {
    // Build URL with query parameters
    const baseUrl = 'https://biciregistro.es/bicicletas/localizadas';
    const params = new URLSearchParams();
    
    if (filters.marca) params.append('marca', filters.marca);
    if (filters.modelo) params.append('modelo', filters.modelo);
    if (filters.color) params.append('color', filters.color);
    if (filters.numeroSerie) params.append('numero_serie', filters.numeroSerie);
    if (filters.numeroMatricula) params.append('numero_matricula', filters.numeroMatricula);
    if (filters.ciudad) params.append('ciudad', filters.ciudad);
    if (filters.provincia) params.append('provincia', filters.provincia);
    if (filters.searchTerm) params.append('q', filters.searchTerm);
    
    // Add page parameter
    if (page > 1) {
      params.append('page', page.toString());
    }

    const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse HTML to extract bicycle data
    const bicycles = parseBicycleData(html);
    
    return bicycles;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    return [];
  }
}

function parseBicycleData(html: string): Bicycle[] {
  const bicycles: Bicycle[] = [];
  
  try {
    const $ = cheerio.load(html);
    
    // Common patterns for bicycle listings on Spanish bike registry sites
    // Try multiple selectors to find bicycle cards
    const cardSelectors = [
      '.bicicleta-card',
      '.bicycle-card',
      '.bike-item',
      '.bicicleta-item',
      'article.bicicleta',
      '.card.bicicleta',
      '[data-bicicleta]',
      '[data-bicycle]',
      '.resultado-bicicleta',
      '.listado-bicicletas > div',
      '.grid > div[class*="col"]',
    ];
    
    let $cards = $();
    for (const selector of cardSelectors) {
      $cards = $(selector);
      if ($cards.length > 0) {
        console.log(`Found ${$cards.length} bicycles using selector: ${selector}`);
        break;
      }
    }
    
    // If no cards found with specific selectors, try to find any repeated structure
    if ($cards.length === 0) {
      // Look for table rows
      const $rows = $('table tbody tr, .table tbody tr');
      if ($rows.length > 0) {
        $cards = $rows;
        console.log(`Found ${$cards.length} bicycles in table rows`);
      }
    }
    
    $cards.each((index, element) => {
      const $card = $(element);
      
      try {
        // Extract data - try multiple patterns
        const marca = extractText($card, ['.marca', '[data-marca]', 'strong:contains("Marca")', '.brand']) || '';
        const modelo = extractText($card, ['.modelo', '[data-modelo]', '.model']) || '';
        const color = extractText($card, ['.color', '[data-color]']) || '';
        const numeroSerie = extractText($card, ['.numero-serie', '[data-numero-serie]', '.serial-number']) || undefined;
        const numeroMatricula = extractText($card, ['.numero-matricula', '[data-numero-matricula]', '.registration']) || undefined;
        const ciudad = extractText($card, ['.ciudad', '[data-ciudad]', '.city']) || undefined;
        const provincia = extractText($card, ['.provincia', '[data-provincia]', '.province']) || undefined;
        const descripcion = extractText($card, ['.descripcion', '[data-descripcion]', '.description', 'p']) || undefined;
        
        // Extract image URL
        const imagen = extractImage($card, ['img.imagen', 'img.foto', 'img', '[data-imagen]']) || undefined;
        
        // Extract dates
        const fechaRobo = extractText($card, ['.fecha-robo', '[data-fecha-robo]']) || undefined;
        const fechaLocalizacion = extractText($card, ['.fecha-localizacion', '[data-fecha-localizacion]']) || undefined;
        
        // Generate ID from available data
        const id = `bike-${index}-${Date.now()}`;
        
        // Only add if we have at least brand or model
        if (marca || modelo) {
          const bicycle: Bicycle = {
            id,
            marca,
            modelo,
            color,
            numeroSerie,
            numeroMatricula,
            ciudad,
            provincia,
            descripcion,
            imagen,
            imagenCompleta: imagen, // Use same image for full resolution
            estado: 'localizada',
            fechaRobo,
            fechaLocalizacion,
          };
          
          bicycles.push(bicycle);
        }
      } catch (err) {
        console.error(`Error parsing bicycle at index ${index}:`, err);
      }
    });
    
  } catch (error) {
    console.error('Error parsing HTML:', error);
  }
  
  return bicycles;
}

// Helper function to extract text from multiple possible selectors
function extractText($element: cheerio.Cheerio<AnyNode>, selectors: string[]): string {
  for (const selector of selectors) {
    const text = $element.find(selector).first().text().trim();
    if (text) return text;
  }
  
  return '';
}

// Helper function to extract image URL from multiple possible selectors
function extractImage($element: cheerio.Cheerio<AnyNode>, selectors: string[]): string {
  for (const selector of selectors) {
    const $img = $element.find(selector).first();
    const src = $img.attr('src') || $img.attr('data-src');
    if (src) {
      // Handle relative URLs
      if (src.startsWith('/')) {
        return `https://biciregistro.es${src}`;
      }
      return src;
    }
  }
  
  return '';
}

// Mock data for development purposes
function getMockBicycles(filters: SearchFilters): Bicycle[] {
  const allBicycles: Bicycle[] = [
    {
      id: '1',
      marca: 'Trek',
      modelo: 'FX 3',
      color: 'Azul',
      numeroSerie: 'TRK123456',
      numeroMatricula: 'MAD-001',
      fechaRobo: '2024-01-15',
      lugarRobo: 'Calle Mayor 45',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      descripcion: 'Bicicleta de paseo con cesta delantera y luces LED',
      imagen: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400',
      imagenCompleta: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200',
      estado: 'localizada',
      fechaLocalizacion: '2024-02-20',
      lugarLocalizacion: 'Parque del Retiro',
    },
    {
      id: '2',
      marca: 'Orbea',
      modelo: 'Orca M30',
      color: 'Rojo',
      numeroSerie: 'ORB789012',
      numeroMatricula: 'BCN-023',
      fechaRobo: '2024-02-10',
      lugarRobo: 'Paseo de Gracia',
      ciudad: 'Barcelona',
      provincia: 'Barcelona',
      descripcion: 'Bicicleta de carretera, componentes Shimano 105',
      imagen: 'https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=400',
      imagenCompleta: 'https://images.unsplash.com/photo-1571333250630-f0230c320b6d?w=1200',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-01',
      lugarLocalizacion: 'Estación de Sants',
    },
    {
      id: '3',
      marca: 'Specialized',
      modelo: 'Rockhopper',
      color: 'Negro',
      numeroSerie: 'SPZ345678',
      numeroMatricula: 'VAL-015',
      fechaRobo: '2024-01-25',
      lugarRobo: 'Ciudad de las Artes',
      ciudad: 'Valencia',
      provincia: 'Valencia',
      descripcion: 'Mountain bike con suspensión delantera',
      imagen: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400',
      imagenCompleta: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=1200',
      estado: 'localizada',
      fechaLocalizacion: '2024-02-15',
      lugarLocalizacion: 'Jardín del Turia',
    },
    {
      id: '4',
      marca: 'Giant',
      modelo: 'Escape 2',
      color: 'Verde',
      numeroSerie: 'GNT901234',
      numeroMatricula: 'SEV-008',
      fechaRobo: '2024-03-05',
      lugarRobo: 'Plaza de España',
      ciudad: 'Sevilla',
      provincia: 'Sevilla',
      descripcion: 'Bicicleta híbrida, perfecta para ciudad',
      imagen: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400',
      imagenCompleta: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=1200',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-20',
      lugarLocalizacion: 'Parque de María Luisa',
    },
    {
      id: '5',
      marca: 'BH',
      modelo: 'Atom City',
      color: 'Blanco',
      numeroSerie: 'BH567890',
      numeroMatricula: 'BIL-012',
      fechaRobo: '2024-02-28',
      lugarRobo: 'Gran Vía',
      ciudad: 'Bilbao',
      provincia: 'Vizcaya',
      descripcion: 'Bicicleta urbana con cambios internos Shimano',
      imagen: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=400',
      imagenCompleta: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=1200',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-15',
      lugarLocalizacion: 'Museo Guggenheim',
    },
    {
      id: '6',
      marca: 'Cannondale',
      modelo: 'Trail 5',
      color: 'Gris',
      numeroSerie: 'CAN234567',
      numeroMatricula: 'ZAR-019',
      fechaRobo: '2024-01-30',
      lugarRobo: 'Paseo Independencia',
      ciudad: 'Zaragoza',
      provincia: 'Zaragoza',
      descripcion: 'MTB con frenos de disco hidráulicos',
      imagen: 'https://images.unsplash.com/photo-1511994714008-b6fa2c655ea1?w=400',
      imagenCompleta: 'https://images.unsplash.com/photo-1511994714008-b6fa2c655ea1?w=1200',
      estado: 'localizada',
      fechaLocalizacion: '2024-02-25',
      lugarLocalizacion: 'Parque Grande',
    },
  ];

  // Apply filters
  let filtered = allBicycles;

  if (filters.marca) {
    filtered = filtered.filter(b => 
      b.marca.toLowerCase().includes(filters.marca!.toLowerCase())
    );
  }

  if (filters.modelo) {
    filtered = filtered.filter(b => 
      b.modelo.toLowerCase().includes(filters.modelo!.toLowerCase())
    );
  }

  if (filters.color) {
    filtered = filtered.filter(b => 
      b.color.toLowerCase().includes(filters.color!.toLowerCase())
    );
  }

  if (filters.numeroSerie) {
    filtered = filtered.filter(b => 
      b.numeroSerie?.toLowerCase().includes(filters.numeroSerie!.toLowerCase())
    );
  }

  if (filters.numeroMatricula) {
    filtered = filtered.filter(b => 
      b.numeroMatricula?.toLowerCase().includes(filters.numeroMatricula!.toLowerCase())
    );
  }

  if (filters.ciudad) {
    filtered = filtered.filter(b => 
      b.ciudad?.toLowerCase().includes(filters.ciudad!.toLowerCase())
    );
  }

  if (filters.provincia) {
    filtered = filtered.filter(b => 
      b.provincia?.toLowerCase().includes(filters.provincia!.toLowerCase())
    );
  }

  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(b => 
      b.marca.toLowerCase().includes(term) ||
      b.modelo.toLowerCase().includes(term) ||
      b.color.toLowerCase().includes(term) ||
      b.ciudad?.toLowerCase().includes(term) ||
      b.descripcion?.toLowerCase().includes(term)
    );
  }

  return filtered;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: SearchFilters = {
      marca: searchParams.get('marca') || undefined,
      modelo: searchParams.get('modelo') || undefined,
      color: searchParams.get('color') || undefined,
      numeroSerie: searchParams.get('numeroSerie') || undefined,
      numeroMatricula: searchParams.get('numeroMatricula') || undefined,
      ciudad: searchParams.get('ciudad') || undefined,
      provincia: searchParams.get('provincia') || undefined,
      searchTerm: searchParams.get('searchTerm') || undefined,
    };

    const bicycles = await fetchBicyclesFromBiciregistro(filters);

    return NextResponse.json({
      success: true,
      count: bicycles.length,
      data: bicycles,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bicycles' },
      { status: 500 }
    );
  }
}
