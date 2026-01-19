# Root-Level Package.json Scripts

This document describes all available scripts that can be run from the root `/app` directory.

## 📦 Installation Scripts

### Install All Dependencies
\`\`\`bash
yarn install:all
\`\`\`
Installs both backend (Python) and frontend (Node.js) dependencies in one command.

### Install Backend Only
\`\`\`bash
yarn install:backend
\`\`\`
Installs Python dependencies from `backend/requirements.txt` using pip.

### Install Frontend Only
\`\`\`bash
yarn install:frontend
\`\`\`
Installs Node.js dependencies in the `frontend` directory using yarn.

## 🏗️ Build Scripts

### Build Frontend
\`\`\`bash
yarn build
\`\`\`
Creates an optimized production build of the React frontend in `frontend/build`.

## 🧹 Cleanup Scripts

### Clean Frontend Cache
\`\`\`bash
yarn clean:cache
\`\`\`
Removes webpack cache, build artifacts, and temporary files from frontend.

### Clean Everything
\`\`\`bash
yarn clean:all
\`\`\`
Removes all node_modules, build files, Python cache, and temporary files from both frontend and backend.

## 🔄 Service Management Scripts

### Restart All Services
\`\`\`bash
yarn restart:all
\`\`\`
Restarts all services (backend, frontend, mongodb) managed by supervisor.

### Restart Backend Only
\`\`\`bash
yarn restart:backend
\`\`\`
Restarts only the FastAPI backend service.

### Restart Frontend Only
\`\`\`bash
yarn restart:frontend
\`\`\`
Restarts only the React frontend service.

### Check Service Status
\`\`\`bash
yarn status
\`\`\`
Shows the status of all running services.

## 📋 Logging Scripts

### View Backend Logs
\`\`\`bash
yarn logs:backend
\`\`\`
Displays live backend logs (use Ctrl+C to exit).

### View Frontend Logs
\`\`\`bash
yarn logs:frontend
\`\`\`
Displays live frontend logs (use Ctrl+C to exit).

## 🧪 Testing Scripts

### Test Backend Health
\`\`\`bash
yarn test:backend
\`\`\`
Tests if the backend API is responding by calling the health endpoint.

## 🔧 Utility Scripts

### Freeze Backend Dependencies
\`\`\`bash
yarn freeze:backend
\`\`\`
Updates `backend/requirements.txt` with currently installed Python packages and their versions.

## 📚 Common Workflows

### Fresh Install After Cloning
\`\`\`bash
yarn install:all
\`\`\`

### After Adding New Dependencies
\`\`\`bash
# For frontend dependencies
cd frontend && yarn add <package-name>

# For backend dependencies
cd backend && pip install <package-name>
yarn freeze:backend  # Update requirements.txt
\`\`\`

### After Making Code Changes
\`\`\`bash
# Frontend has hot reload - changes apply automatically
# Backend has hot reload - changes apply automatically

# If changes don't apply:
yarn restart:all
\`\`\`

### Before Deployment
\`\`\`bash
yarn build
yarn status
\`\`\`

### Troubleshooting Build Issues
\`\`\`bash
yarn clean:cache
yarn restart:frontend
\`\`\`

### Troubleshooting Service Issues
\`\`\`bash
yarn status
yarn logs:backend    # Check backend logs
yarn logs:frontend   # Check frontend logs
\`\`\`

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Install everything | `yarn install:all` |
| Build for production | `yarn build` |
| Check services | `yarn status` |
| Restart all | `yarn restart:all` |
| View backend logs | `yarn logs:backend` |
| View frontend logs | `yarn logs:frontend` |
| Test API | `yarn test:backend` |
| Clean cache | `yarn clean:cache` |

## 💡 Tips

- All scripts can be run from the `/app` root directory
- Use `yarn <script-name>` or `yarn run <script-name>`
- Log viewing commands will run continuously - press Ctrl+C to exit
- Services are managed by supervisor and will auto-restart on crashes
- Frontend and backend have hot reload enabled - changes apply automatically

## 🔗 Service URLs

- **Backend API**: http://localhost:8001
- **Frontend Dev**: http://localhost:3000
- **API Health Check**: http://localhost:8001/api/health
- **MongoDB**: mongodb://localhost:27017

## 📁 Project Structure

\`\`\`
/app/
├── package.json          # Root package.json with scripts (this file's config)
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env
└── ROOT_SCRIPTS.md       # This documentation
\`\`\`
