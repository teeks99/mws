import httpx
import json
import logging
from datetime import datetime, timezone
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

USER_AGENT = os.getenv("NWS_USER_AGENT", "MyWeatherService/1.0")

async def fetch_openmeteo_data(lat: float, lon: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,dew_point_2m,apparent_temperature,precipitation_probability,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure",
        "forecast_days": 16,
        "timezone": "UTC"
    }
    headers = {"User-Agent": USER_AGENT}
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            logger.error(f"Error fetching Open-Meteo data for {lat},{lon}: {exc}")
            return None

def process_openmeteo_data(raw_data: dict):
    if not raw_data or 'hourly' not in raw_data:
        return []
        
    hourly = raw_data['hourly']
    times = hourly.get('time', [])
    
    result = []
    
    # NWS service checks past vs future using `is_past` flag, but Open-Meteo doesn't give us
    # yesterday's data unless we explicitly request `past_days`. 
    # For now, we'll just return everything they gave us and mark anything before `now` as `is_past`.
    now = datetime.now(timezone.utc)
    
    for i in range(len(times)):
        time_str = times[i]
        # Open-meteo returns 'YYYY-MM-DDTHH:MM'. We append Z to make it UTC explicitly.
        dt = datetime.fromisoformat(time_str + "+00:00")
        
        item = {
            "timestamp": dt.isoformat(),
            "is_past": dt < now,
            "temperature": hourly.get("temperature_2m", [])[i] if i < len(hourly.get("temperature_2m", [])) else None,
            "dewpoint": hourly.get("dew_point_2m", [])[i] if i < len(hourly.get("dew_point_2m", [])) else None,
            "apparentTemperature": hourly.get("apparent_temperature", [])[i] if i < len(hourly.get("apparent_temperature", [])) else None,
            "probabilityOfPrecipitation": hourly.get("precipitation_probability", [])[i] if i < len(hourly.get("precipitation_probability", [])) else None,
            "relativeHumidity": hourly.get("relative_humidity_2m", [])[i] if i < len(hourly.get("relative_humidity_2m", [])) else None,
            "skyCover": hourly.get("cloud_cover", [])[i] if i < len(hourly.get("cloud_cover", [])) else None,
            "windSpeed": hourly.get("wind_speed_10m", [])[i] if i < len(hourly.get("wind_speed_10m", [])) else None,
            "windDirection": hourly.get("wind_direction_10m", [])[i] if i < len(hourly.get("wind_direction_10m", [])) else None,
            "quantitativePrecipitation": hourly.get("precipitation", [])[i] if i < len(hourly.get("precipitation", [])) else None,
            "pressure": hourly.get("surface_pressure", [])[i] if i < len(hourly.get("surface_pressure", [])) else None,
        }
        result.append(item)
        
    return result

async def update_openmeteo_for_location(redis_client, loc: dict):
    loc_id = loc.get("name")
    logger.info(f"Fetching Open-Meteo data for {loc_id}...")
    
    raw_data = await fetch_openmeteo_data(loc["lat"], loc["lon"])
    if raw_data:
        processed_data = process_openmeteo_data(raw_data)
        await redis_client.set(f"forecast:open-meteo:{loc_id}", json.dumps(processed_data))
        logger.info(f"Successfully updated Open-Meteo data for {loc_id}")
    else:
        logger.error(f"Failed to fetch Open-Meteo data for {loc_id}")

async def update_openmeteo_data(redis_client):
    logger.info("Starting Open-Meteo data update cycle...")
    locations_data = await redis_client.hgetall("mws:locations")
    
    if not locations_data:
        logger.warning("No locations configured. Skipping Open-Meteo update.")
        return
        
    for loc_id, loc_str in locations_data.items():
        try:
            loc = json.loads(loc_str)
            await update_openmeteo_for_location(redis_client, loc)
        except Exception as e:
            logger.error(f"Error processing location {loc_id}: {e}")

def start_openmeteo_scheduler(scheduler, redis_client):
    # We can reuse the AsyncIOScheduler from main.py if passed in, or we can just 
    # add jobs to the existing scheduler. It's better to pass the scheduler.
    scheduler.add_job(update_openmeteo_data, args=[redis_client])
    scheduler.add_job(update_openmeteo_data, 'cron', minute=10, args=[redis_client])
