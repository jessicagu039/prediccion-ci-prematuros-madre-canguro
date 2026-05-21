# Docker Build Reference

## Overview

Esta carpeta contiene configuración de nginx para el frontend en Docker.

## Dockerfiles

### Stack Completo (Recomendado)

**Archivo:** `docker-compose.yml` en la raíz

Monta backend + frontend con orquestación automática:

```bash
docker compose up --build
```

**Acceso:**
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

### Backend Only

**Archivo:** `Dockerfile.backend` en la raíz

Para builds independientes del backend:

```bash
docker build -f Dockerfile.backend -t mi-backend:latest .
docker run -p 8000:8000 mi-backend:latest
```

**Acceso:**
- Backend: `http://localhost:8000`

### Frontend Only

**Archivo:** `Dockerfile.frontend` en la raíz

Para builds independientes del frontend:

```bash
docker build -f Dockerfile.frontend -t mi-frontend:latest .
docker run -p 3000:80 -e VITE_API_URL=http://backend:8000 mi-frontend:latest
```

**Acceso:**
- Frontend: `http://localhost:3000`

## Archivos

- `nginx/default.conf` — Configuración de Nginx para SPA (Single Page Application)
- `frontend-entrypoint.sh` — Script de inicialización que inyecta variables de entorno en runtime

## Variables de Entorno

### Backend

- `API_HOST` (default: `0.0.0.0`) — Host de escucha
- `API_PORT` (default: `8000`) — Puerto de escucha

### Frontend

- `VITE_API_URL` (default: `https://44.201.230.38.nip.io`) — URL del backend en build time
- Se convierte a `window.__API_URL` en runtime (inyectado por `frontend-entrypoint.sh`)

## Notas

- El backend necesita los modelos `joblib` en `api/`
- El frontend se construye con Vite + React
- Nginx actúa como reverse proxy en Docker para el frontend
- El `frontend-entrypoint.sh` genera dinámicamente `env-config.js` para configuración en runtime
