export interface Bicycle {
  id: string;
  marca: string; // Brand
  modelo: string; // Model
  color: string; // Color
  numeroSerie?: string; // Serial number
  numeroMatricula?: string; // Registration number
  fechaRobo?: string; // Theft date
  lugarRobo?: string; // Theft location
  ciudad?: string; // City
  provincia?: string; // Province
  descripcion?: string; // Description
  imagen?: string; // Image URL
  imagenCompleta?: string; // Full resolution image URL
  estado?: string; // Status (localizada, robada, etc.)
  fechaLocalizacion?: string; // Found date
  lugarLocalizacion?: string; // Found location
}

export interface SearchFilters {
  marca?: string;
  modelo?: string;
  color?: string;
  numeroSerie?: string;
  numeroMatricula?: string;
  ciudad?: string;
  provincia?: string;
  searchTerm?: string; // General search term
}
