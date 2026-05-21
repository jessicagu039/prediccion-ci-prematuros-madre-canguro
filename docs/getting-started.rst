Getting started
===============

Esta guía explica cómo poner en marcha el proyecto desde cero.

Configuración del backend
-------------------------

1. Ir a la carpeta del backend:

```powershell
cd api
```

2. Crear y activar el entorno virtual:

```powershell
python -m venv .venv
. .venv\Scripts\Activate.ps1
```

3. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

4. Iniciar el servidor:

```powershell
python run_server.py
```

El backend quedará disponible en `http://localhost:8000`.

Configuración del frontend
--------------------------

1. Desde la raíz del repositorio:

```powershell
npm install
```

2. Iniciar el frontend:

```powershell
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

.. note::
   El frontend usa por defecto la URL remota original. Solo es necesario pasar
   `VITE_API_URL=http://localhost:8000` cuando el backend se ejecuta localmente o dentro de Docker.

3. Abrir `http://localhost:3000` en el navegador.

Endpoints principales
~~~~~~~~~~~~~~~~~~~~~~

- `GET /health`
- `POST /api/predecir`
- `GET /api/modelo-info`
- `GET /api/threshold-table`
- `GET /api/pca-clusters`
- `GET /api/cluster-domain-analysis`
- `GET /api/debug-bundles`

Carga de JSON
~~~~~~~~~~~~~~

El frontend permite subir un archivo JSON con los datos clínicos del paciente.
El ejemplo de referencia se encuentra en `example_caso_clinico_riesgo.json` en la raíz del repositorio.

.. note::
   `example_caso_clinico_riesgo.json` contiene datos ficticios de ejemplo y no viola la confidencialidad.

Documentación relacionada
-------------------------

- `docs/clustering.rst` para análisis de clustering.
- `docs/predictive-model.rst` para el flujo de inferencia.
- `docs/architecture.rst` para detalles de arquitectura.

Docker
------

Para ejecutar el stack con Docker:

```powershell
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

Notas
-----

- `api/.venv`, `venv/`, `node_modules/` y `dist/` no deben subirse al repositorio.
- Mantén los modelos `.joblib` dentro de `api/`.
