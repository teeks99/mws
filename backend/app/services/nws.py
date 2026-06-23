import httpx
import json
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENT = "PersonalWeatherService/1.0 (tk@example.com)" # NWS requires a descriptive user agent

# Let's define some default locations for now (e.g., Seattle, WA and New York, NY)
# We need to map lat/lon to NWS Gridpoints. This is normally a one-time lookup.
# For simplicity, we'll configure gridpoints directly.
# To get gridpoints, make a request to: https://api.weather.gov/points/{lat},{lon}
LOCATIONS = {
    "seattle": {
        "wfo": "SEW",
        "x": 125,
        "y": 68
    },
    "new_york": {
        "wfo": "OKX",
        "x": 33,
        "y": 35
    }
}

async def fetch_nws_grid_data(wfo: str, x: int, y: int):
    """Fetches the raw grid data from NWS."""
    url = f"https://api.weather.gov/gridpoints/{wfo}/{x},{y}"
    headers = {"User-Agent": USER_AGENT}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"HTTP Exception for {exc.request.url} - {exc}")
            return None

def process_nws_data(raw_data: dict):
    """
    Parses the GeoJSON NWS data into a structured time-series format 
    suitable for our frontend charts.
    """
    if not raw_data or 'properties' not in raw_data:
        return {}

    props = raw_data['properties']
    
    # We want to extract timeseries for:
    # temperature, dewpoint, apparentTemperature, probabilityOfPrecipitation, 
    # relativeHumidity, skyCover, windSpeed, windDirection
    
    # A robust implementation would iterate over time and build unified series.
    # For now, we will just return the properties directly to let frontend handle,
    # or build a simple parser here. Let's just return the relevant properties for now.
    
    processed = {
        "temperature": props.get("temperature", {}),
        "dewpoint": props.get("dewpoint", {}),
        "apparentTemperature": props.get("apparentTemperature", {}),
        "probabilityOfPrecipitation": props.get("probabilityOfPrecipitation", {}),
        "relativeHumidity": props.get("relativeHumidity", {}),
        "skyCover": props.get("skyCover", {}),
        "windSpeed": props.get("windSpeed", {}),
        "windDirection": props.get("windDirection", {}),
        "quantitativePrecipitation": props.get("quantitativePrecipitation", {}),
    }
    
    return processed

async def update_weather_data(redis_client):
    logger.info("Starting NWS data update cycle...")
    for loc_id, grid in LOCATIONS.items():
        logger.info(f"Fetching data for {loc_id}...")
        raw_data = await fetch_nws_grid_data(grid["wfo"], grid["x"], grid["y"])
        if raw_data:
            processed_data = process_nws_data(raw_data)
            # Store in Redis
            await redis_client.set(f"forecast:{loc_id}", json.dumps(processed_data))
            logger.info(f"Successfully updated data for {loc_id}")
        else:
            logger.error(f"Failed to fetch data for {loc_id}")

def start_nws_scheduler(redis_client):
    scheduler = AsyncIOScheduler()
    
    # Run once immediately
    scheduler.add_job(update_weather_data, args=[redis_client])
    
    # Then schedule to run every hour at 5 minutes past the hour
    # (NWS typically updates at the top of the hour)
    scheduler.add_job(update_weather_data, 'cron', minute=5, args=[redis_client])
    
    scheduler.start()
    return scheduler
