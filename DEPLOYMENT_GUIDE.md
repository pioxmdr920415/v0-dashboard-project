# Deployment Guide

This guide covers deployment options for both the frontend and backend of the Dashboard application.

---

## Backend Deployment Options

### Option 1: Deploy to Heroku (Recommended for beginners)

**Prerequisites**: Heroku account, Heroku CLI installed

**Steps**:

1. **Create a Procfile** in the `backend` directory:
```
web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app
```

2. **Add production requirements** - Update `backend/requirements.txt` to include:
```
gunicorn==20.1.0
python-dotenv==0.19.0
```

3. **Initialize Heroku**:
```bash
cd backend
heroku login
heroku create your-app-name
```

4. **Set environment variables**:
```bash
heroku config:set MONGO_URL=your_mongo_connection_string
heroku config:set DB_NAME=dashboard_prod
heroku config:set CORS_ORIGINS=https://your-frontend-url.com
```

5. **Deploy**:
```bash
git push heroku main
```

6. **Monitor**:
```bash
heroku logs --tail
```

### Option 2: Deploy to AWS EC2

**Prerequisites**: AWS account, EC2 instance (Ubuntu 20.04+)

**Steps**:

1. **Connect to your instance** via SSH

2. **Install dependencies**:
```bash
sudo apt-get update
sudo apt-get install python3-pip python3-venv nginx
```

3. **Clone your repository**:
```bash
git clone your-repo-url
cd backend
```

4. **Create Python virtual environment**:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

5. **Create systemd service** - `/etc/systemd/system/dashboard-api.service`:
```ini
[Unit]
Description=Dashboard API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/backend
Environment="PATH=/home/ubuntu/backend/venv/bin"
EnvironmentFile=/home/ubuntu/backend/.env
ExecStart=/home/ubuntu/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app

[Install]
WantedBy=multi-user.target
```

6. **Start the service**:
```bash
sudo systemctl daemon-reload
sudo systemctl start dashboard-api
sudo systemctl enable dashboard-api
```

7. **Configure Nginx as reverse proxy** - `/etc/nginx/sites-available/default`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

8. **Enable SSL with Certbot**:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 3: Deploy to DigitalOcean App Platform

**Prerequisites**: DigitalOcean account

**Steps**:

1. **Create app.yaml** in backend root:
```yaml
name: dashboard-api
services:
- name: api
  github:
    repo: your-username/your-repo
    branch: main
  build_command: pip install -r requirements.txt
  run_command: gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app
  envs:
  - key: MONGO_URL
    value: ${DB_MONGO_URL}
  - key: DB_NAME
    value: dashboard_prod
  - key: CORS_ORIGINS
    value: https://your-frontend-url.com
  http_port: 8000
databases:
- engine: MONGODB
  name: dashboard-db
  version: "5.0"
```

2. **Deploy via DigitalOcean console** or CLI:
```bash
doctl apps create --spec app.yaml
```

---

## Frontend Deployment Options

### Option 1: Deploy to Vercel (Recommended for Next.js/React)

**Prerequisites**: Vercel account, GitHub repo connected

**Steps**:

1. **Push code to GitHub**:
```bash
git push origin main
```

2. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Select `frontend` as the root directory

3. **Add environment variables** in Vercel dashboard:
   - Project Settings → Environment Variables
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.com
   REACT_APP_GOOGLE_SHEET_ID=your_sheet_id
   REACT_APP_GOOGLE_API_KEY=your_api_key
   ```

4. **Deploy**:
   - Vercel automatically deploys on every push
   - Your app is live at `your-project.vercel.app`

### Option 2: Deploy to Netlify

**Prerequisites**: Netlify account, GitHub repo

**Steps**:

1. **Create `frontend/netlify.toml`**:
```toml
[build]
  command = "npm run build"
  publish = "build"

[context.production]
  environment = { REACT_APP_ENV = "production" }

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. **Connect to Netlify**:
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Choose GitHub
   - Select your repository

3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `build`
   - Base directory: `frontend`

4. **Add environment variables**:
   - Site settings → Build & deploy → Environment
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.com
   REACT_APP_GOOGLE_SHEET_ID=your_sheet_id
   REACT_APP_GOOGLE_API_KEY=your_api_key
   ```

### Option 3: Deploy to AWS S3 + CloudFront

**Prerequisites**: AWS account, AWS CLI configured

**Steps**:

1. **Build the app**:
```bash
cd frontend
npm run build
```

2. **Create S3 bucket**:
```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

3. **Upload build files**:
```bash
aws s3 sync build/ s3://your-bucket-name/ --delete
```

4. **Create CloudFront distribution**:
   - Go to AWS CloudFront console
   - Create distribution
   - Set S3 bucket as origin
   - Enable HTTPS

5. **Automate with GitHub Actions** - `.github/workflows/deploy.yml`:
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: cd frontend && npm install
      
      - name: Build
        run: cd frontend && npm run build
      
      - name: Deploy to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 sync frontend/build/ s3://your-bucket-name/ --delete
          aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Production Checklist

### Backend Pre-Deployment
- [ ] Update all environment variables for production
- [ ] Enable HTTPS on production domain
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Test CORS configuration
- [ ] Set DEBUG=False
- [ ] Run security tests
- [ ] Test all API endpoints

### Frontend Pre-Deployment
- [ ] Update REACT_APP_BACKEND_URL to production URL
- [ ] Enable production optimizations
- [ ] Test all features in production environment
- [ ] Verify Google Sheets integration
- [ ] Check for console errors
- [ ] Test on multiple browsers
- [ ] Verify PWA installation

### Post-Deployment
- [ ] Monitor backend logs
- [ ] Check application performance
- [ ] Test critical user flows
- [ ] Verify database connectivity
- [ ] Monitor API response times
- [ ] Set up uptime monitoring

---

## Monitoring & Maintenance

### Backend Monitoring
```bash
# View logs
heroku logs --tail  # Heroku
tail -f /var/log/dashboard-api.log  # AWS/DigitalOcean

# Monitor performance
# Use tools like: Datadog, New Relic, or Sentry
```

### Frontend Monitoring
```bash
# Use services like:
# - Sentry for error tracking
# - LogRocket for session replays
# - Google Analytics for user tracking
```

---

## Scaling Strategies

### Backend Scaling
1. **Horizontal**: Use load balancers (AWS ELB, nginx)
2. **Vertical**: Increase instance size
3. **Database**: Enable MongoDB Atlas auto-scaling

### Frontend Scaling
1. **CDN**: Use CloudFront, Cloudflare, or similar
2. **Caching**: Configure aggressive cache headers
3. **Code splitting**: Already implemented with React lazy loading

---

## Continuous Integration/Deployment (CI/CD)

### GitHub Actions Example - `.github/workflows/deploy.yml`:
```yaml
name: Deploy App

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Test Backend
        run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/ || true
      
      - name: Test Frontend
        run: |
          cd frontend
          npm install
          npm run test -- --watchAll=false || true

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      # Deploy backend
      - name: Deploy Backend
        run: |
          # Use heroku, AWS CLI, or your deployment tool
          
      # Deploy frontend
      - name: Deploy Frontend
        run: |
          # Use Vercel CLI, AWS CLI, or Netlify
```

---

## Rollback Procedures

### Heroku Rollback
```bash
heroku releases
heroku rollback v2
```

### AWS/DigitalOcean
```bash
git revert HEAD~1
git push
# Redeploy
```

### Vercel Rollback
- Go to Deployments tab
- Click on previous version
- Click "Promote to Production"

---

## Support & Troubleshooting

For deployment issues:
1. Check service logs for errors
2. Verify environment variables are set
3. Test database connectivity
4. Check CORS configuration
5. Verify DNS is pointing to correct IP
6. Test API endpoints directly
7. Check firewall/security group rules
