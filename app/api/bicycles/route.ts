import { NextRequest, NextResponse } from 'next/server';
import type { Bicycle, SearchFilters } from '@/types/bicycle';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

// This function fetches bicycle data from biciregistro.es REST API with multiple fallback strategies
async function fetchBicyclesFromBiciregistro(filters: SearchFilters): Promise<Bicycle[]> {
  try {
    const allBicycles: Bicycle[] = [];
    
    console.log('Starting to fetch bicycles from biciregistro.es REST API...');

    // Strategy 1: Try the REST API endpoint (discovered from JavaScript analysis)
    try {
      const apiResult = await fetchFromRestAPI(filters);
      if (apiResult.length > 0) {
        console.log(`✓ Successfully fetched ${apiResult.length} bicycles from REST API`);
        return apiResult;
      }
      console.log('REST API returned no results, trying fallback strategies...');
    } catch (apiError) {
      console.log('REST API failed, trying fallback strategies...', (apiError as Error).message);
    }

    // Strategy 2: Try HTML scraping as fallback
    try {
      const scrapedResult = await fetchBicyclesViaScraping(filters);
      if (scrapedResult.length > 0) {
        console.log(`✓ Successfully scraped ${scrapedResult.length} bicycles from HTML`);
        return scrapedResult;
      }
      console.log('HTML scraping returned no results');
    } catch (scrapeError) {
      console.log('HTML scraping failed:', (scrapeError as Error).message);
    }

    console.log('All fetching strategies exhausted - returning empty array');
    return [];
  } catch (error) {
    const err = error as Error;
    console.error('Error fetching bicycles from biciregistro.es:', {
      message: err.message,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 3).join('\n'),
    });
    console.log('No data available - returning empty array');
    return [];
  }
}

// Strategy 1: Fetch from REST API
async function fetchFromRestAPI(filters: SearchFilters): Promise<Bicycle[]> {
  const allBicycles: Bicycle[] = [];
  const baseURL = 'https://www.biciregistro.es/biciregistro/rest';
  
  // Try multiple API endpoint variations
  const endpoints = [
    '/v1/bicicletas/pagedLocalizadas',
    '/v1/bicicletas/getLocalizadas',
    '/v1/bicicletas/localizadas',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying API endpoint: ${endpoint}`);
      
      // Try POST request with pagination parameters
      for (let page = 0; page < 10; page++) {
        const requestBody = {
          pageNumber: page,
          pageSize: 100,
          // Include search filters
          ...(filters.marca && { marca: filters.marca }),
          ...(filters.modelo && { modelo: filters.modelo }),
          ...(filters.color && { color: filters.color }),
          ...(filters.ciudad && { ciudad: filters.ciudad }),
          ...(filters.provincia && { provincia: filters.provincia }),
          ...(filters.numeroSerie && { numeroSerie: filters.numeroSerie }),
          ...(filters.numeroMatricula && { numeroMatricula: filters.numeroMatricula }),
        };

        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`API response from ${endpoint}:`, JSON.stringify(data).substring(0, 200));
          
          // Parse the response based on its structure
          const bicycles = parseAPIResponse(data);
          if (bicycles.length > 0) {
            allBicycles.push(...bicycles);
            console.log(`Fetched ${bicycles.length} bicycles from ${endpoint} page ${page}`);
            
            // Check if there are more pages
            const hasMore = checkHasMorePages(data);
            if (!hasMore) break;
          } else {
            // No more results
            break;
          }
        } else if (response.status === 404 || response.status === 405) {
          // Endpoint doesn't exist or wrong method, try next endpoint
          console.log(`Endpoint ${endpoint} returned ${response.status}`);
          break;
        }
      }
      
      if (allBicycles.length > 0) {
        return allBicycles;
      }
    } catch (error) {
      console.log(`Endpoint ${endpoint} failed:`, (error as Error).message);
      continue;
    }
  }

  return allBicycles;
}

// Parse different API response formats
function parseAPIResponse(data: any): Bicycle[] {
  const bicycles: Bicycle[] = [];
  
  try {
    let items: any[] = [];
    
    // Handle different response structures
    if (Array.isArray(data)) {
      items = data;
    } else if (data.content && Array.isArray(data.content)) {
      // Spring Data Page format
      items = data.content;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.bicicletas && Array.isArray(data.bicicletas)) {
      items = data.bicicletas;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    }

    for (const item of items) {
      const bicycle: Bicycle = {
        id: item.id || item.idBicicleta || `bike-${Date.now()}-${Math.random()}`,
        marca: item.marca || item.brand || '',
        modelo: item.modelo || item.model || '',
        color: item.color || '',
        numeroSerie: item.numeroSerie || item.serialNumber || item.numSerie,
        numeroMatricula: item.numeroMatricula || item.registrationNumber || item.numMatricula,
        ciudad: item.ciudad || item.city,
        provincia: item.provincia || item.province,
        descripcion: item.descripcion || item.description,
        imagen: item.imagen || item.image || item.foto || '/images/bicicletas/placeholder.svg',
        imagenCompleta: item.imagenCompleta || item.imagen || item.image || '/images/bicicletas/placeholder.svg',
        estado: 'localizada',
        fechaRobo: item.fechaRobo || item.stolenDate,
        fechaLocalizacion: item.fechaLocalizacion || item.foundDate,
        lugarRobo: item.lugarRobo,
        lugarLocalizacion: item.lugarLocalizacion,
      };
      
      // Fix relative image URLs
      if (bicycle.imagen && bicycle.imagen.startsWith('/')) {
        bicycle.imagen = `https://www.biciregistro.es${bicycle.imagen}`;
      }
      if (bicycle.imagenCompleta && bicycle.imagenCompleta.startsWith('/')) {
        bicycle.imagenCompleta = `https://www.biciregistro.es${bicycle.imagenCompleta}`;
      }
      
      bicycles.push(bicycle);
    }
  } catch (error) {
    console.error('Error parsing API response:', error);
  }
  
  return bicycles;
}

// Check if there are more pages in the response
function checkHasMorePages(data: any): boolean {
  // Spring Data Page format
  if (data.last === false || data.hasNext === true) {
    return true;
  }
  if (data.totalPages && data.number < data.totalPages - 1) {
    return true;
  }
  // Custom pagination format
  if (data.hasMore === true) {
    return true;
  }
  return false;
}

// Strategy 2: Scrape from HTML pages
async function fetchBicyclesViaScraping(filters: SearchFilters): Promise<Bicycle[]> {
  const allBicycles: Bicycle[] = [];
  let page = 1;
  let hasMorePages = true;
  let consecutiveEmptyPages = 0;
  const maxConsecutiveEmpty = 2;

  console.log('Starting HTML scraping fallback...');

  while (hasMorePages && page <= 100) {
    console.log(`Scraping page ${page}...`);
    const result = await fetchBicyclesPage(filters, page);
    
    if (result.bicycles.length === 0) {
      consecutiveEmptyPages++;
      console.log(`Page ${page} returned 0 bicycles (consecutive empty: ${consecutiveEmptyPages})`);
      
      if (consecutiveEmptyPages >= maxConsecutiveEmpty) {
        console.log('Stopping due to consecutive empty pages');
        hasMorePages = false;
      }
    } else {
      consecutiveEmptyPages = 0;
      allBicycles.push(...result.bicycles);
      console.log(`Page ${page}: Added ${result.bicycles.length} bicycles (total: ${allBicycles.length})`);
      
      if (result.hasNextPage === false) {
        console.log('No more pages indicated by pagination');
        hasMorePages = false;
      }
    }
    
    page++;
  }

  return allBicycles;
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        cache: 'default', // Use browser cache
        signal: AbortSignal.timeout(15000), // 15 second timeout for better reliability
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
      const errorDetails = {
        attempt,
        page,
        message: lastError.message,
        name: lastError.name,
        cause: (lastError as any).cause?.message || 'unknown',
      };
      console.error(`Attempt ${attempt}/${maxRetries} failed for page ${page}:`, errorDetails);
      
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
