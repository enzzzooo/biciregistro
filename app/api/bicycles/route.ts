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
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmpty = 2; // Stop after 2 consecutive empty pages

    console.log('Starting to fetch bicycles from biciregistro.es...');

    // Fetch all pages until we hit an empty page or reach the limit
    while (hasMorePages && page <= 100) {
      console.log(`Fetching page ${page}...`);
      const result = await fetchBicyclesPage(filters, page);
      
      if (result.bicycles.length === 0) {
        consecutiveEmptyPages++;
        console.log(`Page ${page} returned 0 bicycles (consecutive empty: ${consecutiveEmptyPages})`);
        
        // If we've seen multiple consecutive empty pages, stop
        if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
          console.log('Stopping due to consecutive empty pages');
          hasMorePages = false;
        }
      } else {
        consecutiveEmptyPages = 0; // Reset counter
        allBicycles.push(...result.bicycles);
        console.log(`Page ${page}: Added ${result.bicycles.length} bicycles (total: ${allBicycles.length})`);
        
        // Check if there's a next page indicator
        if (result.hasNextPage === false) {
          console.log('No more pages indicated by pagination');
          hasMorePages = false;
        }
      }
      
      page++;
    }

    if (page > 100) {
      console.warn('Reached maximum page limit (100)');
    }

    console.log(`Successfully fetched ${allBicycles.length} bicycles from ${page - 1} pages`);
    
    // If we got no results at all, throw error to trigger mock data
    if (allBicycles.length === 0) {
      throw new Error('No bicycles found on biciregistro.es');
    }
    
    return allBicycles;
  } catch (error) {
    console.error('Error fetching bicycles from biciregistro.es:', error);
    console.log('Falling back to mock data');
    // Return mock data for development/demo purposes
    return getMockBicycles(filters);
  }
}

// Fetch a single page of bicycles
async function fetchBicyclesPage(
  filters: SearchFilters, 
  page: number
): Promise<{ bicycles: Bicycle[]; hasNextPage: boolean | null }> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      
      console.log(`Attempt ${attempt}/${maxRetries} to fetch: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Parse HTML to extract bicycle data and pagination info
      const result = parseBicycleData(html);
      
      console.log(`Page ${page}: Found ${result.bicycles.length} bicycles, hasNextPage: ${result.hasNextPage}`);
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxRetries} failed for page ${page}:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error(`All ${maxRetries} attempts failed for page ${page}:`, lastError);
  return { bicycles: [], hasNextPage: null };
}

function parseBicycleData(html: string): { bicycles: Bicycle[]; hasNextPage: boolean | null } {
  const bicycles: Bicycle[] = [];
  let hasNextPage: boolean | null = null;
  
  try {
    const $ = cheerio.load(html);
    
    // Detect pagination - look for "next" links or page indicators
    const paginationSelectors = [
      'a.next:not(.disabled)',
      'a[rel="next"]',
      'a:contains("Siguiente"):not(.disabled)',
      'a:contains("›"):not(.disabled)',
      'li.next:not(.disabled) a',
      '.pagination .next:not(.disabled) a',
      'nav[aria-label*="pagination" i] a:contains("›")',
    ];
    
    for (const selector of paginationSelectors) {
      const $next = $(selector);
      if ($next.length > 0) {
        hasNextPage = true;
        console.log(`Found next page indicator with selector: ${selector}`);
        break;
      }
    }
    
    // If no next page found, check if we're on the last page
    if (hasNextPage === null) {
      const lastPageSelectors = [
        'a.next.disabled',
        'li.next.disabled',
        '.pagination .disabled:contains("Siguiente")',
        '.pagination .disabled:contains("›")',
      ];
      
      for (const selector of lastPageSelectors) {
        const $disabled = $(selector);
        if ($disabled.length > 0) {
          hasNextPage = false;
          console.log(`Detected last page with selector: ${selector}`);
          break;
        }
      }
    }
    
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
      '.resultado',
      '.listado-bicicletas > div',
      '.grid > div[class*="col"]',
      '.bicycles-list > div',
      '.bike-list > div',
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
        const marca = extractText($card, ['.marca', '[data-marca]', 'strong:contains("Marca")', '.brand', 'dt:contains("Marca") + dd']) || '';
        const modelo = extractText($card, ['.modelo', '[data-modelo]', '.model', 'dt:contains("Modelo") + dd']) || '';
        const color = extractText($card, ['.color', '[data-color]', 'dt:contains("Color") + dd']) || '';
        const numeroSerie = extractText($card, ['.numero-serie', '[data-numero-serie]', '.serial-number', 'dt:contains("Serie") + dd']) || undefined;
        const numeroMatricula = extractText($card, ['.numero-matricula', '[data-numero-matricula]', '.registration', 'dt:contains("Matrícula") + dd']) || undefined;
        const ciudad = extractText($card, ['.ciudad', '[data-ciudad]', '.city', 'dt:contains("Ciudad") + dd']) || undefined;
        const provincia = extractText($card, ['.provincia', '[data-provincia]', '.province', 'dt:contains("Provincia") + dd']) || undefined;
        const descripcion = extractText($card, ['.descripcion', '[data-descripcion]', '.description', 'p', 'dt:contains("Descripción") + dd']) || undefined;
        
        // Extract image URL
        const imagen = extractImage($card, ['img.imagen', 'img.foto', 'img.bicicleta', 'img', '[data-imagen]']) || undefined;
        
        // Extract dates
        const fechaRobo = extractText($card, ['.fecha-robo', '[data-fecha-robo]', 'dt:contains("Robo") + dd', 'dt:contains("Fecha de robo") + dd']) || undefined;
        const fechaLocalizacion = extractText($card, ['.fecha-localizacion', '[data-fecha-localizacion]', 'dt:contains("Localización") + dd', 'dt:contains("Fecha de localización") + dd']) || undefined;
        
        // Generate unique ID
        const id = `bike-${Date.now()}-${index}`;
        
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
            imagen: imagen || '/images/bicicletas/placeholder.svg',
            imagenCompleta: imagen || '/images/bicicletas/placeholder.svg',
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
    
    console.log(`Parsed ${bicycles.length} bicycles from HTML`);
    
  } catch (error) {
    console.error('Error parsing HTML:', error);
  }
  
  return { bicycles, hasNextPage };
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
// Note: Uses local placeholder images as fallback when biciregistro.es is not accessible
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
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
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
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
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
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
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
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
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
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
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
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-02-25',
      lugarLocalizacion: 'Parque Grande',
    },
    {
      id: '7',
      marca: 'Scott',
      modelo: 'Sub Cross 20',
      color: 'Naranja',
      numeroSerie: 'SCT445566',
      numeroMatricula: 'MAL-034',
      fechaRobo: '2024-02-18',
      lugarRobo: 'Muelle Uno',
      ciudad: 'Málaga',
      provincia: 'Málaga',
      descripcion: 'Bicicleta híbrida con portaequipajes',
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-10',
      lugarLocalizacion: 'Playa de la Malagueta',
    },
    {
      id: '8',
      marca: 'Merida',
      modelo: 'Big Nine 100',
      color: 'Verde y Negro',
      numeroSerie: 'MRD778899',
      numeroMatricula: 'ALI-021',
      fechaRobo: '2024-01-22',
      lugarRobo: 'Explanada de España',
      ciudad: 'Alicante',
      provincia: 'Alicante',
      descripcion: 'MTB 29 pulgadas, cuadro de aluminio',
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-02-28',
      lugarLocalizacion: 'Castillo de Santa Bárbara',
    },
    {
      id: '9',
      marca: 'Cube',
      modelo: 'Touring Hybrid',
      color: 'Azul y Plata',
      numeroSerie: 'CUB990011',
      numeroMatricula: 'VLL-017',
      fechaRobo: '2024-03-01',
      lugarRobo: 'Campo Grande',
      ciudad: 'Valladolid',
      provincia: 'Valladolid',
      descripcion: 'Bicicleta eléctrica de trekking, batería 500Wh',
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-22',
      lugarLocalizacion: 'Plaza Mayor',
    },
    {
      id: '10',
      marca: 'Radon',
      modelo: 'Sunset 8.0',
      color: 'Negro y Rojo',
      numeroSerie: 'RDN112233',
      numeroMatricula: 'COR-029',
      fechaRobo: '2024-02-05',
      lugarRobo: 'Mezquita-Catedral',
      ciudad: 'Córdoba',
      provincia: 'Córdoba',
      descripcion: 'Bicicleta de carretera, grupo Shimano Tiagra',
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-05',
      lugarLocalizacion: 'Puente Romano',
    },
    {
      id: '11',
      marca: 'Kona',
      modelo: 'Dew Plus',
      color: 'Turquesa',
      numeroSerie: 'KON334455',
      numeroMatricula: 'GRA-041',
      fechaRobo: '2024-01-28',
      lugarRobo: 'Carrera del Darro',
      ciudad: 'Granada',
      provincia: 'Granada',
      descripcion: 'Bicicleta urbana con guardabarros y luces integradas',
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-02-18',
      lugarLocalizacion: 'Paseo de los Tristes',
    },
    {
      id: '12',
      marca: 'Lapierre',
      modelo: 'Sensium 300',
      color: 'Blanco y Azul',
      numeroSerie: 'LAP556677',
      numeroMatricula: 'MUR-013',
      fechaRobo: '2024-02-12',
      lugarRobo: 'Gran Vía Escultor Salzillo',
      ciudad: 'Murcia',
      provincia: 'Murcia',
      descripcion: 'Bicicleta de carretera endurance, carbono',
      imagen: '/images/bicicletas/placeholder.svg',
      imagenCompleta: '/images/bicicletas/placeholder.svg',
      estado: 'localizada',
      fechaLocalizacion: '2024-03-08',
      lugarLocalizacion: 'Jardín del Malecón',
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

    // Fetch bicycles from biciregistro.es
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
