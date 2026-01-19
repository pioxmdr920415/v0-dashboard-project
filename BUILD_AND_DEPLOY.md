# Build and Deployment Guide

Complete guide for building and deploying the MDRRMO Dashboard to production.

## Quick Start

### One-Command Production Build

```bash
# Build both frontend and backend for production
npm run build:production

# Or manually
bash scripts/build-production.sh
```

This script:
1. Checks all requirements (Node.js, npm, Python 3)
2. Installs frontend dependencies
3. Creates optimized production frontend build
4. Creates Python virtual environment
5. Installs backend dependencies
6. Verifies build integrity
7. Generates build summary

---

## Frontend Production Build

### Manual Build

```bash
cd frontend
npm install  # Install dependencies
npm run build  # Create optimized build
```

### Build Output

```
frontend/build/
├── static/
│   ├── js/               # JavaScript bundles (code-split)
│   │   ├── main.[hash].js
│   │   ├── react-vendor.[hash].js
│   │   ├── ui-vendor.[hash].js
│   │   └── ... (other chunks)
│   ├── css/              # Compiled Tailwind CSS
│   │   └── main.[hash].css
│   └── media/            # Images, fonts, icons
├── index.html            # Main HTML file
├── manifest.json         # PWA manifest
└── service-worker.js     # Service worker for PWA
```

### Build Optimization Features

✓ **Code Splitting**: Separate chunks for React, UI libs, Maps, Lucide icons
✓ **Gzip Compression**: JS/CSS automatically compressed  
✓ **Tree Shaking**: Unused code eliminated
✓ **Source Maps**: For debugging in production
✓ **Minification**: All code minified and optimized
✓ **Cache Busting**: Hash-based filenames for browser caching

### Expected Metrics

- **Bundle Size**: ~380 KB gzipped
- **Main JS**: ~120 KB gzipped
- **CSS**: ~35 KB gzipped
- **Load Time**: 1-2 seconds on average connection

---

## Backend Production Build

### Manual Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn
```

### Running Production Server

#### With Gunicorn (recommended)

```bash
cd backend
source venv/bin/activate

gunicorn \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --config gunicorn_config.py \
  server:app
```

#### With Uvicorn (development)

```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Environment Variables

Create `backend/.env`:

```env
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net
DB_NAME=production
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=INFO
ENABLE_METRICS=true
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=60
```

---

## Docker Production Deployment

### Build Docker Images

```bash
# Build all services
docker-compose build

# Or build individually
docker build -t my-app-frontend:latest -f frontend/Dockerfile .
docker build -t my-app-backend:latest -f backend/Dockerfile .
```

### Run with Docker Compose

```bash
# Start all services (frontend, backend, MongoDB)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (WARNING: deletes database)
docker-compose down -v
```

### Docker Compose Services

```yaml
services:
  mongodb:      # Database (port 27017)
  backend:      # API server (port 8000)
  frontend:     # Web server (port 80)
```

### Custom Docker Run

```bash
# Frontend
docker run -d \
  -p 80:80 \
  --name frontend \
  my-app-frontend:latest

# Backend
docker run -d \
  -p 8000:8000 \
  -e MONGO_URL="mongodb://mongo:27017" \
  -e DB_NAME="production" \
  --link mongodb:mongo \
  --name backend \
  my-app-backend:latest
```

---

## Cloud Deployment

### Vercel (Frontend + Serverless Backend)

#### Deploy Frontend

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

**vercel.json configuration:**
```json
{
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

#### Deploy Backend

```bash
# Create api/index.py for Vercel Functions
mkdir api
cp backend/server.py api/index.py
vercel --prod
```

### AWS EC2

#### Step 1: Launch Instance

```bash
# Amazon Linux 2 or Ubuntu 20.04
# Open ports: 80, 443, 8000

# SSH into instance
ssh -i key.pem ec2-user@your-instance-ip
```

#### Step 2: Install Dependencies

```bash
# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # Amazon Linux
# OR
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs  # Ubuntu

# Install Python
sudo yum install -y python3 python3-pip  # Amazon Linux
# OR
sudo apt install -y python3 python3-pip python3-venv  # Ubuntu

# Install MongoDB shell (optional, for management)
sudo yum install -y mongodb-org-tools  # Amazon Linux
```

#### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/dashboard.git
cd dashboard

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
cd ..

# Setup systemd service for backend
sudo tee /etc/systemd/system/dashboard-api.service > /dev/null <<EOF
[Unit]
Description=Dashboard API
After=network.target

[Service]
Type=notify
User=ec2-user
WorkingDirectory=/home/ec2-user/dashboard/backend
ExecStart=/home/ec2-user/dashboard/backend/venv/bin/gunicorn \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --config gunicorn_config.py \
  server:app

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable dashboard-api
sudo systemctl start dashboard-api
```

#### Step 4: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo yum install -y nginx  # Amazon Linux
# OR
sudo apt install -y nginx  # Ubuntu

# Copy Nginx config
sudo cp frontend/nginx.conf /etc/nginx/conf.d/default.conf
sudo cp frontend/build/* /var/www/html/

# Test and reload
sudo nginx -t
sudo systemctl restart nginx
```

### Heroku

#### Deploy Frontend

```bash
# Create Heroku app
heroku create my-app-frontend

# Deploy
git subtree push --prefix frontend heroku main
```

#### Deploy Backend

```bash
# Create Heroku app
heroku create my-app-backend

# Set environment variables
heroku config:set MONGO_URL=your_mongo_url
heroku config:set DB_NAME=production

# Deploy
git subtree push --prefix backend heroku main
```

### DigitalOcean App Platform

#### Create from Dockerfile

```bash
# Push Docker images to registry
docker tag my-app-backend:latest registry.digitalocean.com/my-registry/backend:latest
docker tag my-app-frontend:latest registry.digitalocean.com/my-registry/frontend:latest

docker push registry.digitalocean.com/my-registry/backend:latest
docker push registry.digitalocean.com/my-registry/frontend:latest

# Deploy via DigitalOcean dashboard or CLI
doctl apps create --spec app.yaml
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Environment variables configured
- [ ] Database backups verified
- [ ] SSL certificates ready
- [ ] Monitoring configured
- [ ] Error tracking set up
- [ ] Rollback plan ready

### During Deployment
- [ ] Health checks passing
- [ ] Zero-downtime deployment (if possible)
- [ ] Database migrations completed
- [ ] Cache cleared (CDN/browser)
- [ ] Monitoring alerts active
- [ ] On-call engineer available

### Post-Deployment
- [ ] Frontend loads correctly
- [ ] API responding on correct endpoints
- [ ] Database operations working
- [ ] Authentication/authorization working
- [ ] File uploads functioning
- [ ] Scheduled jobs running
- [ ] Logs being collected
- [ ] Metrics being recorded
- [ ] Alerts configured and tested

---

## Build Scripts Reference

### Available Commands

```bash
# Install all dependencies
npm run install:all

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend

# Full production build
npm run build:production

# Docker commands
npm run docker:build      # Build images
npm run docker:up         # Start services
npm run docker:down       # Stop services
npm run docker:logs       # View logs
npm run docker:prod       # Build and run production

# Cleanup
npm run clean:cache       # Clear build cache
npm run clean:all         # Remove all generated files
```

---

## Troubleshooting

### Frontend Build Issues

**Issue**: Build fails with webpack error
```bash
# Solution: Clear cache and rebuild
npm run clean:cache
npm run build:frontend
```

**Issue**: Bundle size too large
```bash
# Solution: Analyze bundle
npm run build:frontend
npm install --save-dev webpack-bundle-analyzer
# Check for large dependencies
```

**Issue**: Memory error during build
```bash
# Solution: Increase Node heap size
export NODE_OPTIONS=--max_old_space_size=4096
npm run build:frontend
```

### Backend Issues

**Issue**: Module import errors
```bash
# Solution: Reinstall dependencies
rm -rf venv __pycache__
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Issue**: Database connection fails
```bash
# Check MongoDB connection string
# Verify IP whitelist in MongoDB Atlas
# Test connection: python3 -c "import pymongo; pymongo.MongoClient('<MONGO_URL>')"
```

**Issue**: Port already in use
```bash
# Find and kill process
lsof -i :8000
kill -9 <PID>

# Or use different port
python3 -m uvicorn server:app --port 8001
```

### Docker Issues

**Issue**: Container won't start
```bash
# Check logs
docker logs container_name

# Rebuild image
docker-compose build --no-cache
docker-compose up
```

**Issue**: Database not persisting
```bash
# Check volume configuration
docker volume ls
docker volume inspect volume_name

# Ensure volume is mounted correctly in docker-compose.yml
```

---

## Performance Monitoring

### Frontend Metrics

Monitor via browser DevTools or Google Analytics:
- Load time
- Bundle size
- Core Web Vitals
- Error rates

### Backend Metrics

Monitor with Prometheus/Grafana:
- Request latency (p50, p95, p99)
- Error rate
- Throughput (req/sec)
- Database query time
- Worker utilization

### Setup Monitoring

```python
# Add to backend/server.py
from prometheus_client import Counter, Histogram, generate_latest
import time

request_count = Counter('http_requests_total', 'Total HTTP requests')
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.middleware("http")
async def add_metrics(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    
    request_count.inc()
    request_duration.observe(duration)
    return response

@app.get("/metrics")
async def metrics():
    return generate_latest()
```

---

## Support and Documentation

- **Deployment Docs**: See `DEPLOYMENT_GUIDE.md`
- **Environment Setup**: See `ENV_SETUP.md`
- **Build Optimization**: See `BUILD_OPTIMIZATION.md`
- **Production Build**: See `PRODUCTION_BUILD.md`
- **Local Development**: See `START_LOCAL.md`
