# Local Development Setup

This guide walks you through setting up and running the Dashboard application locally.

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.11+ (for backend)
- MongoDB (local or MongoDB Atlas account)
- npm or yarn (for frontend)
- Git

## Quick Start with Docker

The easiest way to get started is with Docker and Docker Compose:

### 1. Install Docker
- Download from https://www.docker.com/products/docker-desktop

### 2. Clone and Setup
```bash
git clone your-repo-url
cd your-repo
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 3. Configure Environment Variables

**backend/.env**:
```env
MONGO_URL=mongodb://admin:password123@mongodb:27017/dashboard?authSource=admin
DB_NAME=dashboard
CORS_ORIGINS=http://localhost:3000
```

**frontend/.env.local**:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_GOOGLE_SHEET_ID=your_sheet_id
REACT_APP_GOOGLE_API_KEY=your_api_key
```

### 4. Start with Docker Compose
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- MongoDB: localhost:27017

### 5. Stop Services
```bash
docker-compose down
```

---

## Manual Setup (Without Docker)

### Backend Setup

#### 1. Navigate to backend directory
```bash
cd backend
```

#### 2. Create Python virtual environment
```bash
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

#### 3. Install dependencies
```bash
pip install -r requirements.txt
```

#### 4. Create .env file
```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection string and settings

#### 5. Start the backend server
```bash
python server.py
```

Backend will run at `http://localhost:8000`

Check API health: `http://localhost:8000/health`

### Frontend Setup

#### 1. Navigate to frontend directory (in a new terminal)
```bash
cd frontend
```

#### 2. Install dependencies
```bash
npm install
# or
yarn install
```

#### 3. Create .env.local file
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration

#### 4. Start the development server
```bash
npm start
# or
yarn start
```

Frontend will run at `http://localhost:3000`

---

## Development Workflow

### Terminal Layout
```
Terminal 1: Backend
$ cd backend && source venv/bin/activate && python server.py

Terminal 2: Frontend
$ cd frontend && npm start

Terminal 3: Git/Other commands
$ cd project-root && git ...
```

### Making Changes

**Backend Changes**:
1. Edit files in `backend/src/`
2. Backend automatically reloads on file changes
3. Check `http://localhost:8000/api/...` for changes

**Frontend Changes**:
1. Edit files in `frontend/src/`
2. Frontend hot-reloads automatically
3. Browser automatically refreshes

### API Testing

Use tools like:
- **Postman**: https://www.postman.com/
- **Insomnia**: https://insomnia.rest/
- **curl**: Built-in command line tool

Example API test:
```bash
curl http://localhost:8000/api/health
```

---

## Database Management

### MongoDB Atlas (Cloud - Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create account and cluster
3. Get connection string
4. Add to `backend/.env`:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

### Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

3. Add to `backend/.env`:
   ```
   MONGO_URL=mongodb://localhost:27017/dashboard
   ```

---

## Debugging

### Backend Debugging

**View logs**:
```bash
# Already visible in terminal

# Or check Flask debug mode in server.py
DEBUG=True python server.py
```

**Common issues**:
- Port 8000 in use: Change PORT in .env
- MongoDB connection failed: Check MONGO_URL and network
- CORS errors: Check CORS_ORIGINS includes frontend URL

### Frontend Debugging

**React DevTools**:
- Install React DevTools browser extension
- Open browser DevTools (F12 or Cmd+Option+I)
- Go to "React" tab

**Common issues**:
- Port 3000 in use: Kill process or change port
- Backend connection failed: Check REACT_APP_BACKEND_URL
- Google Sheets not loading: Check API key and Sheet ID

---

## Performance Tips

### Frontend
```bash
# Analyze bundle size
npm run build-analyze

# Run with profiling
npm run start:profile
```

### Backend
```bash
# Enable query logging
DEBUG=True python server.py

# Monitor requests with curl
curl -v http://localhost:8000/api/...
```

---

## Testing

### Backend Tests
```bash
cd backend
pip install pytest pytest-asyncio
pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## Troubleshooting

### "Port already in use"
```bash
# Find process using port (macOS/Linux)
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 <PID>

# On Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### "Cannot find module"
```bash
# Backend
pip install -r requirements.txt

# Frontend
rm -rf node_modules package-lock.json
npm install
```

### "MongoDB connection failed"
```bash
# Check connection string
# Test with mongo shell
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database"

# Check firewall/whitelist
```

### "React not loading"
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules
npm install

# Restart dev server
npm start
```

---

## Next Steps

1. **Read the documentation**: Check README.md for feature overview
2. **Explore components**: Look at `frontend/src/components/` 
3. **Test API**: Use Postman to test backend endpoints
4. **Make changes**: Start modifying code and see live updates
5. **Deploy**: Follow DEPLOYMENT_GUIDE.md when ready

---

## Getting Help

- Check browser console (F12) for JavaScript errors
- Check terminal output for backend errors
- Review environment variables in `.env` files
- Check MongoDB connection and database
- Test API endpoints directly with curl

Happy coding! 🚀
