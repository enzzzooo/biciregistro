# BiciRegistro Scraping Documentation

## Overview
This application scrapes bicycle data from [biciregistro.es/bicicletas/localizadas](https://biciregistro.es/bicicletas/localizadas) and displays all found bicycles.

## How Pagination Works

The scraper automatically fetches **ALL pages** from biciregistro.es:

1. **Starts at page 1** and fetches bicycle data
2. **Continues to page 2, 3, 4...** automatically
3. **Stops when:**
   - No "next page" link is found in the HTML
   - 2 consecutive pages return 0 results
   - Maximum of 100 pages reached (safety limit)

## Current Status

### In Development/Sandbox Environment
- ❌ **biciregistro.es is NOT accessible** (network restrictions)
- ✅ Falls back to **12 mock bicycles** for development/demo
- ✅ Detailed logging shows scraping attempts and retries

### When Deployed to Production
- ✅ Will fetch **ALL bicycles across all pages** from biciregistro.es
- ✅ Automatic pagination - no manual configuration needed
- ✅ Robust error handling with 3 retry attempts per page
- ✅ 10-second timeout per request
- ✅ Exponential backoff on failures

## Features

### Retry Logic
- 3 attempts per page
- Exponential backoff: 1s, 2s, 4s between retries
- Detailed error logging for debugging

### Pagination Detection
Detects "next page" using multiple selectors:
- `a.next:not(.disabled)`
- `a[rel="next"]`
- `a:contains("Siguiente")`
- Bootstrap pagination patterns
- And more...

### HTML Parsing
Tries multiple selector patterns to find bicycle data:
- `.bicicleta-card`, `.bicycle-card`
- `article.bicicleta`
- Table rows
- And 10+ other patterns

### Data Extraction
Extracts all available fields:
- Marca (Brand)
- Modelo (Model)  
- Color
- Número de Serie
- Número de Matrícula
- Ciudad (City)
- Provincia (Province)
- Descripción
- Imagen (Image URL)
- Fecha de Robo
- Fecha de Localización

## Logs to Monitor

When deployed, check logs for:

```
Starting to fetch bicycles from biciregistro.es...
Fetching page 1...
Page 1: Added 20 bicycles (total: 20)
Fetching page 2...
Page 2: Added 20 bicycles (total: 40)
Fetching page 3...
Page 3: Added 15 bicycles (total: 55)
No more pages indicated by pagination
Successfully fetched 55 bicycles from 3 pages
```

## Testing Locally

To test the scraper when biciregistro.es is accessible:

```bash
npm run dev
# Visit http://localhost:3000
# Check server logs for scraping details
```

## Fallback Behavior

If scraping fails:
1. Logs the error with details
2. Falls back to mock data (12 bikes)
3. Continues to work for development/testing
