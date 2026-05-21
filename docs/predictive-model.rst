Predictive model
================

El documento explica cómo funciona el modelo predictivo global y su integración con los dominios WASI, TAP y CVLT.

Bundles de modelo
-----------------

Los bundles se cargan desde `api/` y pueden incluir:

- `feature_cols`
- `threshold`
- `imputer`
- `scaler`
- `clf`, `clf_raw` o `clf_cal`
- `predict()` opcional

Bundles disponibles
-------------------

- `api/kmc20_model_bundle_calibrated.joblib`: modelo global.
- `api/m8_modelo_binary_best.joblib`: modelo WASI.
- `api/m9_tap_bundle.joblib`: modelo TAP.
- `api/m10_cvlt_bundle.joblib`: modelo CVLT.

Endpoint de inferencia
----------------------

- `POST /api/predecir`

El backend realiza:

1. Validación del payload con `PacienteDatos`.
2. Transformación de entradas con `build_feature_dict()`.
3. Predicción para cada bundle mediante `run_bundle()`.
4. Cálculo de explicabilidad SHAP con `run_shap()` cuando es posible.
5. Retorno de la predicción global, dominios, explicaciones y metadatos.

Formato de salida
-----------------

La respuesta contiene:

- `global`: resultado global del bundle principal.
- `dominios`: predicciones para `wasi`, `tap` y `cvlt`.
- `shap`: explicaciones de SHAP o fallback por importancia de características.
- `meta`: datos de completitud, imputación y métricas de entrada.

Criterios de riesgo
-------------------

El cálculo de riesgo sigue estas reglas:

- `prob >= 0.50` → `Alto Riesgo`
- `threshold <= prob < 0.50` → `Riesgo Moderado`
- `prob < threshold` → `Bajo Riesgo`

Cada bundle utiliza su umbral específico `threshold`.

Ingeniería de características
----------------------------

`build_feature_dict()` crea variables derivadas importantes como:

- `F_delta_waz_3m_12m`
- `SCB_nivm1`
- `F_catchup_hc_fenton`
- `PMD_coaudl6`
- `PMD_RSM6`
- `SCB_percap1`
- `EX41_talla8`
- `NEO_fotote6`
- `NEO_totoxidias`
- `F_z_hc_birth_fenton`
- `F_delta_haz_3m_12m`
- `NEO_HOSP`
- `EX41_durPCconcontroles03`

Explicabilidad SHAP
-------------------

Cuando el bundle global contiene un `XGBClassifier` puro, el backend usa `shap.TreeExplainer` para calcular:

- `shap_values`
- `top_risk_factors`
- `top_protective`
- `base_prob`
- `method`

Si SHAP falla, utiliza `feature_importances_` como fallback.

Predicción global y dominios
----------------------------

La inferencia devuelve un perfil de riesgo:

- global: predicción del modelo principal.
- dominios: resultados para `wasi`, `tap` y `cvlt`.
- meta: completitud de campos, campos imputados y métricas derivadas.
