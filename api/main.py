"""
main.py optimizado para Windows
- Sin --reload (causa problemas con multiprocessing en Windows)
- joblib carga en background thread
- import shap lazy (no al arrancar)
- Logs claros del progreso de carga
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import csv
import joblib
import numpy as np
import math
import os
import logging
import threading
import time
import warnings
import statistics
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Fenton 2013 ───────────────────────────────────────────────────────────────
FENTON_M = {
    24:21.8,25:23.0,26:24.2,27:25.4,28:26.6,29:27.8,30:28.9,
    31:30.0,32:31.0,33:31.9,34:32.7,35:33.4,36:34.1,37:34.7,
    38:35.1,39:35.5,40:35.9,41:36.1,
}
FENTON_S = {
    24:.058,25:.056,26:.054,27:.052,28:.050,29:.048,30:.046,
    31:.045,32:.044,33:.043,34:.042,35:.041,36:.041,37:.040,
    38:.040,39:.040,40:.040,41:.040,
}
OMS_WAZ_3M=6200.0; OMS_WAZ_12M=9700.0
OMS_HAZ_3M=615.0;  OMS_HAZ_12M=740.0

def fenton_z(pc_cm: float, eg_weeks: float) -> Optional[float]:
    eg = int(round(eg_weeks))
    if eg not in FENTON_M or pc_cm <= 0: return None
    return (pc_cm / FENTON_M[eg] - 1.0) / FENTON_S[eg]

# ── Registry ──────────────────────────────────────────────────────────────────
BUNDLES: dict = {}
LOAD_STATUS = {"state": "loading", "errors": [], "loaded": []}

BASE_DIR = os.path.dirname(__file__)
BUNDLE_FILES = {
    "global": os.path.join(BASE_DIR, "kmc20_model_bundle_calibrated.joblib"),
    "wasi": os.path.join(BASE_DIR, "m8_modelo_binary_best.joblib"),
    "tap": os.path.join(BASE_DIR, "m9_tap_bundle.joblib"),
    "cvlt": os.path.join(BASE_DIR, "m10_cvlt_bundle.joblib"),
}
def _resolve_app_data_path(*parts):
    root = os.path.dirname(__file__)
    candidates = [
        os.path.normpath(os.path.join(root, '..', 'app', *parts)),
        os.path.normpath(os.path.join(root, '..', 'src', 'app', *parts)),
        os.path.normpath(os.path.join(root, '..', 'src', *parts)),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(
        'No se encontró el archivo de datos. Buscado en: ' + ', '.join(candidates)
    )
CLUSTER_DOMAIN_VARIANTS = [
    {
        "key": "cvlt",
        "title": "CVLT",
        "module": "CVLT",
        "description": "Agrupa perfiles de memoria verbal usando 8 variables CVLT seleccionadas en el notebook de clustering.",
        "labelling": "GO-1 = mayor memoria verbal y mayor FSIQ; GO-2 = menor memoria verbal.",
        "variables": [
            "CVLT_Trial1a4Total",
            "CVLT_ShortDelay",
            "CVLT_LongDelay",
            "CVLT_LongDelayCued",
            "CVLT_TotalIntrusions",
            "CVLT_TotalRepetitions",
            "CVLT_Hits",
            "CVLT_False_Positives",
        ],
        "notebook": "Clustering_CVLT_GOi_v1.ipynb",
    },
    {
        "key": "tap",
        "title": "TAP",
        "module": "TAP",
        "description": "Agrupa perfiles atencionales usando variables de memoria de trabajo y atención sostenida.",
        "labelling": "GO-1 = mejor rendimiento en memoria de trabajo y atención; GO-2 = peor desempeño atencional.",
        "variables": [
            "TAP_WM2_OMT0",
            "TAP_WM2_ERT0",
            "TAP_SA2_ERT3",
            "TAP_SA2_OMT3",
            "TAP_FN_TOTALPERFORMANCEINDEX",
            "TAP_GO1_ERT0",
        ],
        "notebook": "Clustering_TAP_GOi_v1.ipynb",
    },
    {
        "key": "wasi",
        "title": "WASI",
        "module": "WASI",
        "description": "Agrupa el rendimiento global WASI en dos clústeres GO-i basados en FSIQ.",
        "labelling": "GO-1 = mayor puntaje FSIQ WASI; GO-2 = menor FSIQ.",
        "variables": [
            "WASI_FullScale4compositescore",
        ],
        "notebook": "Clustering_WASI_GOi_v1.ipynb",
    },
]


def _fmt_size(path):
    try:
        mb = os.path.getsize(path) / 1_048_576
        return f"{mb:.1f} MB"
    except:
        return "?"

def load_bundles_background():
    for name, path in BUNDLE_FILES.items():
        if not os.path.exists(path):
            logger.warning(f"⚠️  [{name}] No encontrado: {path}")
            continue
        sz = _fmt_size(path)
        logger.info(f"⏳ [{name}] Cargando {path} ({sz})...")
        t0 = time.time()
        try:
            bundle = joblib.load(path)
            elapsed = time.time() - t0

            # Inspect bundle structure for diagnostics
            if isinstance(bundle, dict):
                keys      = list(bundle.keys())
                n_feat    = len(bundle.get("feature_cols", []))
                thr       = bundle.get("threshold", "?")
                has_pred  = "predict" in bundle and callable(bundle.get("predict"))
                has_clf   = any(k in bundle for k in ("clf","clf_cal"))
                has_pipe  = "imputer" in bundle and "scaler" in bundle
                logger.info(
                    f"✅ [{name}] {elapsed:.1f}s — keys={keys} "
                    f"features={n_feat} threshold={thr} "
                    f"predict_fn={has_pred} clf={has_clf} pipeline={has_pipe}"
                )
            else:
                # bundle is not a dict — probably a raw classifier
                logger.info(
                    f"✅ [{name}] {elapsed:.1f}s — "
                    f"type={type(bundle).__name__} (raw classifier)"
                )
                keys = []

            BUNDLES[name] = bundle
            LOAD_STATUS["loaded"].append(name)
        except Exception as e:
            logger.error(f"❌ [{name}] Error: {e}")
            LOAD_STATUS["errors"].append(f"{name}: {str(e)[:120]}")

    LOAD_STATUS["state"] = "ready"
    loaded = list(BUNDLES.keys())
    missing = [k for k in BUNDLE_FILES if k not in BUNDLES]
    logger.info("=" * 50)
    logger.info(f"🚀 MODELOS LISTOS: {loaded}")
    if missing:
        logger.warning(f"⚠️  FALTANTES: {missing}")
    logger.info("=" * 50)


@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=load_bundles_background, daemon=True)
    t.start()
    logger.info("🔄 Servidor iniciado. Modelos cargando en background...")
    logger.info("   → Abre http://localhost:8000/health para ver el progreso")
    yield
    BUNDLES.clear()
    logger.info("Servidor detenido.")


app = FastAPI(title="KMC-20 Predictor API", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schema ────────────────────────────────────────────────────────────────────
class PacienteDatos(BaseModel):
    pc_nacer_mm:        float = Field(..., ge=180, le=400)
    eg_semanas:         float = Field(..., ge=24,  le=36)
    pc_40sem_cm:        float = Field(..., ge=28,  le=44)
    dias_oxigeno:       float = Field(..., ge=0,   le=90)
    educ_materna:       int   = Field(..., ge=1,   le=5)
    griffiths_auditivo: float = Field(..., ge=50,  le=145)
    grupo:                   Optional[str]   = None
    horas_canguro:           Optional[float] = None
    dias_hospitalizacion:    Optional[float] = None
    fototerapia:             Optional[int]   = None
    ingreso_percapita:       Optional[float] = None
    educ_paterna:            Optional[int]   = None
    griffiths_motor:         Optional[float] = None
    griffiths_general:       Optional[float] = None
    leucomalacia:            Optional[int]   = None
    talla_40sem_mm:          Optional[float] = None
    peso_3m_g:               Optional[float] = None
    talla_3m_mm:             Optional[float] = None
    peso_12m_g:              Optional[float] = None
    talla_12m_cm:            Optional[float] = None
    griffiths_loco12:        Optional[float] = None
    dias_aminoglucosidos:    Optional[float] = None


def build_feature_dict(d: PacienteDatos) -> dict:
    z_nacer = fenton_z(d.pc_nacer_mm / 10.0, d.eg_semanas)
    z_40    = fenton_z(d.pc_40sem_cm, 40.0)
    catchup = (z_40 - z_nacer) if (z_nacer and z_40) else float("nan")
    kmc     = 0.0 if d.grupo == "TC" else (d.horas_canguro or float("nan"))
    opt     = lambda v: v if v is not None else float("nan")

    dw = ((d.peso_12m_g/OMS_WAZ_12M - d.peso_3m_g/OMS_WAZ_3M)*100
          if d.peso_3m_g and d.peso_12m_g else float("nan"))
    dh = ((d.talla_12m_cm*10/OMS_HAZ_12M - d.talla_3m_mm/OMS_HAZ_3M)*100
          if d.talla_3m_mm and d.talla_12m_cm else float("nan"))

    return {
        "F_delta_waz_3m_12m"      : dw,
        "SCB_nivm1"               : float(d.educ_materna),
        "F_catchup_hc_fenton"     : catchup,
        "PMD_coaudl6"             : d.griffiths_auditivo,
        "PMD_RSM6"                : opt(d.griffiths_motor),
        "SCB_percap1"             : opt(d.ingreso_percapita),
        "EX41_talla8"             : opt(d.talla_40sem_mm),
        "NEO_fotote6"             : float(d.fototerapia) if d.fototerapia is not None else float("nan"),
        "PMD_coloco12"            : opt(d.griffiths_loco12),
        "NEO_totoxidias"          : d.dias_oxigeno,
        "F_z_hc_birth_fenton"     : z_nacer or float("nan"),
        "F_delta_haz_3m_12m"      : dh,
        "SCB_nivp1"               : float(d.educ_paterna) if d.educ_paterna else float("nan"),
        "NEO_HOSP"                : opt(d.dias_hospitalizacion),
        "PMD_cogrif6"             : opt(d.griffiths_general),
        "EX41_durPCconcontroles03": kmc,
    }


def predict_from_bundle(bundle: dict, patient_dict: dict) -> dict:
    """
    Maneja 3 formatos posibles de bundle:
    A) bundle["predict"](patient_dict)  — nuevo con función predict
    B) bundle con clf + imputer + scaler — aplica pipeline manualmente
    """
    import numpy as np

    # Formato A: bundle tiene función predict()
    if "predict" in bundle and callable(bundle["predict"]):
        return bundle["predict"](patient_dict)

    # Formato B: clf + imputer + scaler sin función predict
    # Usar clf_cal (calibrado) para predict_proba si existe, sino clf_raw
    clf = bundle.get("clf_cal") or bundle.get("clf_raw") or bundle.get("clf")
    if clf is None:
        raise ValueError(f"Bundle keys disponibles: {list(bundle.keys())}")

    imputer   = bundle.get("imputer")
    scaler    = bundle.get("scaler")
    feat_cols = bundle.get("feature_cols", list(patient_dict.keys()))
    threshold = float(bundle.get("threshold", 0.25))

    row = np.array(
        [[patient_dict.get(c, float("nan")) for c in feat_cols]],
        dtype=float
    )
    if imputer is not None:
        row = imputer.transform(row)
    if scaler is not None:
        row = scaler.transform(row)

    prob = float(clf.predict_proba(row)[0, 1])

    if prob >= 0.50:
        label, level = "Alto Riesgo",    "high"
    elif prob >= threshold:
        label, level = "Riesgo Moderado","medium"
    else:
        label, level = "Bajo Riesgo",    "low"

    return {
        "probability"    : prob,
        "risk_label"     : label,
        "alert_level"    : level,
        "above_threshold": bool(prob >= threshold),
        "threshold_used" : threshold,
        "calibrated"     : "clf_cal" in bundle,
    }


def run_bundle(name, patient_dict):
    if name not in BUNDLES: return None
    bundle = BUNDLES[name]
    try:
        r = predict_from_bundle(bundle, patient_dict)
        return {
            "probabilidad"   : round(r["probability"] * 100, 1),
            "nivel"          : r["risk_label"],
            "alert_level"    : r["alert_level"],
            "above_threshold": r["above_threshold"],
            "threshold_usado": r["threshold_used"],
            "calibrado"      : r.get("calibrated", False),
        }
    except Exception as e:
        bkeys = list(bundle.keys()) if isinstance(bundle, dict) else type(bundle).__name__
        logger.error(f"[{name}] predict error: {e} | bundle: {bkeys}")
        return None   # No re-raise — dashboard muestra "no disponible"

PCA_CLUSTER_CACHE = None


def _parse_float(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
    if value == "" or value is None:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _bucket_counts(values, bins=5):
    if not values:
        return []
    mn = min(values)
    mx = max(values)
    if mn == mx:
        return [{"range": f"{mn:.2f}", "count": len(values)}]
    step = (mx - mn) / bins
    edges = [mn + i * step for i in range(bins + 1)]
    counts = [0] * bins
    for value in values:
        index = min(int((value - mn) / step), bins - 1)
        counts[index] += 1
    buckets = []
    for i in range(bins):
        lo = edges[i]
        hi = edges[i + 1]
        buckets.append({
            "range": f"{lo:.2f} - {hi:.2f}",
            "count": counts[i],
        })
    return buckets


def _percentile(sorted_values, p):
    if not sorted_values:
        return None
    n = len(sorted_values)
    idx = int(round((n - 1) * p / 100))
    return sorted_values[max(0, min(idx, n - 1))]


def _load_cluster_domain_analysis():
    dataset_path = _resolve_app_data_path('data', 'processed', 'kmc_dataset_procesado_completo.csv')
    cluster_path = _resolve_app_data_path('data', 'processed', 'clusters_GOi.csv')

    with open(cluster_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        clusters = {
            row['code'].strip(): {
                'GO_i': int(_parse_float(row['GO_i']) or 0),
                'GO_i_label': row.get('GO_i_label', '').strip() or f"GO-{row.get('GO_i', '').strip()}",
            }
            for row in reader if row.get('code') and row.get('GO_i')
        }

    with open(dataset_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            code = (row.get('code') or '').strip()
            if code and code in clusters:
                rows.append({
                    'code': code,
                    'cluster': clusters[code],
                    'data': row,
                })

    if not rows:
        raise ValueError('No hay participantes con etiquetas de cluster disponibles.')

    variants = []
    for variant in CLUSTER_DOMAIN_VARIANTS:
        values = []
        complete = 0
        pca_rows = []
        for row in rows:
            vals = [_parse_float(row['data'].get(col)) for col in variant['variables']]
            if all(v is not None for v in vals):
                complete += 1
            if len(vals) == 1:
                if vals[0] is not None:
                    values.append(vals[0])
            else:
                if any(v is not None for v in vals):
                    values.append(sum(v for v in vals if v is not None) / len([v for v in vals if v is not None]))
            pca_rows.append((row['code'], row['cluster'], vals))

        total = len(rows)
        missing_pct = round(100.0 * (1 - complete / total), 1) if total else 0.0
        values.sort()
        summary = None
        if values:
            summary = {
                "count": len(values),
                "complete_pct": round(100.0 * complete / total, 1) if total else 0.0,
                "missing_pct": missing_pct,
                "mean": round(statistics.mean(values), 2),
                "min": round(values[0], 2),
                "max": round(values[-1], 2),
                "median": round(_percentile(values, 50), 2),
                "p25": round(_percentile(values, 25), 2),
                "p75": round(_percentile(values, 75), 2),
                "buckets": _bucket_counts(values, bins=5),
            }

        pca_result = None
        feature_count = len(variant['variables'])
        if feature_count > 0:
            X = np.full((len(pca_rows), feature_count), np.nan, dtype=float)
            for i, (_, _, vals) in enumerate(pca_rows):
                for j, val in enumerate(vals):
                    X[i, j] = val if val is not None else np.nan
            imputer = SimpleImputer(strategy='median')
            X_imp = imputer.fit_transform(X)
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_imp)

            if feature_count == 1:
                pc1 = X_scaled[:, 0].tolist()
                pc2 = [0.0] * len(pc1)
                explained_variance = [100.0, 0.0]
            else:
                pca = PCA(n_components=2, random_state=42)
                X_pca = pca.fit_transform(X_scaled)
                pc1 = X_pca[:, 0].tolist()
                pc2 = X_pca[:, 1].tolist()
                explained_variance = [round(float(v) * 100, 2) for v in pca.explained_variance_ratio_]
                if len(explained_variance) < 2:
                    explained_variance += [0.0]

            points = [
                {
                    'code': code,
                    'GO_i': int(cluster['GO_i']),
                    'GO_i_label': cluster['GO_i_label'],
                    'pc1': float(pc1[i]),
                    'pc2': float(pc2[i]),
                }
                for i, (code, cluster, _) in enumerate(pca_rows)
            ]

            cluster_counts = {}
            for _, cluster, _ in pca_rows:
                key = str(cluster['GO_i'])
                cluster_counts[key] = cluster_counts.get(key, 0) + 1

            pca_result = {
                'points': points,
                'explained_variance': explained_variance,
                'cluster_counts': cluster_counts,
            }

        variants.append({
            "key": variant['key'],
            "title": variant['title'],
            "module": variant['module'],
            "description": variant['description'],
            "labelling": variant['labelling'],
            "variables": variant['variables'],
            "notebook": variant['notebook'],
            "summary": summary,
            "pca": pca_result,
        })

    return {
        "note": "Análisis estático derivado de las definiciones de clusters en los notebooks de CVLT, TAP y WASI.",
        "variants": variants,
    }


def _load_pca_cluster_data():
    global PCA_CLUSTER_CACHE
    if PCA_CLUSTER_CACHE is not None:
        return PCA_CLUSTER_CACHE

    dataset_path = _resolve_app_data_path('data', 'processed', 'kmc_dataset_procesado_completo.csv')
    cluster_path = _resolve_app_data_path('data', 'processed', 'clusters_GOi.csv')

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset no encontrado: {dataset_path}")
    if not os.path.exists(cluster_path):
        raise FileNotFoundError(f"Cluster labels no encontrados: {cluster_path}")

    with open(cluster_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        clusters = {
            row['code'].strip(): {
                'GO_i': int(row['GO_i']),
                'GO_i_label': row.get('GO_i_label', '').strip() or f"GO-{row['GO_i']}",
            }
            for row in reader if row.get('code') and row.get('GO_i')
        }

    rows = []
    codes = []
    labels = []
    with open(dataset_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        candidate_cols = [c for c in reader.fieldnames if c not in {'code', 'ubicac', 'preterm', 'lessthan1801g'}]
        for row in reader:
            code = (row.get('code') or '').strip()
            if not code or code not in clusters:
                continue
            codes.append(code)
            labels.append(clusters[code]['GO_i'])
            rows.append(row)

    if not rows:
        raise ValueError('No hay participantes con etiquetas de cluster disponibles.')

    nonmissing_threshold = max(20, int(len(rows) * 0.20))
    numeric_cols = []
    for col in candidate_cols:
        nonmissing = 0
        for row in rows:
            if _parse_float(row.get(col)) is not None:
                nonmissing += 1
        if nonmissing >= nonmissing_threshold:
            numeric_cols.append(col)

    if len(numeric_cols) < 2:
        raise ValueError('No se encontraron suficientes columnas numéricas para PCA.')

    X = np.full((len(rows), len(numeric_cols)), np.nan, dtype=float)
    for i, row in enumerate(rows):
        for j, col in enumerate(numeric_cols):
            value = _parse_float(row.get(col))
            X[i, j] = value if value is not None else np.nan

    imputer = SimpleImputer(strategy='median')
    X_imp = imputer.fit_transform(X)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imp)

    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X_scaled)

    points = [
        {
            'code': code,
            'GO_i': int(label),
            'GO_i_label': clusters[code]['GO_i_label'],
            'pc1': float(coords[0]),
            'pc2': float(coords[1]),
        }
        for code, label, coords in zip(codes, labels, X_pca)
    ]

    cluster_counts = {}
    cluster_labels = {}
    for code, label in zip(codes, labels):
        key = str(label)
        cluster_counts[key] = cluster_counts.get(key, 0) + 1
        cluster_labels[key] = clusters[code]['GO_i_label']

    PCA_CLUSTER_CACHE = {
        'points': points,
        'explained_variance': [round(float(v) * 100, 2) for v in pca.explained_variance_ratio_],
        'cluster_counts': cluster_counts,
        'cluster_labels': cluster_labels,
    }
    return PCA_CLUSTER_CACHE


def run_shap(patient_dict: dict):
    """
    SHAP reales con TreeExplainer — usa clf_raw (XGBClassifier puro).
    bundle tiene: clf_raw=XGBClassifier, clf_cal=CalibratedClassifierCV.
    TreeExplainer requiere el XGBClassifier, NO el wrapper calibrado.
    """
    if "global" not in BUNDLES:
        return None

    bundle    = BUNDLES["global"]
    feat_cols = bundle.get("feature_cols", [])
    imputer   = bundle.get("imputer")
    scaler    = bundle.get("scaler")

    if not feat_cols or imputer is None or scaler is None:
        return None

    import numpy as np, math

    # Vector del paciente
    row     = np.array([[patient_dict.get(c, float("nan")) for c in feat_cols]], dtype=float)
    row_imp = imputer.transform(row)
    row_sc  = scaler.transform(row_imp)

    # XGBClassifier puro para SHAP — clf_raw tiene prioridad
    xgb_clf = bundle.get("clf_raw")
    if xgb_clf is None:
        clf_cal = bundle.get("clf_cal")
        if clf_cal is not None and hasattr(clf_cal, "calibrated_classifiers_"):
            xgb_clf = clf_cal.calibrated_classifiers_[0].estimator
    if xgb_clf is None:
        xgb_clf = bundle.get("clf")
    if xgb_clf is None:
        logger.warning("SHAP: no se encontró XGBClassifier")
        return None

    LABELS = {
        "F_delta_waz_3m_12m"       : "Velocidad peso 3m→12m",
        "SCB_nivm1"                : "Nivel educativo materno",
        "F_catchup_hc_fenton"      : "Catch-up PC Fenton",
        "PMD_coaudl6"              : "Cociente auditivo 6m",
        "PMD_RSM6"                 : "Raw score motor 6m",
        "SCB_percap1"              : "Ingreso per cápita",
        "EX41_talla8"              : "Talla 40 semanas",
        "NEO_fotote6"              : "Fototerapia",
        "PMD_coloco12"             : "Locomoción Griffiths 12m",
        "NEO_totoxidias"           : "Días oxigenoterapia",
        "F_z_hc_birth_fenton"      : "PC z-score al nacer",
        "F_delta_haz_3m_12m"       : "Velocidad talla 3m→12m",
        "SCB_nivp1"                : "Nivel educativo paterno",
        "NEO_HOSP"                 : "Días hospitalización",
        "PMD_cogrif6"              : "Cociente general 6m",
        "EX41_durPCconcontroles03" : "Horas posición canguro",
    }

    # TreeExplainer
    try:
        import shap as _shap

        explainer = _shap.TreeExplainer(xgb_clf)
        sv        = explainer(row_sc, check_additivity=False)
        shap_vals = sv.values[0].tolist()
        base_val  = float(sv.base_values[0])
        base_prob = 1.0 / (1.0 + math.exp(-base_val))

        features = sorted(
            [{"feature"  : col,
              "label_es" : LABELS.get(col, col),
              "shap"     : round(float(shap_vals[i]), 5)}
             for i, col in enumerate(feat_cols) if i < len(shap_vals)],
            key=lambda x: abs(x["shap"]), reverse=True,
        )

        logger.info(f"SHAP OK — TreeExplainer — top={features[0]['label_es'] if features else '—'}")
        return {
            "base_prob"       : round(base_prob, 4),
            "shap_values"     : features,
            "top_risk_factors": [f for f in features if f["shap"] > 0][:5],
            "top_protective"  : [f for f in features if f["shap"] < 0][:3],
            "method"          : "TreeExplainer",
        }

    except Exception as e:
        logger.warning(f"TreeExplainer falló: {e}")

    # Fallback: feature_importances_
    try:
        fi = (xgb_clf.feature_importances_
              if hasattr(xgb_clf, "feature_importances_") else None)
        if fi is None:
            return None

        med = imputer.statistics_ if hasattr(imputer, "statistics_") else np.zeros(len(feat_cols))
        pv  = np.array([patient_dict.get(c, float("nan")) for c in feat_cols], dtype=float)
        pv[np.isnan(pv)] = med[np.isnan(pv)]

        DIRECTION = {
            "F_delta_waz_3m_12m":-1,"SCB_nivm1":-1,"F_catchup_hc_fenton":-1,
            "PMD_coaudl6":-1,"PMD_RSM6":-1,"SCB_percap1":-1,"EX41_talla8":-1,
            "NEO_fotote6":1,"PMD_coloco12":-1,"NEO_totoxidias":1,
            "F_z_hc_birth_fenton":-1,"F_delta_haz_3m_12m":-1,"SCB_nivp1":-1,
            "NEO_HOSP":1,"PMD_cogrif6":-1,
        }

        features = sorted([
            {"feature": col,
             "label_es": LABELS.get(col, col),
             "shap": round(float(fi[i]) * DIRECTION.get(col,1) *
                           (1 if (pv[i]-med[i])*DIRECTION.get(col,1) > 0 else -1), 5)}
            for i, col in enumerate(feat_cols) if i < len(fi) and fi[i] > 0.001
        ], key=lambda x: abs(x["shap"]), reverse=True)

        logger.info("SHAP fallback — feature_importances_")
        return {
            "base_prob"       : 0.0,
            "shap_values"     : features,
            "top_risk_factors": [f for f in features if f["shap"] > 0][:5],
            "top_protective"  : [f for f in features if f["shap"] < 0][:3],
            "method"          : "feature_importances_fallback",
        }
    except Exception as e:
        logger.warning(f"SHAP fallback error: {e}")
        return None


        logger.info(f"SHAP OK — TreeExplainer — top={features[0]['label_es'] if features else '—'}")
        return {
            "base_prob"       : round(base_prob, 4),
            "shap_values"     : features,
            "top_risk_factors": [f for f in features if f["shap"] > 0][:5],
            "top_protective"  : [f for f in features if f["shap"] < 0][:3],
            "method"          : "TreeExplainer",
        }

    except Exception as e:
        logger.warning(f"TreeExplainer falló: {e}")

    # Fallback: feature_importances_
    try:
        fi = (xgb_clf.feature_importances_
              if hasattr(xgb_clf, "feature_importances_") else None)
        if fi is None:
            return None

        med = imputer.statistics_ if hasattr(imputer, "statistics_") else np.zeros(len(feat_cols))
        pv  = np.array([patient_dict.get(c, float("nan")) for c in feat_cols], dtype=float)
        pv[np.isnan(pv)] = med[np.isnan(pv)]

        DIRECTION = {
            "F_delta_waz_3m_12m":-1,"SCB_nivm1":-1,"F_catchup_hc_fenton":-1,
            "PMD_coaudl6":-1,"PMD_RSM6":-1,"SCB_percap1":-1,"EX41_talla8":-1,
            "NEO_fotote6":1,"PMD_coloco12":-1,"NEO_totoxidias":1,
            "F_z_hc_birth_fenton":-1,"F_delta_haz_3m_12m":-1,"SCB_nivp1":-1,
            "NEO_HOSP":1,"PMD_cogrif6":-1,
        }

        features = sorted([
            {"feature": col,
             "label_es": LABELS.get(col, col),
             "shap": round(float(fi[i]) * DIRECTION.get(col,1) *
                           (1 if (pv[i]-med[i])*DIRECTION.get(col,1) > 0 else -1), 5)}
            for i, col in enumerate(feat_cols) if i < len(fi) and fi[i] > 0.001
        ], key=lambda x: abs(x["shap"]), reverse=True)

        logger.info("SHAP fallback — feature_importances_")
        return {
            "base_prob"       : 0.0,
            "shap_values"     : features,
            "top_risk_factors": [f for f in features if f["shap"] > 0][:5],
            "top_protective"  : [f for f in features if f["shap"] < 0][:3],
            "method"          : "feature_importances_fallback",
        }
    except Exception as e:
        logger.warning(f"SHAP fallback error: {e}")
        return None


@app.get("/api/pca-clusters")
def pca_clusters():
    try:
        return _load_pca_cluster_data()
    except FileNotFoundError as e:
        raise HTTPException(404, detail=str(e))
    except ValueError as e:
        raise HTTPException(500, detail=str(e))
    except Exception as e:
        logger.exception("Error al generar PCA de clusters")
        raise HTTPException(500, detail="Error interno al cargar datos de PCA")


@app.get("/api/cluster-domain-analysis")
def cluster_domain_analysis():
    try:
        return _load_cluster_domain_analysis()
    except FileNotFoundError as e:
        raise HTTPException(404, detail=str(e))
    except Exception as e:
        logger.exception("Error al cargar análisis de clusters por dominio")
        raise HTTPException(500, detail="Error interno al cargar el análisis de dominios de clustering")


@app.get("/health")
def health():
    """
    Responde inmediatamente con el estado actual de carga.
    state = 'loading' mientras los modelos cargan en background.
    state = 'ready'   cuando todos los bundles disponibles están cargados.
    """
    return {
        "status"          : LOAD_STATUS["state"],
        "modelos_cargados": list(BUNDLES.keys()),
        "modelos_faltantes": [k for k in BUNDLE_FILES if k not in BUNDLES],
        "errores"         : LOAD_STATUS["errors"],
    }


@app.post("/api/predecir")
def predecir(datos: PacienteDatos):
    if LOAD_STATUS["state"] == "loading":
        raise HTTPException(503, detail="Cargando modelos... reintenta en unos segundos.")
    if "global" not in BUNDLES:
        raise HTTPException(503, detail="Modelo global no disponible.")
    try:
        pd_ = build_feature_dict(datos)
    except Exception as e:
        raise HTTPException(422, detail=f"Feature engineering: {e}")
    try:
        g  = run_bundle("global", pd_)
        w  = run_bundle("wasi",   pd_)
        ta = run_bundle("tap",    pd_)
        cv = run_bundle("cvlt",   pd_)
        sh = run_shap(pd_)

        nan_f  = [k for k,v in pd_.items() if isinstance(v,float) and math.isnan(v)]
        compl  = round((1-len(nan_f)/len(pd_))*100,1)
        z_n    = pd_["F_z_hc_birth_fenton"]
        cu     = pd_["F_catchup_hc_fenton"]

        return {
            "global"  : g,
            "dominios": {"wasi": w, "tap": ta, "cvlt": cv},
            "shap"    : sh,
            "meta"    : {
                "completitud_pct"    : compl,
                "campos_imputados"   : nan_f,
                "n_campos_imputados" : len(nan_f),
                "fenton_z_nacer"     : round(z_n,3) if not math.isnan(z_n) else None,
                "catchup_fenton"     : round(cu,3)  if not math.isnan(cu)  else None,
                "delta_waz_calculado": not math.isnan(pd_["F_delta_waz_3m_12m"]),
                "kmc_imputado_tc"    : datos.grupo == "TC",
            },
        }
    except Exception as e:
        logger.exception("Inference error")
        raise HTTPException(500, detail=str(e))


@app.get("/api/modelo-info")
def modelo_info():
    if "global" not in BUNDLES:
        raise HTTPException(503, "Modelo no disponible")
    b = BUNDLES["global"]
    return {
        "version"     : b.get("model_version","—"),
        "n_features"  : len(b["feature_cols"]),
        "threshold"   : b["threshold"],
        "metrics"     : b.get("metrics",{}),
        "calibration" : b.get("calibration",{}),
    }


@app.get("/api/threshold-table")
def threshold_table():
    import json
    try:
        with open("kmc20_threshold_table_calibrated.json") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(404, "kmc20_threshold_table_calibrated.json no encontrado")



@app.get("/api/debug-bundles")
def debug_bundles():
    """Inspecciona la estructura de los bundles cargados — para diagnosticar errores."""
    info = {}
    for name, bundle in BUNDLES.items():
        if isinstance(bundle, dict):
            info[name] = {
                "type"        : "dict",
                "keys"        : list(bundle.keys()),
                "has_predict" : "predict" in bundle and callable(bundle.get("predict")),
                "has_clf"     : any(k in bundle for k in ("clf","clf_cal")),
                "has_imputer" : "imputer" in bundle,
                "has_scaler"  : "scaler" in bundle,
                "feature_cols": bundle.get("feature_cols", [])[:5],
                "n_features"  : len(bundle.get("feature_cols", [])),
                "threshold"   : bundle.get("threshold"),
            }
        else:
            info[name] = {
                "type": type(bundle).__name__,
                "keys": [],
            }
    return {"load_status": LOAD_STATUS, "bundles": info}

if __name__ == "__main__":
    import uvicorn
    # SIN --reload en Windows para evitar el error de multiprocessing
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,          # <-- CRÍTICO en Windows
        workers=1,
        log_level="info",
    )