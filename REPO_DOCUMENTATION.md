# Documentación del Repositorio

## 1. Visión general del proyecto

Este repositorio es una plataforma de investigación y análisis para el proyecto de predicción de insuficiencia cognitiva en prematuros del método madre canguro. Combina un backend de análisis y predicción con un frontend interactivo y visualizaciones nativas en lugar de gráficos estáticos, junto con datos procesados, notebooks de exploración y documentación técnica.

## 2. Estructura del repositorio

- `README.md`: descripción general del proyecto y estructura estándar de un proyecto de ciencia de datos.
- `Dockerfile`: definición del contenedor para despliegue o ejecución reproducible.
- `Makefile`: comandos de automatización para flujo de datos, entrenamiento o pruebas.
- `package.json`: dependencias y scripts del frontend React/Vite.
- `requirements.txt`: dependencias Python generales.
- `setup.py`: configuración pip instalable para el paquete Python `src`.
- `tox.ini`: configuración del entorno de pruebas y calidad.
- `docs/`: documentación Sphinx del proyecto.
- `data/`: datos en varias etapas de procesamiento:
  - `raw/`: datos originales sin procesar.
  - `interim/`: datos transformados parcialmente.
  - `processed/`: datos finales listos para modelado.
- `models/`: modelos entrenados y artefactos resultantes.
- `notebooks/`: análisis exploratorio, clustering y modelado en Jupyter.
- `app/`: aplicación Python y datos procesados adicionales utilizados por el backend.
- `api/`: backend FastAPI con endpoints de inferencia, SHAP, PCA y análisis de clustering.
- `src/`: frontend React/Vite con la interfaz del dashboard y gráficos generados a partir de datos JSON del backend.

## Arquitectura

Una visión de alto nivel de los componentes del proyecto, su responsabilidad y el flujo de datos.

```mermaid
flowchart LR
  subgraph Frontend
    A[React + Vite (src/)]
  end
  subgraph Backend
    B[FastAPI (api/main.py)]
  end
  Data[(app/data/, data/)]
  Models[(models/ + bundles *.joblib)]
  Notebooks[notebooks/]
  Storage[(Artefactos: S3 / Filesystem / Registry)]

  A -->|HTTP/JSON| B
  B -->|read/write| Data
  B -->|load model bundles| Models
  Notebooks -->|produce artifacts| Models
  Notebooks -->|produce datasets| Data
  Models --> Storage
  B -->|metrics/logs| Observability((Logs / Metrics / Tracing))
```

Responsabilidades clave:

- **Frontend**: UI, visualizaciones (PCA), formularios de predicción.
- **Backend**: inferencia, endpoints de análisis y carga de bundles.
- **Data**: raw → interim → processed; validaciones de esquema.
- **Models**: artefactos versionados con metadata (`feature_cols`, `threshold`, `model_version`).
- **Notebooks**: fuente de verdad para selección de variables y generación de artefactos.

Ver `docs/architecture.rst` para la especificación completa.

## 3. Backend

### 3.1 `api/main.py`

El backend está implementado con FastAPI y expone servicios para:

- `/health`: estado de carga de los modelos y estado general del servidor.
- `/api/predecir`: punto de inferencia principal que recibe datos de paciente y devuelve:
  - predicción global `global`
  - predicciones por dominio `dominios` (`wasi`, `tap`, `cvlt`)
  - explicación SHAP `shap` como objeto JSON con `top_risk_factors` y `top_protective`
  - metadatos de completitud e imputación
- `/api/modelo-info`: información del bundle global cargado.
- `/api/threshold-table`: tabla de umbrales calibrados desde `kmc20_threshold_table_calibrated.json`.
- `/api/debug-bundles`: diagnostica los bundles cargados y su estructura interna.
- `/api/pca-clusters`: devuelve datos PCA para graficar la proyección de clusters.
- `/api/cluster-domain-analysis`: genera análisis de dominio para clustering CVLT/TAP/WASI.

### 3.2 Modelos y bundles

El servidor carga bundles serializados con `joblib` desde el directorio raíz:

- `kmc20_model_bundle_calibrated.joblib` → modelo global
- `m8_modelo_binary_best.joblib` → modelo WASI
- `m9_tap_bundle.joblib` → modelo TAP
- `m10_cvlt_bundle.joblib` → modelo CVLT

Hay soporte para carga en background y control de estado de carga a través de la ruta `/health`.

### 3.3 Análisis de clustering por dominio

El backend incluye metadatos de análisis de dominio para tres variantes:

- `cvlt`: 8 variables de memoria verbal usadas para agrupar perfiles CVLT.
- `tap`: 6 variables de atención y memoria de trabajo.
- `wasi`: un solo indicador WASI FSIQ.

Estas variantes están documentadas en `CLUSTER_DOMAIN_VARIANTS` en `api/main.py` y hacen posible:

- cargar datos de clusters desde `app/data/processed/clusters_GOi.csv`
- calcular porcentajes de cada cluster
- generar análisis estadístico por dominio

## 4. Frontend

### 4.1 `src/App.jsx`

El frontend es una aplicación React creada con Vite. Contiene:

- configuración de API en `API_URL`.
- componentes de UI para formularios, resultados, evidencia científica y análisis.
- cards de dominio y paneles de análisis diná-mico que renderizan gráficos nativos a partir de datos JSON.
- lógica para consumir endpoints de backend como `/api/predecir`, `/api/cluster-domain-analysis` y `/api/pca-clusters`.

### 4.2 Dependencias principales

- `react`
- `react-dom`
- `lucide-react`
- `vite`
- `tailwindcss`
- `eslint`

### 4.3 Recursos de evidencia

El frontend hace referencia a imágenes de evidencia científica en `src/assets/evidencia/`. Si alguna imagen falta, el componente muestra un marcador y sugiere exportar el gráfico desde Databricks.

## 5. Datos y notebooks

### 5.1 Datos procesados

- `app/data/processed/kmc_dataset_procesado_completo.csv`: conjunto de datos completo preprocesado.
- `app/data/processed/clusters_GOi.csv`: etiquetas de cluster GO-i usadas para análisis y PCA.

### 5.2 Notebooks clave

- `notebooks/kmc20_model_bundle_calibrated.joblib`
- `notebooks/kmc20_shap_reference_calibrated.json`
- `notebooks/kmc20_threshold_table_calibrated.json`
- `notebooks/clustering-models/Clustering_CVLT_GOi_v1.ipynb`
- `notebooks/clustering-models/Clustering_TAP_GOi_v1.ipynb`
- `notebooks/clustering-models/Clustering_WASI_GOi_v1.ipynb`
- `notebooks/Modelo Predictivo Global Version 2 calibrated.ipynb`

Los notebooks contienen análisis de cluster, exploración de variables y comparaciones de rendimiento entre modelos.

## 6. Profundidad técnica de ML

### 6.1 Modelos y artefactos

- El backend carga bundles serializados `joblib` desde el directorio raíz:
  - `kmc20_model_bundle_calibrated.joblib` → modelo global de predicción
  - `m8_modelo_binary_best.joblib` → dominio WASI
  - `m9_tap_bundle.joblib` → dominio TAP
  - `m10_cvlt_bundle.joblib` → dominio CVLT
- Los bundles pueden contener combinaciones de:
  - `clf` o `clf_raw` (clasificador XGBoost)
  - `imputer` (SimpleImputer)
  - `scaler` (StandardScaler)
  - `feature_cols` y `threshold`
- La función `run_bundle()` admite bundles con predict directo o bundles que requieren transformación manual de imputación y escalado.

### 6.1.1 Modelo predictivo global y dominios

- El endpoint principal de inferencia es `/api/predecir`.
- `build_feature_dict()` genera el conjunto de 20+ variables de entrada que alimentan los modelos XGBoost.
- El flujo de inferencia para cada modelo es:
  1. cargar el bundle correspondiente (`global`, `wasi`, `tap`, `cvlt`)
  2. extraer `feature_cols` y construir la fila de entrada
  3. imputar valores faltantes con `imputer` si está presente
  4. escalar con `scaler` si está presente
  5. calcular la probabilidad con `clf.predict_proba()`
- Los bundles pueden contener `clf_cal` (clasificador calibrado) o `clf_raw`.
- La predicción final produce:
  - `probabilidad` (porcentaje de riesgo)
  - `nivel` (`Alto Riesgo`, `Riesgo Moderado`, `Bajo Riesgo`)
  - `alert_level`
  - `above_threshold`
  - `threshold_usado`
  - `calibrado`
- El umbral de referencia del bundle (`threshold`) se utiliza para distinguir riesgo moderado de bajo riesgo, mientras que el corte 0.50 define el alto riesgo.
- El resultado global se combina con dominios `wasi`, `tap` y `cvlt` para entregar un perfil de riesgo multidominio.

### 6.2 Ingeniería de características

- `build_feature_dict()` construye el diccionario de características a partir de los datos del paciente.
- La implementación incluye cálculo de indicadores derivados como z-scores de Fenton para perímetro cefálico y catch-up de crecimiento.
- Los valores faltantes se imputan mediante medianas para la proyección PCA y mediante los objetos `imputer` de los bundles para inferencia.

### 6.3 Explicabilidad con SHAP

- `run_shap()` intenta usar `shap.TreeExplainer` sobre un `XGBClassifier` puro (`clf_raw`).
- Si SHAP no está disponible, el backend cae en un fallback basado en `feature_importances_`.
- El endpoint de inferencia devuelve:
  - valores SHAP por variable
  - top factores de riesgo
  - top factores protectores

### 6.4 Análisis de PCA y clustering

- El backend construye proyecciones PCA 2D usando `sklearn.decomposition.PCA` con `n_components=2` y `random_state=42`.
- Antes de PCA, los datos se imputan con `SimpleImputer(strategy='median')` y se estandarizan con `StandardScaler()`.
- El endpoint `/api/pca-clusters` ofrece la proyección global y etiquetas GO-i cargadas desde `app/data/processed/clusters_GOi.csv`.
- El endpoint `/api/cluster-domain-analysis` genera análisis por dominio usando variables seleccionadas de `CLUSTER_DOMAIN_VARIANTS`.

### 6.5 Análisis por dominio

- Los dominios de cluster se definen en `api/main.py` con metadata para CVLT, TAP y WASI.
- Cada variante incluye:
  - clave (`key`), título y notebook de referencia
  - descripción y regla de etiquetado GO-i
  - lista de variables específicas de dominio
- El backend monta una proyección PCA separada para cada dominio y calcula conteos de cluster, completitud y valores faltantes.

## 7. Documentación y soporte

- `docs/index.rst`: entrada principal de la documentación Sphinx.
- `docs/getting-started.rst`: guía inicial.
- `docs/conf.py`: configuración de Sphinx.

## 7. Cómo ejecutar el proyecto

### 7.1 Backend Python

1. Instalar dependencias:

```bash
pip install -r requirements.txt
pip install -e .
```

2. Iniciar FastAPI / Uvicorn (según configuración del proyecto):

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

3. Verificar estado:

```bash
curl http://localhost:8000/health
```

### Docker / docker-compose

#### Stack completo (Backend + Frontend)

Se provee un `docker-compose.yml` que orquesta dos servicios: `api` (backend) y `frontend` (React + Vite, servido por nginx).

Construir y levantar:

```bash
docker compose up --build
```

Esto expondrá por defecto:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000` (nginx)

#### Backend independiente

Para builds solo del backend:

```bash
docker build -f Dockerfile.backend -t mi-backend:latest .
docker run -p 8000:8000 mi-backend:latest
```

#### Configuración de backend remoto

Si necesitas apuntar el frontend a un backend diferente, establece `VITE_API_URL` en el servicio frontend del `docker-compose.yml`, o ejecuta:

```bash
VITE_API_URL=http://mi-backend:8000 docker compose up --build
```

En Docker, el contenedor frontend genera dinámicamente `env-config.js` en tiempo de inicio, inyectando `window.__API_URL` para permitir cambios de backend sin rebuild.

#### Dockerfiles disponibles

- `Dockerfile.backend` — Build solo del backend.
- `Dockerfile.frontend` — Build solo del frontend.

Ver `docker/README.md` para más detalles.

### 7.2 Frontend React

1. Instalar dependencias Node:

```bash
npm install
```

2. Ejecutar en modo desarrollo:

```bash
npm run dev
```

3. Abrir la URL que devuelva Vite.

## Deployment

Parámetros importantes:

- `API_HOST`: host donde correrá el backend (ej. `0.0.0.0`).
- `API_PORT`: puerto del backend (ej. `8000`).
- `VITE_API_URL`: URL base que el frontend usará para comunicarse con el backend.

Backend (local / despliegue):

Usar el script `api/run_server.py` que lee `API_HOST` y `API_PORT` desde variables de entorno.

PowerShell:

```powershell
$env:API_HOST = "0.0.0.0"
$env:API_PORT = "8000"
python api\run_server.py
```

Bash:

```bash
export API_HOST=0.0.0.0
export API_PORT=8000
python api/run_server.py
```

Frontend:

El frontend resuelve la URL del backend en el siguiente orden de prioridad:

1. `window.__API_URL` (inyectado en runtime por `docker/frontend-entrypoint.sh` en Docker)
2. `import.meta.env.VITE_API_URL` (variable de build/development)
3. Fallback: `https://44.201.230.38.nip.io` (URL remota original)

En desarrollo:

```bash
# Arranque en dev con URL a backend local
VITE_API_URL=http://localhost:8000 npm run dev
```

En producción (build estático):

```bash
# Empaqueta la app con la URL del backend embebida
VITE_API_URL=https://mi-backend.example.com npm run build
```

Archivo de ejemplo de variables de entorno (`.env.example`):

```
API_HOST=0.0.0.0
API_PORT=8000
VITE_API_URL=http://localhost:8000
```

Nota: no almacenar secretos ni credenciales en el repositorio. Use un gestor de secretos o variables de entorno seguras en producción.

## 8. Puntos importantes

- El backend y el frontend están separados: el frontend consume la API en `http://localhost:8000` por defecto.
- El análisis estático de clustering se apoya en endpoints dedicados `/api/pca-clusters` y `/api/cluster-domain-analysis`.
- Los notebooks son la fuente de verdad para las variables y el etiquetado de cluster CVLT/TAP/WASI.
- El proyecto utiliza la convención cookiecutter para la organización de datos y código.
