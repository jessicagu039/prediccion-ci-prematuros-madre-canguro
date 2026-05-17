Clustering analysis
===================

Este documento describe el análisis de clustering por dominio y su integración con el backend y el frontend.

Resumen
--------

El proyecto incluye análisis de clustering para tres dominios:

- **CVLT**: perfiles de memoria verbal.
- **TAP**: atención y memoria de trabajo.
- **WASI**: rendimiento intelectual global.

Los datos de cluster se alimentan desde `app/data/processed/clusters_GOi.csv`.

Endpoints de backend
--------------------

- `GET /api/pca-clusters`
  - Devuelve la proyección PCA global de los datos procesados.
  - Incluye coordenadas `pc1`, `pc2`, etiquetas de cluster y conteos.
- `GET /api/cluster-domain-analysis`
  - Devuelve análisis por variante de dominio (`cvlt`, `tap`, `wasi`).
  - Incluye estadísticas de completitud, resumen de valores y resultados PCA.

Notebooks de referencia
-----------------------

- `notebooks/clustering-models/Clustering_CVLT_GOi_v1.ipynb`
- `notebooks/clustering-models/Clustering_TAP_GOi_v1.ipynb`
- `notebooks/clustering-models/Clustering_WASI_GOi_v1.ipynb`

Estos notebooks documentan:

- selección de variables por dominio.
- reglas de etiquetado GO-i.
- generación de proyecciones PCA y visualizaciones de clusters.

Integración frontend
--------------------

El dashboard React consume los endpoints del backend para renderizar:

- scatter plot PCA global.
- paneles de conteo por cluster.
- tarjetas de dominio para CVLT, TAP y WASI.

Archivos de datos
-----------------

- `app/data/processed/kmc_dataset_procesado_completo.csv`
- `app/data/processed/clusters_GOi.csv`

Uso
---

1. Iniciar el backend con `python run_server.py`.
2. Iniciar el frontend con `npm run dev`.
3. Abrir el dashboard y navegar a la sección de clustering.

Notas
-----

El análisis de clustering es complementario a la predicción KMC y permite explorar perfiles cognitivos y estructuración de cohortes.
