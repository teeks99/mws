# My Weather Service

The goal of this project is to have a service that pulls data from the US National Weather Service's copious available resources, for my specific location(s). It keeps them fresh and ready to rapidly serve up when I check from an app/web client.

## Architecture Overview

This project is split into two tightly integrated microservices:

* **Backend (Python / FastAPI / Redis)**: A high-performance, background-polling worker that continuously pulls and normalizes forecast data from the NWS API. It caches a flattened, hour-by-hour 7-day forecast dataset directly in Redis, ensuring that when you open the app, your weather data loads in milliseconds without hitting external rate limits.
* **Frontend (React / Vite / ECharts)**: A modern, glassmorphic React dashboard featuring dark/light modes and responsive client-side routing. It relies heavily on Apache ECharts to instantly plot the dense 168-hour timeseries data arrays returned by the backend into beautiful, synchronized, zoomable data visualizations.

## Deployment Instructions

### 1. Environment Setup
Create a `.env` file in the root directory (alongside `docker-compose.yml`) to secure your API routes:
```env
ADMIN_API_KEY=your_super_secret_password_here
NWS_USER_AGENT="MyWeatherService/1.0 (you@example.com)"
```

### 2. Booting the Servers
Start the entire stack using Docker Compose:
```bash
docker compose up -d
```
This boots the Frontend on port `5125` and the Backend API on port `5126`.

### 3. Reverse Proxy Configuration
To host this securely on your own domain over HTTPS, you'll want to place a reverse proxy in front of the Docker containers. By routing `/api/` traffic directly to the backend container, external clients (like mobile apps) can interact with your API without loading the frontend.

#### Apache Snippet
```apache
<VirtualHost *:443>
    ServerName mws.yourdomain.com

    # Update with your SSL certificate paths (e.g., Let's Encrypt)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/mws.yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/mws.yourdomain.com/privkey.pem

    ProxyPreserveHost On

    # Route API traffic directly to the backend container (Port 5126)
    ProxyPass /api/ http://localhost:5126/api/
    ProxyPassReverse /api/ http://localhost:5126/api/

    # Route all other UI traffic to the frontend container (Port 5125)
    ProxyPass / http://localhost:5125/
    ProxyPassReverse / http://localhost:5125/
</VirtualHost>
```

#### Nginx Snippet
```nginx
server {
    listen 443 ssl;
    server_name mws.yourdomain.com;

    # Update with your SSL certificate paths
    ssl_certificate /etc/letsencrypt/live/mws.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mws.yourdomain.com/privkey.pem;

    # Route API traffic directly to the backend container (Port 5126)
    location /api/ {
        proxy_pass http://localhost:5126/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Route all other UI traffic to the frontend container (Port 5125)
    location / {
        proxy_pass http://localhost:5125/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
