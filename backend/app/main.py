from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import os
from contextlib import asynccontextmanager
from app.services.nws import start_nws_scheduler
from pydantic import BaseModel, Field
from typing import List, Optional

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

from app.routers import locations

app = FastAPI(
    lifespan=lifespan, 
    title="My Weather Service API",
    description="API for retrieving heavily cached, flattened weather forecasts from the NWS."
)

class HourlyForecast(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 timestamp for this hourly bucket in UTC.")
    is_past: Optional[bool] = Field(False, description="True if this is historical data from a previous fetch.")
    temperature: Optional[float] = Field(None, description="Temperature in Degrees Celsius (°C).")
    dewpoint: Optional[float] = Field(None, description="Dewpoint in Degrees Celsius (°C).")
    apparentTemperature: Optional[float] = Field(None, description="Apparent Temperature (Feels Like) in Degrees Celsius (°C).")
    probabilityOfPrecipitation: Optional[float] = Field(None, description="Probability of Precipitation in Percent (%).")
    relativeHumidity: Optional[float] = Field(None, description="Relative Humidity in Percent (%).")
    skyCover: Optional[float] = Field(None, description="Cloud Cover in Percent (%).")
    windSpeed: Optional[float] = Field(None, description="Wind Speed in Kilometers per hour (km/h).")
    windDirection: Optional[float] = Field(None, description="Wind Direction in Degrees (Angle from true North, 0-360).")
    quantitativePrecipitation: Optional[float] = Field(None, description="Amount of Precipitation in Millimeters (mm).")
    pressure: Optional[float] = Field(None, description="Atmospheric Pressure.")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(locations.router)

@app.get("/")
async def root():
    return {"message": "Welcome to My Weather Service API"}

@app.get("/api/forecast/{name}", response_model=List[HourlyForecast])
async def get_forecast(name: str):
    """
    Retrieve the cached, hourly forecast for a given location.
    
    The API returns 168 hours (7 days) of flattened timeseries data.
    """
    if not redis_client:
        return {"error": "Redis client not initialized"}
    
    data = await redis_client.get(f"forecast:{name}")
    if data:
        # Assuming the data is stored as a JSON string
        import json
        return json.loads(data)
    
    return {"error": "Forecast not found for this location"}
