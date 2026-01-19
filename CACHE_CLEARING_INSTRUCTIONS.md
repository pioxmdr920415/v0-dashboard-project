# MDRRMO Dashboard Cache Clearing Instructions

This document explains how to clear all caches in the MDRRMO Dashboard application.

## Cache Types Cleared

1. **Service Worker Cache**: Browser-based cache for static assets and API responses
2. **IndexedDB Cache**: Offline storage for sheets, drive folders, and metadata
3. **Backend MongoDB Cache**: Server-side cache for API responses

## How to Clear Cache

### Method 1: Using the Automated Script

Run the cache clearing script:

\`\`\`bash
python scripts/clear_cache.py
\`\`\`

This will:
- Create a cache clearing HTML file
- Create IndexedDB clearing instructions
- Clear the backend MongoDB cache

### Method 2: Manual Steps

#### 1. Clear Service Worker Cache

Open the following file in your browser:

\`\`\`
frontend/public/clear-cache.html
\`\`\`

This will unregister the service worker and clear the Cache API.

#### 2. Clear IndexedDB Cache

You have two options:

**Option A**: Run the provided script in browser console

1. Open your application in Chrome
2. Open DevTools (F12)
3. Go to Console tab
4. Copy and paste the contents of `clear_indexeddb_instructions.js`
5. Press Enter

**Option B**: Manual clearing via DevTools

1. Open your application in Chrome
2. Open DevTools (F12)
3. Go to Application > Storage > IndexedDB
4. Find the "MDRRMODashboard" database
5. Right-click and select "Delete database"

#### 3. Clear Backend Cache

The backend cache is automatically cleared by the script. If you need to clear it manually:

\`\`\`bash
cd backend
python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('.env')

async def clear_cache():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    result = await db.cache.delete_many({})
    print(f'Cleared {result.deleted_count} cached items')
    
    client.close()

asyncio.run(clear_cache())
"
\`\`\`

## Verification

To verify that caches have been cleared:

1. **Backend Cache**: Run the cache status check:
   \`\`\`bash
   cd backend
   python -c "
   import asyncio
   from motor.motor_asyncio import AsyncIOMotorClient
   import os
   from dotenv import load_dotenv
   
   load_dotenv('.env')
   
   async def check_cache():
       mongo_url = os.environ['MONGO_URL']
       db_name = os.environ['DB_NAME']
       
       client = AsyncIOMotorClient(mongo_url)
       db = client[db_name]
       
       count = await db.cache.count_documents({})
       print(f'Current cache items: {count}')
       
       client.close()
   
   asyncio.run(check_cache())
   "
   \`\`\`
   Should show: `Current cache items: 0`

2. **Browser Caches**: After clearing, refresh your application and check:
   - DevTools > Application > Cache Storage (should be empty)
   - DevTools > Application > IndexedDB (should be empty)

## When to Clear Cache

- After deploying new versions
- When experiencing caching-related issues
- During development and testing
- When data consistency issues occur

## Notes

- Clearing cache will force fresh data loading from APIs
- Users may experience slightly slower initial load times after cache clearing
- Service worker will re-cache assets on next visit
