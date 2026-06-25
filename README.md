# My Weather Service

The goal of this project is to have a service that pulls data from the US National Weather Service's copious available resources, for my specific location(s). It keeps them fresh and ready to rapidly serve up when I check from an app/web client.

## Architecture Overview

This project is split into two tightly integrated microservices:

* **Backend (Python / FastAPI / Redis)**: A high-performance, background-polling worker that continuously pulls and normalizes forecast data from the NWS API. It caches a flattened, hour-by-hour 7-day forecast dataset directly in Redis, ensuring that when you open the app, your weather data loads in milliseconds without hitting external rate limits.
* **Frontend (React / Vite / ECharts)**: A modern, glassmorphic React dashboard featuring dark/light modes and responsive client-side routing. It relies heavily on Apache ECharts to instantly plot the dense 168-hour timeseries data arrays returned by the backend into beautiful, synchronized, zoomable data visualizations.
