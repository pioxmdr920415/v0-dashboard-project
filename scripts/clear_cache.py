#!/usr/bin/env python3
"""
Script to clear all caches in the MDRRMO Dashboard application
"""

import os
import sys
import subprocess
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def clear_service_worker_cache():
    """Clear service worker cache by unregistering the service worker"""
    print("🧹 Clearing Service Worker Cache...")
    
    # Create a simple HTML file to clear cache
    clear_cache_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Clear Cache</title>
    </head>
    <body>
        <h1>Clearing Cache...</h1>
        <script>
            // Unregister service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => {
                        registration.unregister();
                        console.log('Service worker unregistered');
                    });
                });
            }
            
            // Clear Cache API
            if ('caches' in window) {
                caches.keys().then(cacheNames => {
                    cacheNames.forEach(cacheName => {
                        caches.delete(cacheName);
                        console.log('Deleted cache:', cacheName);
                    });
                });
            }
            
            // Clear localStorage
            localStorage.clear();
            console.log('localStorage cleared');
            
            // Clear sessionStorage
            sessionStorage.clear();
            console.log('sessionStorage cleared');
            
            console.log('Cache clearing complete!');
            window.close();
        </script>
    </body>
    </html>
    """
    
    # Write the HTML file
    cache_clearer_path = ROOT_DIR / 'frontend' / 'public' / 'clear-cache.html'
    with open(cache_clearer_path, 'w') as f:
        f.write(clear_cache_html)
    
    print(f"✅ Created cache clearer at: {cache_clearer_path}")
    print("📝 Open this file in a browser to clear client-side caches")

async def clear_backend_cache():
    """Clear MongoDB cache"""
    print("🧹 Clearing Backend MongoDB Cache...")
    
    try:
        # Connect to MongoDB
        mongo_url = os.environ['MONGO_URL']
        db_name = os.environ['DB_NAME']
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Clear the cache collection
        result = await db.cache.delete_many({})
        
        print(f"✅ Cleared {result.deleted_count} cached items from MongoDB")
        
        # Close connection
        client.close()
        
        return True
    except Exception as e:
        logger.error(f"Error clearing backend cache: {e}")
        print(f"❌ Error clearing backend cache: {e}")
        return False

def clear_indexeddb_cache():
    """Clear IndexedDB cache"""
    print("🧹 Clearing IndexedDB Cache...")
    
    # Create a script to clear IndexedDB
    clear_indexeddb_js = """
    // This script needs to be run in a browser context
    // To clear IndexedDB, you can:
    // 1. Open Chrome DevTools (F12)
    // 2. Go to Application > Storage > IndexedDB
    // 3. Right-click and delete the MDRRMODashboard database
    // 4. Or run this in console:
    
    indexedDB.databases().then(databases => {
        databases.forEach(db => {
            if (db.name === 'MDRRMODashboard') {
                console.log('Found MDRRMODashboard database, deleting...');
                const request = indexedDB.deleteDatabase(db.name);
                request.onsuccess = () => console.log('IndexedDB cleared successfully');
                request.onerror = () => console.error('Error clearing IndexedDB');
            }
        });
    });
    """
    
    instructions_path = ROOT_DIR / 'clear_indexeddb_instructions.js'
    with open(instructions_path, 'w') as f:
        f.write(clear_indexeddb_js)
    
    print(f"✅ Created IndexedDB clearing instructions at: {instructions_path}")
    print("📝 Run this script in browser console or manually clear via DevTools")

def main():
    print("🚀 Starting MDRRMO Dashboard Cache Clearer")
    print("=" * 50)
    
    # Clear service worker cache
    clear_service_worker_cache()
    
    # Clear IndexedDB cache
    clear_indexeddb_cache()
    
    # Clear backend cache
    asyncio.run(clear_backend_cache())
    
    print("=" * 50)
    print("🎉 Cache clearing process completed!")
    print("\n📋 Summary:")
    print("1. Service Worker cache clearer created")
    print("2. IndexedDB clearing instructions created")
    print("3. Backend MongoDB cache cleared")
    print("\n💡 Next steps:")
    print("- Open frontend/public/clear-cache.html in your browser")
    print("- Run the IndexedDB clearing script in browser console")
    print("- Restart your backend server if needed")

if __name__ == "__main__":
    main()
