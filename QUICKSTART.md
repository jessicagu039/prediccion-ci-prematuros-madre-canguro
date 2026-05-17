# Quickstart

Guía rápida para levantar el proyecto en desarrollo local y con Docker.

## Requisitos previos

- Python 3.8+ (se recomienda 3.11)
- Node 20+ y npm
- Git
- Docker y Docker Compose (opcional)

## Clonar el repositorio

```powershell
git clone <repo-url>
cd <repo-folder>
```

## Desarrollo local

### Backend

```powershell
cd api
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Ejecutar el backend

```powershell
cd api
python run_server.py
```

El backend estará disponible en `http://localhost:8000`.

### Frontend

En otra terminal, desde la raíz del repositorio:

```powershell
npm install
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

El frontend debería abrirse en `http://localhost:3000`.

## Verificar la instalación

```powershell
curl http://localhost:8000/health
```

Abrir `http://localhost:3000` en el navegador.

## Carga de JSON

El frontend permite subir un archivo `.json` con los datos clínicos del paciente.
Usa `example_caso_clinico_riesgo.json` como referencia de la arquitectura de datos.

> Nota: `example_caso_clinico_riesgo.json` contiene datos de ejemplo inventados y no viola ningún requisito de confidencialidad.

## Docker

Para levantar el stack completo con Docker:

```powershell
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

> No uses `http://api:8000` desde el navegador; ese host solo existe dentro de la red de Docker.

## Endpoints relevantes

- `GET /health`
- `POST /api/predecir`
- `GET /api/modelo-info`
- `GET /api/threshold-table`
- `GET /api/pca-clusters`
- `GET /api/cluster-domain-analysis`
- `GET /api/debug-bundles`

## Notas

- Mantén los modelos `joblib` en la carpeta `api/`.
- No incluyas archivos de entorno ni dependencias instaladas en el repositorio.
