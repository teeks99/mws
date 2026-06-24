# Personal Weather Service Backend API

This backend is built with FastAPI and Redis. It provides a highly cached, extremely fast API to retrieve flattened, hour-by-hour weather forecasts.

## Base URL
`http://localhost:8000`

## Units of Measurement

All data is natively pulled from the National Weather Service (NWS) API. The NWS standardizes its grid data using the metric system. The backend currently passes these raw metric values directly to the frontend. 

*If imperial units (Fahrenheit, MPH) are desired, the conversion should typically happen on the frontend during rendering.*

| Measurement | Key in JSON | Unit |
| :--- | :--- | :--- |
| **Temperature** | `temperature` | Degrees Celsius (°C) |
| **Dewpoint** | `dewpoint` | Degrees Celsius (°C) |
| **Feels Like** | `apparentTemperature` | Degrees Celsius (°C) |
| **Precipitation Chance** | `probabilityOfPrecipitation` | Percent (%) |
| **Relative Humidity** | `relativeHumidity` | Percent (%) |
| **Cloud Cover** | `skyCover` | Percent (%) |
| **Wind Speed** | `windSpeed` | Kilometers per hour (km/h) |
| **Wind Direction** | `windDirection` | Degrees (Angle from true North, 0-360) |
| **Precipitation Amount** | `quantitativePrecipitation` | Millimeters (mm) |

## Endpoints

### 1. `GET /api/forecast/{name}`
Returns a flattened array of 72 hourly forecast buckets for the specified location.

### 2. `GET /api/locations/`
Lists all tracked locations.

### 3. `POST /api/locations/`
Adds a new tracking location. Requires header `x-api-key`.
**Body:** `{"name": "seattle", "lat": 47.6, "lon": -122.3}`

### 4. `DELETE /api/locations/{name}`
Deletes a tracking location. Requires header `x-api-key`.
