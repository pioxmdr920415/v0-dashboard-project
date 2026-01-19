#!/bin/bash

# Production Build Script
# Builds both frontend and backend for production deployment

set -e  # Exit on any error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Production Build Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check for required tools
check_requirements() {
  echo -e "${YELLOW}Checking requirements...${NC}"
  
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
  fi
  
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
  fi
  
  if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ All requirements met${NC}"
  echo ""
}

# Build frontend
build_frontend() {
  echo -e "${YELLOW}Building Frontend...${NC}"
  cd "$PROJECT_ROOT/frontend"
  
  # Install dependencies if node_modules doesn't exist
  if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
  fi
  
  # Run production build
  echo "Running production build..."
  npm run build
  
  # Check build output
  if [ -d "build" ]; then
    BUILD_SIZE=$(du -sh build | cut -f1)
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
    echo -e "  Build size: ${BUILD_SIZE}"
  else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
  fi
  
  cd "$PROJECT_ROOT"
  echo ""
}

# Build backend
build_backend() {
  echo -e "${YELLOW}Building Backend...${NC}"
  cd "$PROJECT_ROOT/backend"
  
  # Create virtual environment if it doesn't exist
  if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
  fi
  
  # Activate virtual environment
  source venv/bin/activate
  
  # Install dependencies
  echo "Installing backend dependencies..."
  pip install --upgrade pip setuptools wheel
  pip install -r requirements.txt
  pip install gunicorn
  
  # Check for syntax errors
  echo "Checking for syntax errors..."
  python3 -m py_compile server.py
  
  echo -e "${GREEN}✓ Backend built successfully${NC}"
  echo ""
  
  # Deactivate virtual environment
  deactivate
  
  cd "$PROJECT_ROOT"
}

# Create production summary
create_summary() {
  echo -e "${YELLOW}Creating build summary...${NC}"
  
  SUMMARY_FILE="$PROJECT_ROOT/BUILD_SUMMARY.txt"
  
  cat > "$SUMMARY_FILE" << EOF
Production Build Summary
Generated: $(date)

Frontend Build
--------------
Location: frontend/build
Size: $(du -sh "$PROJECT_ROOT/frontend/build" 2>/dev/null | cut -f1)
Files:
EOF

  # List important frontend files
  if [ -d "$PROJECT_ROOT/frontend/build" ]; then
    find "$PROJECT_ROOT/frontend/build/static" -name "*.js" -o -name "*.css" | head -20 >> "$SUMMARY_FILE"
  fi
  
  cat >> "$SUMMARY_FILE" << EOF

Backend Build
--------------
Location: backend
Dependencies installed: Yes
Python version: $(python3 --version)

Environment Setup
-----------------
1. Frontend:
   - Copy contents of 'frontend/build' to your web server
   - Or use the provided frontend/Dockerfile

2. Backend:
   - Install dependencies: pip install -r requirements.txt
   - Or use the provided backend/Dockerfile

3. Environment Variables:
   - Copy .env.example to .env
   - Fill in production values
   - See ENV_SETUP.md for details

Deployment Ready: Yes ✓

For deployment instructions, see DEPLOYMENT_GUIDE.md
EOF

  echo -e "${GREEN}✓ Build summary created: $SUMMARY_FILE${NC}"
  echo ""
}

# Verify build integrity
verify_build() {
  echo -e "${YELLOW}Verifying build integrity...${NC}"
  
  # Check frontend build
  if [ ! -d "$PROJECT_ROOT/frontend/build" ]; then
    echo -e "${RED}❌ Frontend build directory not found${NC}"
    exit 1
  fi
  
  if [ ! -f "$PROJECT_ROOT/frontend/build/index.html" ]; then
    echo -e "${RED}❌ Frontend build/index.html not found${NC}"
    exit 1
  fi
  
  # Check backend
  if [ ! -f "$PROJECT_ROOT/backend/server.py" ]; then
    echo -e "${RED}❌ Backend server.py not found${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Build integrity verified${NC}"
  echo ""
}

# Main execution
main() {
  check_requirements
  build_frontend
  build_backend
  verify_build
  create_summary
  
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}Production build completed successfully!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Review BUILD_SUMMARY.txt"
  echo "2. Check DEPLOYMENT_GUIDE.md for deployment options"
  echo "3. Verify environment variables in .env files"
  echo "4. Test with: docker-compose up"
  echo ""
}

main "$@"
