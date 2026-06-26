import httpx
import json
import logging
from datetime import datetime, timedelta, timezone
import isodate
from apscheduler.schedulers.asyncio import AsyncIOScheduler

import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENT = os.getenv("NWS_USER_AGENT", "MyWeatherService/1.0") # NWS requires a descriptive user agent

# Dynamic locations are now stored in Redis and accessed via the locations router.

async def get_nws_gridpoints(lat: float, lon: float):
    url = f"https://api.weather.gov/points/{lat},{lon}"
    headers = {"User-Agent": USER_AGENT}
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            props = data.get("properties", {})
            return props.get("gridId"), props.get("gridX"), props.get("gridY")
        except httpx.HTTPError as exc:
            logger.error(f"Error fetching NWS points for {lat},{lon}: {exc}")
            return None, None, None

async def fetch_nws_grid_data(wfo: str, x: int, y: int):
    """Fetches the raw grid data from NWS."""
    url = f"https://api.weather.gov/gridpoints/{wfo}/{x},{y}"
    headers = {"User-Agent": USER_AGENT}
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"HTTP Exception for {exc.request.url} - {exc}")
            return None

def parse_nws_time(valid_time_str):
    # e.g., "2026-06-23T00:00:00+00:00/PT1H"
    start_str, duration_str = valid_time_str.split('/')
    start_time = datetime.fromisoformat(start_str)
    duration = isodate.parse_duration(duration_str)
    return start_time, start_time + duration

def process_nws_data(raw_data: dict, old_forecast: list = None):
    """
    Parses the GeoJSON NWS data and flattens it into a unified, 
    hour-by-hour timeseries array for the next 168 hours (7 days).
    Optionally prepends up to 24 hours of historical data.
    """
    if not raw_data or 'properties' not in raw_data:
        return []

    props = raw_data['properties']
    
    metrics = [
        "temperature", "dewpoint", "apparentTemperature", 
        "probabilityOfPrecipitation", "relativeHumidity", 
        "skyCover", "windSpeed", "windDirection", 
        "quantitativePrecipitation", "pressure"
    ]
    
    # We want to build an hourly array starting from the current UTC hour
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    
    hourly_data = {}
    for i in range(168): # Pre-fill 168 hours
        hour_time = now + timedelta(hours=i)
        hourly_data[hour_time] = {"timestamp": hour_time.isoformat()}
        
    for metric in metrics:
        metric_data = props.get(metric, {}).get("values", [])
        for item in metric_data:
            valid_time = item.get("validTime")
            val = item.get("value")
            if not valid_time or val is None:
                continue
                
            try:
                start_time, end_time = parse_nws_time(valid_time)
                
                # Apply this value to all hourly buckets that fall within this duration
                for i in range(168):
                    hour_time = now + timedelta(hours=i)
                    if start_time <= hour_time < end_time:
                        hourly_data[hour_time][metric] = val
            except Exception as e:
                logger.error(f"Error parsing time {valid_time}: {e}")
                
    # Extract up to 24 hours of past data from the old forecast
    past_data = []
    if old_forecast:
        cutoff = now - timedelta(hours=24)
        for item in old_forecast:
            try:
                item_time = datetime.fromisoformat(item["timestamp"])
                if cutoff <= item_time < now:
                    item["is_past"] = True
                    past_data.append(item)
            except Exception as e:
                logger.error(f"Error parsing old forecast timestamp: {e}")

    # Combine past data and future 168h block
    result = past_data + [hourly_data[now + timedelta(hours=i)] for i in range(168)]
    return result

async def update_weather_data_for_location(redis_client, loc: dict):
    loc_id = loc.get("name")
    wfo = loc.get("wfo")
    x = loc.get("x")
    y = loc.get("y")
    
    logger.info(f"Fetching data for {loc_id}...")
    raw_data = await fetch_nws_grid_data(wfo, x, y)
    if raw_data:
        old_data_str = await redis_client.get(f"forecast:{loc_id}")
        old_forecast = json.loads(old_data_str) if old_data_str else None
        
        processed_data = process_nws_data(raw_data, old_forecast)
        await redis_client.set(f"forecast:{loc_id}", json.dumps(processed_data))
        logger.info(f"Successfully updated data for {loc_id}")
    else:
        logger.error(f"Failed to fetch data for {loc_id}")

async def update_weather_data(redis_client):
    logger.info("Starting NWS data update cycle...")
    # Fetch dynamic locations from Redis
    locations_data = await redis_client.hgetall("mws:locations")
    
    if not locations_data:
        logger.warning("No locations configured. Skipping NWS update.")
        return
        
    for loc_id, loc_str in locations_data.items():
        try:
            loc = json.loads(loc_str)
            await update_weather_data_for_location(redis_client, loc)
        except Exception as e:
            logger.error(f"Error processing location {loc_id}: {e}")

async def refresh_location_mappings(redis_client):
    logger.info("Starting daily refresh of WFO mappings...")
    locations_data = await redis_client.hgetall("mws:locations")
    
    for loc_id, loc_str in locations_data.items():
        try:
            loc = json.loads(loc_str)
            wfo, x, y = await get_nws_gridpoints(loc["lat"], loc["lon"])
            if wfo and (loc["wfo"] != wfo or loc["x"] != x or loc["y"] != y):
                logger.info(f"Updating WFO mapping for {loc_id}: {loc['wfo']} -> {wfo}, {loc['x']},{loc['y']} -> {x},{y}")
                loc["wfo"] = wfo
                loc["x"] = x
                loc["y"] = y
                await redis_client.hset("mws:locations", loc_id, json.dumps(loc))
        except Exception as e:
            logger.error(f"Error refreshing mapping for {loc_id}: {e}")

def start_nws_scheduler(redis_client):
    scheduler = AsyncIOScheduler()
    
    # Run once immediately
    scheduler.add_job(update_weather_data, args=[redis_client])
    
    # Then schedule to run every hour at 5 minutes past the hour
    scheduler.add_job(update_weather_data, 'cron', minute=5, args=[redis_client])
    
    # Refresh mappings daily at 2:00 AM UTC
    scheduler.add_job(refresh_location_mappings, 'cron', hour=2, minute=0, args=[redis_client])
    
    scheduler.start()
    return scheduler
