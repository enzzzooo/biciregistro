# BiciRegistro Data Fetching Documentation

## Overview
This application fetches bicycle data from [biciregistro.es](https://www.biciregistro.es/#/bicicletas/foundsearch) and displays all found bicycles.

**Important:** BiciRegistro.es is a Single Page Application (SPA) that uses JavaScript to load data. The found bicycles page is at `https://www.biciregistro.es/#/bicicletas/foundsearch`.

## How Pagination Works

The scraper automatically fetches **ALL pages** from biciregistro.es:

1. **Starts at page 1** and fetches bicycle data
2. **Continues to page 2, 3, 4...** automatically
3. **Stops when:**
   - No "next page" link is found in the HTML
   - 2 consecutive pages return 0 results
   - Maximum of 100 pages reached (safety limit)

## Current Status

### Known Issue
- ⚠️ **BiciRegistro.es is a SPA (Single Page Application)** - The data is loaded via JavaScript/API calls
- ⚠️ **Correct URL:** `https://www.biciregistro.es/#/bicicletas/foundsearch` (hash-based routing)
- ❌ **Current implementation** attempts to scrape HTML but needs to be updated to call the backend API directly
- ✅ **In sandbox/development**: Returns empty array when fetching fails (no mock data)
- ✅ **Shows "No data found"** message when no bicycles are available

### In Development/Sandbox Environment
- ❌ **biciregistro.es is NOT accessible** (network restrictions)
- ✅ Returns **empty array** (no mock/placeholder data)
- ✅ UI displays "No se encontraron bicicletas" message
- ✅ Detailed logging shows scraping attempts and retries

### When Deployed to Production (Vercel)
- ⚠️ **Action Required**: Find the actual backend API endpoint used by the SPA
- The frontend likely calls an API like `/api/bicicletas/found` or similar
- Once the correct endpoint is identified, update the code to call it directly
- ✅ Robust error handling with 3 retry attempts per request
- ✅ 15-second timeout per request
- ✅ Exponential backoff on failures
- ✅ 5-minute caching to reduce server load

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

## Finding the Correct API Endpoint

Since biciregistro.es is a SPA, you need to find the backend API it calls:

1. **Open the website** in a browser: `https://www.biciregistro.es/#/bicicletas/foundsearch`
2. **Open Developer Tools** (F12)
3. **Go to Network tab**
4. **Filter by XHR/Fetch**
5. **Perform a search** or load the found bicycles page
6. **Look for API calls** - likely endpoints like:
   - `/api/bicicletas/found`
   - `/rest/bicicletas/found`
   - `/backend/bicicletas/search`
   - Or similar patterns
7. **Check the response** - it should return JSON with bicycle data
8. **Update the code** in `/app/api/bicycles/route.ts` with the correct endpoint

### Current Implementation
The code currently tries to scrape from `https://biciregistro.es/bicicletas/localizadas` but this is not the correct approach for a SPA. It needs to be updated to call the actual backend API once identified.

## Fallback Behavior

If data fetching fails:
1. Logs the error with details
2. Returns **empty array** (no mock/placeholder data)
3. UI shows "No se encontraron bicicletas con estos criterios" message

**Note:** Mock data fallback was removed as per requirements. The app now only shows real data from biciregistro.es or displays "no data found".
