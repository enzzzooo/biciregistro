'use client';

import { useState } from 'react';
import type { SearchFilters } from '@/types/bicycle';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    setFilters({});
    onSearch({});
  };

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="space-y-4">
        {/* General Search */}
        <div>
          <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Búsqueda general
          </label>
          <input
            type="text"
            id="searchTerm"
            value={filters.searchTerm || ''}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            placeholder="Buscar por marca, modelo, color, ciudad..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Toggle Advanced Search */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
        >
          {showAdvanced ? '▼ Ocultar búsqueda avanzada' : '▶ Mostrar búsqueda avanzada'}
        </button>

        {/* Advanced Search Fields */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label htmlFor="marca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Marca
              </label>
              <input
                type="text"
                id="marca"
                value={filters.marca || ''}
                onChange={(e) => updateFilter('marca', e.target.value)}
                placeholder="Ej: Trek, Orbea"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="modelo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Modelo
              </label>
              <input
                type="text"
                id="modelo"
                value={filters.modelo || ''}
                onChange={(e) => updateFilter('modelo', e.target.value)}
                placeholder="Ej: FX 3, Orca"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <input
                type="text"
                id="color"
                value={filters.color || ''}
                onChange={(e) => updateFilter('color', e.target.value)}
                placeholder="Ej: Azul, Rojo"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                id="ciudad"
                value={filters.ciudad || ''}
                onChange={(e) => updateFilter('ciudad', e.target.value)}
                placeholder="Ej: Madrid, Barcelona"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provincia
              </label>
              <input
                type="text"
                id="provincia"
                value={filters.provincia || ''}
                onChange={(e) => updateFilter('provincia', e.target.value)}
                placeholder="Ej: Madrid, Barcelona"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="numeroSerie" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nº Serie
              </label>
              <input
                type="text"
                id="numeroSerie"
                value={filters.numeroSerie || ''}
                onChange={(e) => updateFilter('numeroSerie', e.target.value)}
                placeholder="Número de serie"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="numeroMatricula" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nº Matrícula
              </label>
              <input
                type="text"
                id="numeroMatricula"
                value={filters.numeroMatricula || ''}
                onChange={(e) => updateFilter('numeroMatricula', e.target.value)}
                placeholder="Número de matrícula"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Buscando...
              </span>
            ) : (
              '🔍 Buscar'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar
          </button>
        </div>
      </div>
    </form>
  );
}
