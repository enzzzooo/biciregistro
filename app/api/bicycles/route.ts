import { NextRequest, NextResponse } from 'next/server';
import type { Bicycle, SearchFilters } from '@/types/bicycle';

// This function scrapes biciregistro.es for bicycle data
async function fetchBicyclesFromBiciregistro(filters: SearchFilters): Promise<Bicycle[]> {
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
    console.error('Error fetching bicycles:', error);
    // Return mock data for development/demo purposes
    return getMockBicycles(filters);
  }
}

function parseBicycleData(_html: string): Bicycle[] {
  const bicycles: Bicycle[] = [];
  
  // This is a simplified parser - in a real implementation, you'd use a proper HTML parser
  // like cheerio or jsdom to extract data from the actual website structure
  
  // For now, this is a placeholder that would need to be implemented based on
  // the actual HTML structure of biciregistro.es
  
  return bicycles;
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
