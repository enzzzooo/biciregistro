'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  useEffect(() => {
    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 transition-colors z-10"
        aria-label="Cerrar"
      >
        ×
      </button>

      <div 
        className="relative max-w-7xl max-h-[90vh] w-full h-full"
      >
        <Image
          src={imageUrl}
          alt="Bicicleta en alta resolución"
          fill
          className="object-contain"
          sizes="100vw"
          quality={100}
        />
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
        Haz clic fuera de la imagen o presiona ESC para cerrar
      </div>
    </div>
  );
}
