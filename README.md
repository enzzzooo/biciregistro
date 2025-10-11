# biciregistro

Easily search biciregistro for bicycles in Spain

## Features

- 🔍 **Advanced Search**: Search bicycles by multiple fields including brand, model, color, serial number, registration number, city, and province
- 🖼️ **High-Resolution Images**: View full-resolution images of each bicycle in a beautiful modal
- 🎨 **Beautiful UI**: Modern, responsive design built with Next.js 15 and Tailwind CSS
- 🌓 **Dark Mode**: Automatic dark mode support
- ⚡ **Fast**: Built with Next.js App Router and Turbopack for optimal performance

## Search Fields

You can search by any combination of the following fields:

- **General Search**: Search across all fields at once
- **Brand** (Marca): e.g., Trek, Orbea, Specialized
- **Model** (Modelo): e.g., FX 3, Orca M30
- **Color** (Color): e.g., Azul, Rojo, Negro
- **City** (Ciudad): e.g., Madrid, Barcelona, Valencia
- **Province** (Provincia): e.g., Madrid, Barcelona, Valencia
- **Serial Number** (Nº Serie): Exact serial number
- **Registration Number** (Nº Matrícula): Registration plate number

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/enzzzooo/biciregistro.git
cd biciregistro

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Build for Production

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## How to Use

1. **Quick Search**: Enter any term in the general search field to search across all bicycle attributes
2. **Advanced Search**: Click "Mostrar búsqueda avanzada" to access individual search fields for more precise filtering
3. **View Images**: Click on any bicycle image to view it in full resolution
4. **Filter Results**: Use any combination of search fields - the app will filter results based on all provided criteria

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Utility-first CSS framework
- **React 19**: Latest React features
- **Turbopack**: Ultra-fast bundler

## Data Source

This application interfaces with [biciregistro.es](https://biciregistro.es) to search for located bicycles (Bicicletas localizadas).

## Development

```bash
# Run development server with Turbopack
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

## License

MIT
