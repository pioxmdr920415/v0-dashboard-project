from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== Models ====================
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class CacheData(BaseModel):
    resource_type: str
    resource_id: str
    data: Dict[str, Any]
    cached_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== Backend Cache Management ====================
# Google API calls are now handled directly in the frontend
# Backend only manages cache storage and retrieval


# ==================== Caching Functions ====================
async def cache_resource(resource_type: str, resource_id: str, data: Any):
    """Cache resource data to MongoDB"""
    try:
        cache_doc = {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'data': data,
            'cached_at': datetime.now(timezone.utc).isoformat()
        }
        
        await db.cache.update_one(
            {'resource_type': resource_type, 'resource_id': resource_id},
            {'$set': cache_doc},
            upsert=True
        )
        logger.info(f"Cached {resource_type}: {resource_id}")
    except Exception as e:
        logger.error(f"Error caching resource: {e}")


async def get_cached_resource(resource_type: str, resource_id: str) -> Optional[Dict[str, Any]]:
    """Get cached resource from MongoDB"""
    try:
        cache_doc = await db.cache.find_one(
            {'resource_type': resource_type, 'resource_id': resource_id},
            {'_id': 0}
        )
        return cache_doc
    except Exception as e:
        logger.error(f"Error getting cached resource: {e}")
        return None


# ==================== API Routes ====================

@api_router.get("/")
async def root():
    return {"message": "MDRRMO Dashboard API"}


@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ==================== Cache API Routes ====================
# These routes are for storing/retrieving cached data from frontend

@api_router.post("/cache/sheets")
async def save_sheet_cache(sheet_name: str, data: List[Dict[str, Any]]):
    """Save sheet data to cache (called from frontend)"""
    try:
        await cache_resource('sheet', sheet_name, data)
        return {
            'success': True,
            'message': 'Sheet data cached successfully',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cache sheet data: {str(e)}")


@api_router.get("/cache/sheets/{sheet_name}")
async def get_cached_sheet_data(sheet_name: str):
    """Get cached sheet data for offline access"""
    cached = await get_cached_resource('sheet', sheet_name)
    
    if not cached:
        raise HTTPException(status_code=404, detail="No cached data available")
    
    return {
        'success': True,
        'data': cached.get('data', []),
        'cached_at': cached.get('cached_at'),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/cache/drive")
async def save_drive_cache(folder_id: str, data: Dict[str, Any]):
    """Save drive folder data to cache (called from frontend)"""
    try:
        await cache_resource('drive_folder', folder_id, data)
        return {
            'success': True,
            'message': 'Drive data cached successfully',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cache drive data: {str(e)}")


@api_router.get("/cache/drive/folder/{folder_id}")
async def get_cached_drive_folder(folder_id: str):
    """Get cached Drive folder data for offline access"""
    cached = await get_cached_resource('drive_folder', folder_id)
    
    if not cached:
        raise HTTPException(status_code=404, detail="No cached data available")
    
    return {
        'success': True,
        'data': cached.get('data', {'folders': [], 'files': []}),
        'cached_at': cached.get('cached_at'),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


# ==================== Data Sync Status (No longer syncs from backend) ====================

@api_router.get("/cache/status")
async def get_cache_status():
    """Get cache status and last sync times"""
    try:
        cached_items = await db.cache.find({}, {'_id': 0, 'resource_type': 1, 'resource_id': 1, 'cached_at': 1}).to_list(100)
        
        return {
            'success': True,
            'cached_items': cached_items,
            'total_cached': len(cached_items),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache status: {str(e)}")


# ==================== Status Check Routes (Original) ====================

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
