'use client';

import { useState, useEffect } from 'react';
import type { Bicycle, SearchFilters } from '@/types/bicycle';
import SearchForm from '@/components/SearchForm';
import BicycleCard from '@/components/BicycleCard';
import ImageModal from '@/components/ImageModal';

export default function Home() {
  const [bicycles, setBicycles] = useState<Bicycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const fetchBicycles = async (filters: SearchFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const url = params.toString() 
        ? `/api/bicycles?${params.toString()}`
        : '/api/bicycles';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setBicycles(data.data);
      } else {
        setError(data.error || 'Error al cargar las bicicletas');
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBicycles();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-6'}`}>
        <div className="container mx-auto px-4">
          <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 transition-all duration-300 ${isScrolled ? 'text-2xl' : 'text-4xl'}`}>
            🚲 BiciRegistro
          </h1>
          <p className={`text-gray-600 dark:text-gray-300 transition-all duration-300 ${isScrolled ? 'mt-1 text-sm' : 'mt-2'}`}>
            Búsqueda de bicicletas localizadas en España
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="mb-8">
          <SearchForm onSearch={fetchBicycles} loading={loading} />
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">{bicycles.length}</span> bicicletas encontradas
            </div>

            {bicycles.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400 text-xl">
                  No se encontraron bicicletas con estos criterios
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bicycles.map((bicycle) => (
                  <BicycleCard
                    key={bicycle.id}
                    bicycle={bicycle}
                    onImageClick={setSelectedImage}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400">
          <p>Datos de biciregistro.es • Bicicletas localizadas</p>
        </div>
      </footer>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}
