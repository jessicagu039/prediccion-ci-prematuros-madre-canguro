# Predicción CI Prematuros - Método Madre Canguro

Esta plataforma integra un backend de inferencia clínica con FastAPI y un frontend interactivo en React/Vite para visualizar predicciones, explicabilidad SHAP y análisis de clustering.

## Contenido del repositorio

- `api/`: backend FastAPI, cargas de modelos `joblib`, endpoints de inferencia y análisis.
- `app/`: datos procesados y utilidades de aplicación.
- `src/`: frontend React/Vite.
- `data/`: datos `raw`, `interim` y `processed`.
- `models/`: artefactos y modelos entrenados.
- `notebooks/`: exploración, clustering y validación en Jupyter.
- `docs/`: documentación técnica Sphinx.
- `REPO_DOCUMENTATION.md`: documentación complementaria.
- `requirements.txt`: dependencias Python.
- `package.json`: dependencias y scripts frontend.
- `Makefile`: comandos de soporte y sincronización.
- `setup.py`: configuración del paquete Python instalable.
- `tox.ini`: configuración de pruebas y calidad.

## Componentes clave

- Backend: `api/main.py`
- Frontend: `src/App.jsx`
- Bundles de modelo:
  - `api/kmc20_model_bundle_calibrated.joblib`
  - `api/m8_modelo_binary_best.joblib`
  - `api/m9_tap_bundle.joblib`
  - `api/m10_cvlt_bundle.joblib`
- Datos de análisis y clusters:
  - `app/data/processed/kmc_dataset_procesado_completo.csv`
  - `app/data/processed/clusters_GOi.csv`

## Inicio rápido

### 1. Preparar el backend

```powershell
cd api
python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Ejecutar el backend

```powershell
cd api
python run_server.py
```

### 3. Preparar el frontend

```powershell
cd ..
npm install
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

> Nota: el frontend usa por defecto la URL remota original. Solo es necesario pasar `VITE_API_URL=http://localhost:8000` cuando el backend se ejecuta localmente o dentro de Docker.

### 4. Verificar la instalación

- `http://localhost:8000/health`
- `http://localhost:3000`

## Carga de JSON

El frontend permite subir un JSON clínico que se mapea a los campos del formulario.
Hay un ejemplo de referencia en `example_caso_clinico_riesgo.json` con la estructura aceptada.

> Nota: los datos de `example_caso_clinico_riesgo.json` son ficticios y de ejemplo; no contienen información real ni violan la confidencialidad.

La estructura mínima incluye campos como:

- `pc_nacer_mm`
- `eg_semanas`
- `pc_40sem_cm`
- `dias_oxigeno`
- `educ_materna`
- `griffiths_auditivo`

También se aceptan campos opcionales como:

- `grupo`
- `horas_canguro`
- `dias_hospitalizacion`
- `fototerapia`
- `ingreso_percapita`
- `griffiths_motor`
- `griffiths_general`
- `peso_12m_g`
- `talla_12m_cm`
- `griffiths_loco12`

El formulario acepta tanto los nombres actuales como algunos antiguos equivalentes,
por ejemplo `pc_nacer` o `peso_nacer` en lugar de `pc_nacer_mm` y `peso_nacer_g`.

## Docker

### Stack completo (Backend + Frontend)

```powershell
docker compose up --build
```

### Solo backend

```powershell
docker build -f Dockerfile.backend -t mi-backend:latest .
docker run -p 8000:8000 mi-backend:latest
```

## Documentación

- `docs/`: sitio de documentación Sphinx.
- `QUICKSTART.md`: guía de inicio rápido.
- `REPO_DOCUMENTATION.md`: resumen de arquitectura y flujo.

## Buenas prácticas

- No subir entornos virtuales (`venv/`, `.venv/`).
- No subir dependencias de Node (`node_modules/`).
- Mantener `dist/` y `docs/_build/` fuera del repositorio.
