from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
import os
import httpx
import json
import app.main as main_app # to access redis_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/locations",
    tags=["locations"],
)

class LocationCreate(BaseModel):
    name: str # e.g., "seattle"
    lat: float
    lon: float

class Location(LocationCreate):
    wfo: str
    x: int
    y: int

from app.services.nws import get_nws_gridpoints

def get_api_key(x_api_key: str = Header(None)):
    expected_key = os.getenv("ADMIN_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_API_KEY is not configured on the server."
        )
    if x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return x_api_key

from typing import List

@router.get("/", response_model=List[Location])
async def list_locations():
    """List all stored locations."""
    if not main_app.redis_client:
        raise HTTPException(status_code=500, detail="Redis not initialized")
    
    locations = await main_app.redis_client.hgetall("mws:locations")
    result = []
    for name, data_str in locations.items():
        try:
            result.append(json.loads(data_str))
        except json.JSONDecodeError:
            continue
    return result

@router.post("/", response_model=Location)
async def add_location(location: LocationCreate, api_key: str = Depends(get_api_key)):
    """Add a new location by lat/lon."""
    if not main_app.redis_client:
        raise HTTPException(status_code=500, detail="Redis not initialized")
    
    wfo, x, y, astro = await get_nws_gridpoints(location.lat, location.lon)
    if not wfo or x is None or y is None:
        raise HTTPException(status_code=400, detail="Could not determine NWS grid points for these coordinates. Are they in the US?")
    
    loc_data = Location(
        name=location.name,
        lat=location.lat,
        lon=location.lon,
        wfo=wfo,
        x=x,
        y=y
    )
    
    # Store in Redis hash
    await main_app.redis_client.hset(
        "mws:locations",
        location.name,
        json.dumps(loc_data.model_dump())
    )
    if astro:
        await main_app.redis_client.set(f"astro:{location.name}", json.dumps(astro))
    
    # Optionally trigger an immediate NWS fetch for this location
    from app.services.nws import update_weather_data_for_location
    from app.services.openmeteo import update_openmeteo_for_location
    await update_weather_data_for_location(main_app.redis_client, loc_data.model_dump())
    await update_openmeteo_for_location(main_app.redis_client, loc_data.model_dump())

    return loc_data

@router.delete("/{name}")
async def remove_location(name: str, api_key: str = Depends(get_api_key)):
    """Remove a stored location."""
    if not main_app.redis_client:
        raise HTTPException(status_code=500, detail="Redis not initialized")
    
    deleted = await main_app.redis_client.hdel("mws:locations", name)
    if not deleted:
        raise HTTPException(status_code=404, detail="Location not found")
        
    # Also delete the cached forecast and astronomy data
    await main_app.redis_client.delete(f"forecast:nws:{name}")
    await main_app.redis_client.delete(f"forecast:open-meteo:{name}")
    await main_app.redis_client.delete(f"astro:{name}")
    
    return {"message": f"Location '{name}' removed"}
