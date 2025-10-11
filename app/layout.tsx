import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiciRegistro - Búsqueda de Bicicletas Localizadas en España",
  description: "Busca bicicletas localizadas en España. Interfaz fácil de usar para consultar la base de datos de biciregistro.es con imágenes de alta resolución.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
