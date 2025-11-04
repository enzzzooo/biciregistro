# BiciRegistro Data Fetching Documentation

## Overview
This application fetches bicycle data from [biciregistro.es](https://www.biciregistro.es/#/bicicletas/foundsearch) and displays all found bicycles.

**Important:** BiciRegistro.es is a Single Page Application (SPA) that uses JavaScript to load data. The found bicycles page is at `https://www.biciregistro.es/#/bicicletas/foundsearch`.

## API Discovery Results

### Found REST API Endpoints

**Base URL:** `https://www.biciregistro.es/biciregistro/rest`

#### Working Public Endpoints
- ✅ `/v1/config/getColors` - GET - Returns list of available bicycle colors
- ✅ `/v1/config/getMarcas` - GET - Returns list of available bicycle brands

#### Discovered but Protected Endpoints
These endpoints exist but appear to require authentication or session tokens:
- 🔒 `/v1/bicicletas/pagedLocalizadas` - POST - Returns paginated found bicycles (404/401)
- 🔒 `/v1/bicicletas/pagedDesaparecidas` - POST - Returns paginated disappeared bicycles (404/401)
- 🔒 `/v1/bicicletas/getXLS` - POST - Export bicycles to XLS format (405)

### Implementation Strategy

Since the paginated bicycle endpoints require authentication, the implementation uses multiple fallback strategies:

1. **Strategy 1: REST API Attempts** - Tries various API endpoint patterns with different parameter structures
2. **Strategy 2: HTML Scraping** - Falls back to scraping the public HTML pages
3. **Strategy 3: Empty Results** - Returns empty array if all methods fail (no mock data)

### Current Implementation Features

### Current Implementation Features

- ✅ **Multi-Strategy Fetching**: Attempts REST API first, falls back to HTML scraping
- ✅ **Pagination Support**: Automatically fetches all pages of results
- ✅ **Multiple API Endpoint Patterns**: Tries various endpoint URL patterns
- ✅ **Flexible Response Parsing**: Handles different API response formats (Spring Data Page, custom formats)
- ✅ **Robust Error Handling**: 3 retry attempts per request with exponential backoff
- ✅ **Request Timeouts**: 10-15 second timeouts to prevent hanging
- ✅ **Detailed Logging**: Console logs show which strategy succeeded/failed

## How Pagination Works

The scraper automatically fetches **ALL pages** from biciregistro.es:

1. **Starts at page 1** and fetches bicycle data
2. **Continues to page 2, 3, 4...** automatically
3. **Stops when:**
   - No "next page" link is found in the HTML
   - 2 consecutive pages return 0 results
   - Maximum of 100 pages reached (safety limit)

## Current Status

### Implementation Complete
- ✅ **REST API Integration**: Implemented with endpoint discovery from JavaScript analysis
- ✅ **Multiple Endpoints**: Tries /v1/bicicletas/pagedLocalizadas and alternative patterns
- ✅ **HTML Scraping Fallback**: Comprehensive HTML parsing with multiple selector patterns
- ✅ **Response Format Handling**: Supports Spring Data Page format and custom structures
- ⚠️ **Authentication Required**: Main bicycle endpoints appear to require authentication/session
- ✅ **Graceful Degradation**: Returns empty array when all strategies fail (no mock data)

### Known Limitations
- 🔒 **Protected Endpoints**: The pagedLocalizadas endpoint returns 404, likely requires authentication
- ⚠️ **SPA Challenge**: The site loads data via JavaScript, making scraping difficult
- ⚠️ **Network Restrictions**: May be blocked in some sandboxed environments

### In Development/Sandbox Environment
- ❌ **biciregistro.es is NOT accessible** (network restrictions)
- ✅ Returns **empty array** (no mock/placeholder data)
- ✅ UI displays "No se encontraron bicicletas" message
- ✅ Detailed logging shows scraping attempts and retries

### When Deployed to Production (Vercel)
- ✅ **Multi-Strategy Approach**: Tries REST API then HTML scraping
- ✅ **Endpoint Discovery**: Found actual API endpoints through JavaScript analysis
- ⚠️ **May Require Auth**: Some endpoints may need authentication tokens
- ✅ **Robust Error Handling**: 3 retry attempts per request with exponential backoff
- ✅ **Timeout Protection**: 10-15 second timeout per request
- ✅ **Exponential Backoff**: On failures (1s, 2s, 4s between retries)
- ✅ **Caching**: Response caching to reduce server load (handled by Next.js)

## API Endpoint Details

### Discovered from JavaScript Bundle Analysis

The application's JavaScript (`main.bundle.js`) revealed these endpoints:

```javascript
// Service method from biciregistro.es
BicicletasService.prototype.getBikesLocated = function (data) {
    var _url = environment.url_rest + '/v1/bicicletas/pagedLocalizadas';
    return this.brHttp.brPostJson(_url, data, false);
};
```

**Request Format:**
- Method: POST
- URL: `https://www.biciregistro.es/biciregistro/rest/v1/bicicletas/pagedLocalizadas`
- Headers: `Content-Type: application/json`
- Body: JSON object with pagination and filter parameters

**Expected Response Format:**
- Spring Data Page format with `content`, `totalPages`, `number`, `last` fields
- OR custom format with array of bicycle objects

### Attempted Parameter Structures
The implementation tries multiple parameter combinations:
- `{"pageNumber": 0, "pageSize": 100}`
- `{"page": 0, "size": 100}`
- With search filters: `{"pageNumber": 0, "pageSize": 100, "marca": "Trek", ...}`

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

## Fallback Behavior

If all data fetching strategies fail:
1. Logs the error with details
2. Returns **empty array** (no mock/placeholder data)
3. UI shows "No se encontraron bicicletas con estos criterios" message

**Note:** Mock data was removed as per requirements. The app now only shows real data from biciregistro.es or displays "no data found".

## Next Steps for Production

If the API endpoints continue to return 404/401:

1. **Check Authentication**: The endpoints may require session cookies or JWT tokens
2. **Monitor Browser Network Tab**: Use browser dev tools on the actual site to see:
   - What headers are sent (Authorization, cookies, etc.)
   - What the actual request/response looks like
3. **Alternative Approaches**:
   - Use a headless browser (Puppeteer/Playwright) to render the SPA
   - Contact biciregistro.es for API documentation
   - Implement periodic scraping with a background job

## Logs to Monitor

When deployed, check logs for:

```
Starting to fetch bicycles from biciregistro.es REST API...
Trying API endpoint: /v1/bicicletas/pagedLocalizadas
API response from /v1/bicicletas/pagedLocalizadas: {...}
✓ Successfully fetched 55 bicycles from REST API
```

Or if API fails:

```
Starting to fetch bicycles from biciregistro.es REST API...
Trying API endpoint: /v1/bicicletas/pagedLocalizadas
Endpoint /v1/bicicletas/pagedLocalizadas returned 404
REST API failed, trying fallback strategies...
Starting HTML scraping fallback...
Scraping page 1...
Page 1: Added 20 bicycles (total: 20)
...
```

## Testing Locally

To test when biciregistro.es is accessible:

```bash
npm run dev
# Visit http://localhost:3000
# Check browser console and server logs for:
# - Which strategy succeeded (REST API or HTML scraping)
# - Any errors or authentication issues
# - Number of bicycles fetched
```

## Configuration Options

The implementation can be tuned by modifying `/app/api/bicycles/route.ts`:

- **Max pages**: Currently set to 100 pages maximum
- **Page size**: Currently requesting 100 items per page from API
- **Timeout**: 10-15 seconds per request
- **Retry attempts**: 3 attempts per request
- **Endpoints to try**: List of API endpoint variations to attempt
