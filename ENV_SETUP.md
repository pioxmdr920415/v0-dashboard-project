# Environment Variables Setup Guide

This guide explains how to configure environment variables for both the frontend and backend of the Dashboard application.

## Quick Start

1. Copy the example files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. Fill in the required values (see sections below)
3. Start the application

---

## Backend Configuration (`backend/.env`)

### Required Variables

#### MongoDB Configuration
- **MONGO_URL** (Required)
  - Format: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
  - Get from: MongoDB Atlas dashboard
  - Example: `mongodb+srv://user123:pass123@cluster0.mongodb.net/?retryWrites=true&w=majority`

- **DB_NAME** (Required)
  - Default: `dashboard`
  - The MongoDB database name to use

#### Server Configuration
- **PORT** (Optional)
  - Default: `8000`
  - Port for the FastAPI server

- **CORS_ORIGINS** (Required for production)
  - Format: Comma-separated URLs
  - Examples:
    - Development: `http://localhost:3000`
    - Production: `https://yourdomain.com,https://www.yourdomain.com`
  - Controls which origins can access your API

### Optional Variables

- **DEBUG** (Optional)
  - Default: `False`
  - Set to `True` only in development

- **API_PREFIX** (Optional)
  - Default: `/api`
  - URL prefix for all API endpoints

- **LOG_LEVEL** (Optional)
  - Default: `INFO`
  - Options: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`

---

## Frontend Configuration (`frontend/.env.local`)

### Required Variables

#### Backend API
- **REACT_APP_BACKEND_URL** (Required)
  - Development: `http://localhost:8000`
  - Production: `https://api.yourdomain.com`
  - The backend API base URL

#### Google Sheets Integration
- **REACT_APP_GOOGLE_SHEET_ID** (Required for data features)
  - Get from: Google Sheets URL `https://docs.google.com/spreadsheets/d/{ID}/...`
  - Format: Long alphanumeric string

- **REACT_APP_GOOGLE_API_KEY** (Required for Google Sheets)
  - Get from: Google Cloud Console
  - Steps:
    1. Go to https://console.cloud.google.com
    2. Create a new project
    3. Enable Google Sheets API
    4. Create an API key (Credentials)
    5. Copy the API key

### Optional Variables

- **REACT_APP_ENV** (Optional)
  - Options: `development`, `production`
  - Default: Inferred from NODE_ENV

- **REACT_APP_API_TIMEOUT** (Optional)
  - Default: `30000` (milliseconds)
  - Request timeout duration

- **REACT_APP_LOG_LEVEL** (Optional)
  - Default: `info`
  - Options: `debug`, `info`, `warn`, `error`

- **ENABLE_HEALTH_CHECK** (Optional)
  - Default: `true`
  - Enable health monitoring

- **WDS_SOCKET_PORT** (Optional)
  - Default: `3000`
  - Webpack dev server port

---

## Getting Required Values

### MongoDB Atlas Setup
1. Go to https://www.mongodb.com/cloud/atlas
2. Create an account or sign in
3. Create a new cluster
4. Set up database access (username/password)
5. Get connection string
6. Add your IP to the IP access list
7. Replace `<username>`, `<password>` in the connection string

### Google Sheets Setup
1. Create a new Google Sheet
2. Share it (at least view access)
3. Copy the ID from the URL
4. Go to https://console.cloud.google.com
5. Create a new project
6. Enable Google Sheets API
7. Create an API key under Credentials
8. Test the key in the app

---

## Deployment Environments

### Development Environment
```env
# backend/.env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=dashboard_dev
CORS_ORIGINS=http://localhost:3000
PORT=8000
DEBUG=True
LOG_LEVEL=DEBUG
```

```env
# frontend/.env.local
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_SHEET_ID=your_dev_sheet_id
REACT_APP_GOOGLE_API_KEY=your_api_key
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
```

### Production Environment
```env
# backend/.env
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=dashboard_prod
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PORT=8000
DEBUG=False
LOG_LEVEL=INFO
```

```env
# frontend/.env.production.local
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_GOOGLE_SHEET_ID=your_prod_sheet_id
REACT_APP_GOOGLE_API_KEY=your_api_key
REACT_APP_ENV=production
REACT_APP_LOG_LEVEL=info
```

---

## Security Best Practices

1. **Never commit .env files to version control**
   - Add to `.gitignore`:
     ```
     .env
     .env.local
     .env.*.local
     ```

2. **Use environment-specific values**
   - Different API keys for dev/staging/production
   - Different database instances

3. **Rotate credentials regularly**
   - Change MongoDB passwords periodically
   - Regenerate API keys

4. **Restrict API key access**
   - In Google Cloud: Restrict key to specific APIs
   - In MongoDB: Use IP whitelisting

5. **Use HTTPS in production**
   - All production URLs should use https://
   - Set secure CORS origins

---

## Troubleshooting

### Backend won't connect to MongoDB
- Check MONGO_URL format
- Verify IP is whitelisted in MongoDB Atlas
- Ensure username/password are correct
- Test connection string directly

### Frontend can't reach backend
- Verify REACT_APP_BACKEND_URL is correct
- Check CORS_ORIGINS in backend includes frontend URL
- Ensure backend is running and healthy
- Check browser console for specific errors

### Google Sheets not loading
- Verify REACT_APP_GOOGLE_SHEET_ID is correct
- Check REACT_APP_GOOGLE_API_KEY is valid
- Ensure sheet is shared/public
- Verify API is enabled in Google Cloud Console

### Port conflicts
- Change PORT in backend/.env if 8000 is in use
- Change WDS_SOCKET_PORT in frontend/.env if 3000 is in use
- Check for other services using these ports: `lsof -i :PORT_NUMBER`

---

## Next Steps

After configuring environment variables:

1. **Install dependencies**:
   ```bash
   # Backend
   cd backend
   pip install -r requirements.txt
   
   # Frontend
   cd frontend
   npm install
   ```

2. **Start development servers**:
   ```bash
   # Backend (in terminal 1)
   cd backend
   python server.py
   
   # Frontend (in terminal 2)
   cd frontend
   npm start
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api

---

## For Support

If you encounter issues:
1. Check this guide first
2. Review the browser console for client-side errors
3. Check backend logs for server-side errors
4. Verify all environment variables are set correctly
5. Ensure all services (MongoDB, backend, frontend) are running
