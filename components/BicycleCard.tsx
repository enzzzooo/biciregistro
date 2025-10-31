'use client';

import React from 'react';
import Image from 'next/image';
import type { Bicycle } from '@/types/bicycle';

interface BicycleCardProps {
  bicycle: Bicycle;
  onImageClick: (imageUrl: string) => void;
}

export default function BicycleCard({ bicycle, onImageClick }: BicycleCardProps) {
  const [imageError, setImageError] = React.useState(false);
  const imageUrl = imageError ? '/images/bicicletas/placeholder.svg' : (bicycle.imagen || '/images/bicicletas/placeholder.svg');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Image */}
      <div 
        className="relative h-64 bg-gray-200 dark:bg-gray-700 cursor-pointer overflow-hidden group"
        onClick={() => onImageClick(bicycle.imagenCompleta || bicycle.imagen || imageUrl)}
      >
        <Image
          src={imageUrl}
          alt={`${bicycle.marca} ${bicycle.modelo}`}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 text-lg font-semibold">
            🔍 Ver en alta resolución
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {bicycle.marca} {bicycle.modelo}
        </h3>

        {/* Status Badge */}
        <div className="mb-4">
          <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold px-3 py-1 rounded-full">
            ✓ Localizada
          </span>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Color:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{bicycle.color}</span>
          </div>

          {bicycle.numeroMatricula && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Matrícula:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{bicycle.numeroMatricula}</span>
            </div>
          )}

          {bicycle.numeroSerie && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Nº Serie:</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white">{bicycle.numeroSerie}</span>
            </div>
          )}

          {bicycle.ciudad && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Ciudad:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{bicycle.ciudad}</span>
            </div>
          )}

          {bicycle.provincia && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Provincia:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{bicycle.provincia}</span>
            </div>
          )}
        </div>

        {/* Theft Info */}
        {bicycle.fechaRobo && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Información del robo
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>📅 Fecha: {new Date(bicycle.fechaRobo).toLocaleDateString('es-ES')}</div>
              {bicycle.lugarRobo && <div>📍 Lugar: {bicycle.lugarRobo}</div>}
            </div>
          </div>
        )}

        {/* Found Info */}
        {bicycle.fechaLocalizacion && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
              Información de localización
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>📅 Fecha: {new Date(bicycle.fechaLocalizacion).toLocaleDateString('es-ES')}</div>
              {bicycle.lugarLocalizacion && <div>📍 Lugar: {bicycle.lugarLocalizacion}</div>}
            </div>
          </div>
        )}

        {/* Description */}
        {bicycle.descripcion && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {bicycle.descripcion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
