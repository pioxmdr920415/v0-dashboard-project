# Build Optimization Guide

## Performance Optimizations Applied

### Frontend Optimizations

#### 1. Code Splitting
The webpack configuration automatically splits code into optimized chunks:
- `react-vendor.js` - React, React-DOM, React Router
- `ui-vendor.js` - Radix UI components  
- `maps-vendor.js` - Leaflet and React-Leaflet
- `vendor.lucide-react.js` - Icon library
- `main.js` - Application code
- `runtime.js` - Webpack runtime

**Benefit**: Parallel loading and better browser caching of unchanged dependencies

#### 2. Gzip Compression
All JS, CSS, and HTML files are gzip-compressed:
```
original: main.js (500 KB) → gzipped: main.js.gz (150 KB)
compression ratio: 70% reduction
```

#### 3. Tree Shaking
Unused code is automatically removed during build:
- Unused imports from libraries eliminated
- Dead code in your application removed
- CSS classes not used in HTML removed

#### 4. Minification
All code is minified in production:
- Variable names shortened
- Comments removed
- Whitespace removed
- Syntax optimized

#### 5. Source Maps
Production includes source maps for debugging:
- Error stack traces map to original source code
- No performance impact (loaded only when needed)
- Can be deployed separately from main bundles

### Backend Optimizations

#### 1. Gunicorn Configuration
Optimized for typical server specs:
```python
workers = CPU_CORES × 2 + 1  # 9 workers on 4-core CPU
worker_connections = 1000     # concurrent connections per worker
timeout = 60                  # request timeout
keepalive = 5                 # persistent connection timeout
```

#### 2. Uvicorn Workers
ASGI workers for async Python:
- Async I/O for database operations
- Concurrent request handling
- Better resource utilization

#### 3. Database Connection Pooling
Motor (async MongoDB driver) includes:
- Connection pool management
- Automatic reconnection
- Query optimization

#### 4. Logging Optimization
Production logging is configured for performance:
- JSON structured logging (easier to parse)
- Appropriate log levels (INFO, not DEBUG)
- Log rotation to prevent disk full

---

## Bundle Size Analysis

### Expected Production Sizes (gzipped)

```
Frontend Bundle Breakdown:
├── react-vendor.js           ~48 KB
├── ui-vendor.js              ~75 KB
├── maps-vendor.js            ~55 KB
├── vendor.lucide-react.js    ~42 KB
├── main.js                   ~120 KB
├── main.css                  ~35 KB
└── runtime.js                ~5 KB
────────────────────────────────────
Total:                         ~380 KB gzipped
```

### How to Analyze Bundle Size

#### 1. After Build
```bash
npm run build
# Terminal output shows:
# You can now serve this app. Example command:
#   serve -s build
#
# Build summary:
# File sizes after gzip:
#
#   123 KB  build/static/js/main.12345.js
#   55 KB   build/static/js/react-vendor.67890.js
#   ... etc
```

#### 2. With Bundle Analyzer
```bash
# Install analyzer
npm install --save-dev source-map-explorer

# Add to package.json scripts:
"analyze": "source-map-explorer 'build/static/js/*.js'"

# Run analysis
npm run build
npm run analyze
```

#### 3. With Webpack Bundle Analyzer
```bash
# Install
npm install --save-dev webpack-bundle-analyzer

# Configure in craco.config.js and run
npm run build
```

---

## Performance Tuning

### Frontend Performance Metrics

#### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5 seconds
- **FID** (First Input Delay): < 100 milliseconds  
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8 seconds
- **TTFB** (Time to First Byte): < 600 milliseconds

#### How to Measure
```javascript
// In src/index.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  console.log(metric);
  // Send to analytics service
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Backend Performance Metrics

#### Response Time Targets
- API response time: < 100ms (p50), < 500ms (p95)
- Database query time: < 50ms
- Endpoint availability: > 99.9%

#### How to Monitor
```python
# Add to server.py
from datetime import datetime

@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds()
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

---

## Build Command Reference

### Development
```bash
# Fast rebuild, unoptimized, with source maps
npm start          # Runs dev server with hot reload
npm run build      # Creates unoptimized build
```

### Production
```bash
# Optimized build with all compression
npm run build      # Production build (NODE_ENV=production)

# With build analysis
npm run analyze    # View bundle breakdown
```

### Testing Builds Locally
```bash
# Serve production build locally
npx serve -s build

# Or with Docker
docker build -t my-app-frontend .
docker run -p 80:80 my-app-frontend
```

---

## Monitoring Production Performance

### Real User Monitoring (RUM)
```javascript
// Add to index.html
<script>
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const perfObj = {
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ttfb: perfData.responseStart - perfData.navigationStart,
      download: perfData.responseEnd - perfData.responseStart,
      domParsing: perfData.domInteractive - perfData.domLoading,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
      loadComplete: perfData.loadEventEnd - perfData.navigationStart,
    };
    // Send perfObj to analytics
  });
</script>
```

### Backend Metrics
Monitor using Prometheus or your hosting provider:
- Request rate (requests/sec)
- Error rate (5xx, 4xx percentage)
- Response time (p50, p95, p99)
- Worker utilization
- Memory usage
- Database connection pool status

---

## Optimization Checklist

### Before Production Deployment
- [ ] Bundle size < 400 KB gzipped
- [ ] Core Web Vitals green scores
- [ ] No console errors in production build
- [ ] Service Worker installed and working
- [ ] Images optimized (WebP format, appropriate sizes)
- [ ] Fonts optimized (system fonts or subset)
- [ ] Unused dependencies removed
- [ ] CSS unused classes removed
- [ ] API response times < 100ms (p50)
- [ ] Database indexes created
- [ ] Caching headers configured
- [ ] CDN configured (if using)
- [ ] SSL/TLS enabled
- [ ] Rate limiting enabled
- [ ] Monitoring and alerts set up

### Continuous Optimization
- Weekly bundle size review
- Monthly performance audit
- Quarterly dependency updates
- Quarterly security audit

---

## Common Issues & Solutions

### Bundle Size Too Large
```bash
# 1. Find what's taking space
npm run analyze

# 2. Check for duplicate dependencies
npm list | grep -E "[^|]@@|duplicate'

# 3. Remove unused dependencies
npm uninstall package-name

# 4. Code split large modules
import(/* webpackChunkName: "module" */ './large-module')
```

### Slow Initial Load
```bash
# 1. Check for large images
find public -type f -name "*.png" -o -name "*.jpg"

# 2. Compress images
# Use online tools or tools like ImageOptim

# 3. Use lazy loading
<img loading="lazy" src="image.jpg" />

# 4. Use dynamic imports
const Component = lazy(() => import('./Component'))
```

### High Memory Usage
```bash
# 1. Monitor Gunicorn workers
ps aux | grep gunicorn

# 2. Reduce number of workers if memory-constrained
export GUNICORN_WORKERS=2

# 3. Enable memory monitoring
# Add memory usage to logs
```

---

## Further Resources

- [Web Vitals](https://web.dev/vitals/)
- [Webpack Optimization](https://webpack.js.org/guides/production/)
- [Create React App Performance](https://create-react-app.dev/docs/advanced-configuration/)
- [FastAPI Performance](https://fastapi.tiangolo.com/advanced/performance/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
