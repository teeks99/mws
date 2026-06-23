from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import os
from contextlib import asynccontextmanager
from app.services.nws import start_nws_scheduler

redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_client = redis.from_url(redis_url, decode_responses=True)
    
    # Start background scheduler for NWS data
    scheduler = start_nws_scheduler(redis_client)
    
    yield
    
    # Clean up
    scheduler.shutdown()
    await redis_client.aclose()

app = FastAPI(lifespan=lifespan, title="Personal Weather Service API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Personal Weather Service API"}

@app.get("/api/forecast/{location_id}")
async def get_forecast(location_id: str):
    """
    Retrieve the cached forecast for a given location.
    """
    if not redis_client:
        return {"error": "Redis client not initialized"}
    
    data = await redis_client.get(f"forecast:{location_id}")
    if data:
        # Assuming the data is stored as a JSON string
        import json
        return json.loads(data)
    
    return {"error": "Forecast not found for this location"}
