Arquitectura del sistema
=======================

Este documento describe la arquitectura del proyecto, sus componentes principales y el flujo de datos.

Diagrama de componentes
-----------------------

.. code-block:: mermaid

   flowchart LR
     subgraph Frontend
       A[React + Vite]\n       A2[src/]
     end
     subgraph Backend
       B[FastAPI]\n       B2[api/main.py]
     end
     Data[app/data/ + data/]
     Models[api/*.joblib + models/]
     Notebooks[notebooks/]
     Storage["Artefactos / S3 / Filesystem"]

     A -->|HTTP/JSON| B
     B -->|lee/escribe| Data
     B -->|carga| Models
     Notebooks -->|genera| Models
     Notebooks -->|produce| Data
     B -->|logs/métricas| Observability

Componentes clave
-----------------

- **Frontend (`src/`)**
  - Dashboard React.
  - Consume endpoints REST del backend.
  - Visualiza resultados, SHAP y clustering.
- **Backend (`api/main.py`)**
  - Exposición de endpoints FastAPI.
  - Carga bundles `joblib` en background.
  - Calcula predicciones globales y por dominio.
- **Datos (`app/data/`, `data/`)**
  - `raw/`: datos de origen.
  - `interim/`: datos transformados.
  - `processed/`: datos listos para análisis.
- **Modelos**
  - Bundles con `feature_cols`, `threshold` y metadata.
  - Se almacenan como artefactos reproducibles.
- **Notebooks**
  - Documentan selección de variables y definición de clusters.

Flujo de trabajo
----------------

1. Los notebooks generan artefactos y definiciones de variables.
2. Los bundles se serializan como `joblib` en `api/`.
3. El backend carga los bundles al iniciar.
4. El frontend solicita predicciones y datos de cluster.
5. El backend devuelve resultados y explicaciones SHAP.

Endpoints principales
---------------------

- `GET /health`
- `POST /api/predecir`
- `GET /api/modelo-info`
- `GET /api/threshold-table`
- `GET /api/pca-clusters`
- `GET /api/cluster-domain-analysis`
- `GET /api/debug-bundles`

Buenas prácticas
----------------

- Mantener `api/.venv`, `venv/`, `node_modules/`, `dist/` y `docs/_build/` fuera del control de versiones.
- Guardar modelos y artefactos reproducibles en `api/` y `models/`.
- Mantener documentación técnica en `docs/` y resúmenes en `REPO_DOCUMENTATION.md`.

Referencias
-----------

- `docs/predictive-model.rst`: inferencia y modelo.
- `docs/clustering.rst`: análisis de clustering.
- `docs/getting-started.rst`: guía de arranque.
