# Production Build Guide

## Overview
This guide covers optimized production builds for both frontend and backend, including performance optimization, bundling strategies, and deployment verification.

## Frontend Production Build

### 1. Build Optimization

The frontend uses Create React App (CRA) with Craco for advanced webpack configuration:

**Key Optimizations:**
- **Code Splitting**: Automatic vendor chunk splitting (React, UI libraries, Maps, Lucide icons)
- **Compression**: Gzip compression for JS/CSS/HTML files
- **Tree Shaking**: Unused code elimination
- **Source Maps**: Production source maps for error tracking
- **Minification**: Automatic minification of all assets

### 2. Build Commands

```bash
# Development build (fast, for testing)
cd frontend
npm run build

# Analyze bundle size
npm run build -- --stats
```

### 3. Expected Build Output

```
frontend/build/
├── static/
│   ├── js/
│   │   ├── main.[hash].js          # Main app code
│   │   ├── react-vendor.[hash].js  # React, React-DOM, React Router
│   │   ├── ui-vendor.[hash].js     # Radix UI components
│   │   ├── maps-vendor.[hash].js   # Leaflet, React-Leaflet
│   │   ├── vendor.lucide-react.[hash].js
│   │   └── [runtime].[hash].js     # Webpack runtime
│   ├── css/
│   │   └── main.[hash].css         # All styles combined
│   └── media/
│       ├── icons/
│       ├── screenshots/
│       └── images/
├── index.html
├── manifest.json
├── favicon.ico
└── service-worker.js
```

### 4. Build Metrics

**Target Metrics:**
- **Main Bundle**: < 150 KB gzipped
- **React Vendor**: < 50 KB gzipped
- **UI Vendor**: < 80 KB gzipped
- **Maps Vendor**: < 60 KB gzipped
- **Total Size**: < 400 KB gzipped

**Check Bundle Size:**
```bash
npm run build
# Note the reported size in terminal output
```

---

## Backend Production Build

### 1. Gunicorn + Uvicorn Setup

The backend uses Gunicorn as the production WSGI server with Uvicorn workers:

```python
# Production server configuration
workers = 4  # CPU cores × 2 + 1 (adjust based on your server)
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 60
keepalive = 5
```

### 2. Build and Run Commands

**Local Production Test:**
```bash
cd backend
pip install gunicorn

# Run with Gunicorn
gunicorn \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile - \
  server:app
```

**Docker Production Build:**
```bash
docker build -t my-app-backend:latest -f backend/Dockerfile .
docker run -p 8000:8000 \
  -e MONGO_URL="mongodb+srv://..." \
  -e DB_NAME="production" \
  -e CORS_ORIGINS="https://myapp.com" \
  my-app-backend:latest
```

### 3. Environment Variables for Production

```env
# backend/.env (production)
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/production
DB_NAME=production_db
CORS_ORIGINS=https://myapp.com,https://www.myapp.com
LOG_LEVEL=INFO
API_TIMEOUT=60
ENABLE_METRICS=true
```

### 4. Performance Optimization

**Database:**
- Use MongoDB Atlas with proper indexes
- Enable compression
- Use connection pooling

**Caching:**
- Implement Redis for session/cache layer
- Set appropriate TTLs

**Monitoring:**
- Enable access logs
- Track error rates
- Monitor response times

---

## Docker Production Build

### 1. Multi-Stage Frontend Build

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend . 
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build:**
```bash
docker build -t my-app-frontend:latest -f frontend/Dockerfile .
docker run -p 80:80 my-app-frontend:latest
```

### 2. Backend Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend .
EXPOSE 8000
CMD ["gunicorn", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "server:app"]
```

---

## Full Stack Docker Compose

```bash
# Build all services
docker-compose -f docker-compose.yml build

# Run production stack
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Scale backend workers
docker-compose up -d --scale backend=3
```

---

## Pre-Deployment Checklist

### Frontend
- [ ] Bundle size < 400 KB gzipped
- [ ] All environment variables set
- [ ] Service worker registered
- [ ] PWA manifest valid
- [ ] Images optimized
- [ ] CDN configured (if using)
- [ ] Security headers set (CSP, HSTS, etc.)

### Backend
- [ ] All tests passing
- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] Health check endpoint working
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Logging configured

### General
- [ ] Error tracking set up (Sentry, DataDog, etc.)
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] SSL/TLS certificates valid
- [ ] Security audit completed
- [ ] Load testing performed

---

## Performance Monitoring

### Frontend Metrics
```javascript
// Monitor Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Backend Metrics
```python
# FastAPI metrics middleware
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

---

## Rollback Procedure

1. **Blue-Green Deployment**: Keep previous version running
2. **Database**: Use transactions for critical operations
3. **CDN Cache**: Purge on deployment
4. **DNS/Load Balancer**: Quickly switch traffic if needed

---

## Security Hardening

**Frontend:**
```
- Content-Security-Policy headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
```

**Backend:**
```
- Rate limiting per IP/user
- Request size limits
- SQL injection prevention
- CORS whitelist enforcement
```

---

## Further Reading

- [Create React App Deployment](https://create-react-app.dev/docs/deployment/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Web Vitals Optimization](https://web.dev/vitals/)
