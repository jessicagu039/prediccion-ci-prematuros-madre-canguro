import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Brain, Info, AlertTriangle, CheckCircle,
  FileText, ChevronRight, ActivitySquare, UploadCloud,
  AlertCircle, FileJson, BarChartHorizontal,
  Focus, MessageSquare, ClipboardList, X, Save, TrendingUp,
  Loader2, ServerCrash, Shield
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// API CONFIG
// Por defecto usa la URL remota original.
// Para desarrollo local / Docker, sobreescribe con VITE_API_URL o window.__API_URL.
// ─────────────────────────────────────────────────────────────────────────────

const runtimeApiUrl = typeof window !== 'undefined' ? window.__API_URL : undefined;
const API_URL = runtimeApiUrl || import.meta.env.VITE_API_URL || 'https://54.161.234.170.nip.io';
// ─────────────────────────────────────────────────────────────────────────────
// IMÁGENES DE EVIDENCIA CIENTÍFICA
// Exportar desde Databricks con: fig.savefig("nombre.png", dpi=150, bbox_inches="tight", facecolor="white")
// Copiar a: src/assets/evidencia/
// ─────────────────────────────────────────────────────────────────────────────
// Importar dinámicamente para evitar errores si las imágenes no existen aún
const IMG = {
  fa_tractos   : new URL('./assets/evidencia/fa_tractos.png',    import.meta.url).href,
  icfes        : new URL('./assets/evidencia/icfes_comparacion.png', import.meta.url).href,
  audiometria  : new URL('./assets/evidencia/audiometria.png',   import.meta.url).href,
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
// ─── Image Modal ────────────────────────────────────────────────────────────
const ImageModal = ({ src, alt, onClose }) => (
  <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4"
       onClick={onClose}>
    <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
      <button onClick={onClose}
              className="absolute -top-10 right-0 text-white font-black text-sm
                         hover:text-slate-300 flex items-center gap-1">
        <X className="w-4 h-4" /> Cerrar
      </button>
      <img src={src} alt={alt}
           className="w-full rounded-2xl shadow-2xl border border-white/10" />
      <p className="text-center text-slate-400 text-xs mt-3">{alt}</p>
    </div>
  </div>
);

// ─── Evidence Image Card ─────────────────────────────────────────────────────
const EvidenceImg = ({ src, alt, caption, onZoom }) => {
  const [error, setError] = React.useState(false);
  if (error) return (
    <div className="w-full h-28 rounded-xl border border-dashed border-slate-300
                    flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
      <span>📊</span>
      <span>Exportar imagen desde Databricks</span>
      <code className="text-[9px] opacity-70">{alt}</code>
    </div>
  );
  return (
    <div className="mt-3 group relative">
      <img src={src} alt={alt} onError={() => setError(true)}
           onClick={() => onZoom(src, caption || alt)}
           className="w-full rounded-xl border border-slate-200 cursor-zoom-in
                      hover:border-blue-400 transition-all hover:shadow-lg" />
      <div className="absolute inset-0 flex items-center justify-center
                      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="bg-black/50 text-white text-[10px] font-bold
                         px-3 py-1 rounded-full">Ver en grande</span>
      </div>
      {caption && (
        <p className="text-[10px] text-slate-400 text-center mt-1 leading-tight">{caption}</p>
      )}
    </div>
  );
};

const DotItem = ({ label, value, valColor }) => (
  <div className="flex justify-between items-start text-[13px] mb-2">
    <div className="flex items-start gap-2 mt-0.5">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
        valColor === 'rose' ? 'bg-rose-500' : 'bg-emerald-500'
      }`} />
      <span className="text-slate-700 font-medium leading-tight">{label}</span>
    </div>
    <span className={`font-bold whitespace-nowrap ml-2 ${
      valColor === 'rose' ? 'text-rose-600' : 'text-emerald-700'
    }`}>{value}</span>
  </div>
);

const FormSection = ({ title, level, desc, children, icon: Icon }) => {
  const styles = {
    obligatorio: { border: 'border-rose-200',   bg: 'bg-rose-50',    text: 'text-rose-900',   badge: 'text-rose-700 bg-rose-100'   },
    recomendado:  { border: 'border-amber-200',  bg: 'bg-amber-50',   text: 'text-amber-900',  badge: 'text-amber-700 bg-amber-100'  },
    opcional:     { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900',badge: 'text-emerald-700 bg-emerald-100'},
  }[level];

  return (
    <div className={`border ${styles.border} rounded-xl overflow-hidden mb-6 bg-white shadow-sm`}>
      <div className={`${styles.bg} px-5 py-4 border-b ${styles.border}`}>
        <div className="flex justify-between items-center mb-1">
          <h3 className={`font-black flex items-center gap-2 ${styles.text}`}>
            {Icon && <Icon className="w-5 h-5" />}{title}
          </h3>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${styles.badge}`}>
            {level}
          </span>
        </div>
        {desc && <p className={`text-xs font-medium opacity-80 ${styles.text}`}>{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

const FormGroup = ({ label, unit, required, helper, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
      {label}
      {unit && <span className="bg-slate-200 text-slate-600 px-1 rounded text-[10px]">{unit}</span>}
      {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {helper && <span className="text-[10px] text-slate-400 font-medium leading-tight">{helper}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL FORM STATE
// Keys match PacienteDatos in main.py exactly
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  // Obligatorios
  pc_nacer_mm:        '',
  eg_semanas:         '',
  peso_nacer_g:       '',   // peso al nacer en gramos — para contexto clínico
  pc_40sem_cm:        '',
  dias_oxigeno:       '',
  educ_materna:       '',   // int 1-5
  griffiths_auditivo: '',
  // Recomendados
  grupo:                  '',
  horas_canguro:          '',
  dias_hospitalizacion:   '',
  fototerapia:            '',   // 0 o 1
  ingreso_percapita:      '',   // float COP
  educ_paterna:           '',   // int 1-5
  griffiths_motor:        '',
  griffiths_general:      '',
  leucomalacia:           '',   // 0-3
  // Opcionales
  talla_40sem_mm:   '',
  peso_3m_g:        '',
  talla_3m_mm:      '',
  peso_12m_g:       '',
  talla_12m_cm:     '',
  griffiths_loco12: '',
  dias_aminoglucosidos: '',
};

// SHAP bar — reads from API response shape
const ShapBar = ({ item, maxAbs }) => {
  // API returns: { feature, label_es, shap }
  const isRisk  = item.shap > 0;
  const width   = (Math.abs(item.shap) / maxAbs) * 100;
  const display = item.label_es || item.feature;
  const valText = (isRisk ? '+' : '') + item.shap.toFixed(3);

  return (
    <div className="flex items-center mb-3">
      <div className="w-5/12 text-right pr-4 text-xs font-semibold text-slate-600 truncate" title={display}>
        {display}
      </div>
      <div className="w-7/12 flex items-center">
        <div className="w-full flex">
          <div className="w-1/2 flex justify-end pr-[1px] border-r border-slate-400">
            {!isRisk && (
              <div className="bg-emerald-400 h-4 rounded-l-sm transition-all duration-500"
                   style={{ width: `${width}%` }} />
            )}
          </div>
          <div className="w-1/2 flex justify-start pl-[1px]">
            {isRisk && (
              <div className="bg-rose-400 h-4 rounded-r-sm transition-all duration-500"
                   style={{ width: `${width}%` }} />
            )}
          </div>
        </div>
        <span className={`text-xs font-bold ml-3 w-12 flex-shrink-0 ${
          isRisk ? 'text-rose-600' : 'text-emerald-600'
        }`}>{valText}</span>
      </div>
    </div>
  );
};

const GlobalShapChart = ({ shapData = [] }) => {
  const displayData = shapData.slice(0, 8);
  if (!displayData.length) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center text-slate-500">
        SHAP global no disponible. Carga un caso para ver los factores más influyentes.
      </div>
    );
  }

  const maxAbs = Math.max(...displayData.map(item => Math.abs(item.shap)));

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">
      {displayData.map(item => (
        <ShapBar key={item.feature} item={item} maxAbs={maxAbs} />
      ))}
      <div className="mt-5 pt-4 border-t border-slate-200 flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-400 rounded-sm" /> Protector
        </span>
        <span className="flex items-center gap-2">
          <div className="w-3 h-3 bg-rose-400 rounded-sm" /> Factor Riesgo
        </span>
      </div>
    </div>
  );
};

const CLUSTER_PALETTE = ['#2563eb', '#f97316', '#14b8a6', '#8b5cf6', '#ec4899', '#84cc16'];

const buildClusterColorMap = (points) => {
  const clusterValues = Array.from(new Set(points.map(p => String(p.GO_i)))).sort();
  const colorByCluster = clusterValues.reduce((acc, label, index) => {
    acc[label] = CLUSTER_PALETTE[index % CLUSTER_PALETTE.length];
    return acc;
  }, {});
  return { clusterValues, colorByCluster };
};

const PCAClusterLegend = ({ points = [], clusterLabels = {}, clusterCounts, compact = false }) => {
  const { clusterValues, colorByCluster } = buildClusterColorMap(points);
  if (!clusterValues.length) return null;

  return (
    <div className={compact ? 'mt-3' : 'mt-6'}>
      <h4 className={`font-semibold text-slate-800 ${compact ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
        Clústeres GO-i
      </h4>
      <div className={compact ? 'space-y-1.5' : 'flex flex-wrap gap-x-6 gap-y-2'}>
        {clusterValues.map(label => (
          <div
            key={label}
            className={`flex items-center gap-2 text-slate-600 ${compact ? 'text-xs justify-between' : 'text-sm'}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorByCluster[label] }} />
              <span className={compact ? 'truncate' : ''}>{clusterLabels[label] ?? `GO-${label}`}</span>
            </span>
            {clusterCounts && (
              <span className="font-black text-slate-800 shrink-0">n={clusterCounts[label] ?? 0}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const PCAGlobalSummary = ({ points = [], clusterCounts = {}, clusterLabels = {}, explainedVariance = [] }) => {
  const { clusterValues, colorByCluster } = buildClusterColorMap(points);
  const total = Object.values(clusterCounts).reduce((sum, n) => sum + n, 0);

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5 space-y-5 h-fit lg:sticky lg:top-6">
      <div>
        <p className="text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-2">Qué muestra este gráfico</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          PCA 2D sobre todas las variables numéricas del dataset procesado. Cada punto es un participante
          coloreado según su etiqueta GO-i de <span className="font-semibold text-slate-800">clusters_GOi.csv</span>.
        </p>
      </div>
      <div>
        <p className="text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-3">Varianza explicada</p>
        <div className="text-sm text-slate-700 space-y-1">
          <div className="flex justify-between">
            <span>PC1</span>
            <span className="font-black">{explainedVariance[0] ?? '—'}%</span>
          </div>
          <div className="flex justify-between">
            <span>PC2</span>
            <span className="font-black">{explainedVariance[1] ?? '—'}%</span>
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-3">Clústeres GO-i</p>
        <div className="space-y-2 text-sm text-slate-700">
          {clusterValues.map(label => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colorByCluster[label] }} />
                <span className="truncate">{clusterLabels[label] ?? `GO-${label}`}</span>
              </span>
              <span className="font-black shrink-0">{clusterCounts[label] ?? 0}</span>
            </div>
          ))}
        </div>
        {total > 0 && (
          <p className="text-xs text-slate-400 mt-2">{total} participantes en el gráfico</p>
        )}
      </div>
    </aside>
  );
};

const ClusterDomainCard = ({ variant }) => {
  const pca = variant.pca;
  const points = pca?.points ?? [];
  const clusterLabels = points.reduce((acc, pt) => {
    acc[String(pt.GO_i)] = pt.GO_i_label;
    return acc;
  }, {});
  const { clusterValues, colorByCluster } = buildClusterColorMap(points);
  const clusterCounts = pca?.cluster_counts ?? {};

  return (
    <article className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="bg-slate-50 p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200">
          <div>
            <p className="text-xs uppercase font-black tracking-[0.2em] text-slate-400 mb-1">{variant.title}</p>
            <p className="text-sm text-slate-700 leading-relaxed">{variant.description}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-3 text-xs">
            <p className="font-semibold text-slate-800 mb-1">Regla de etiquetado GO-i</p>
            <p className="text-slate-600 leading-relaxed">{variant.labelling}</p>
          </div>
          {clusterValues.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Clústeres en la cohorte</p>
              <div className="space-y-2 text-sm text-slate-700">
                {clusterValues.map(label => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorByCluster[label] }} />
                      <span className="truncate">{clusterLabels[label] ?? `GO-${label}`}</span>
                    </span>
                    <span className="font-black shrink-0">{clusterCounts[label] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {variant.summary ? (
            <div className="space-y-2 text-sm text-slate-700 border-t border-slate-200 pt-3">
              <div className="flex justify-between">
                <span>Participantes con datos</span>
                <span className="font-black">{variant.summary.count}</span>
              </div>
              <div className="flex justify-between">
                <span>Compleción de variables</span>
                <span className="font-black">{variant.summary.complete_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span>Valores faltantes</span>
                <span className="font-black">{variant.summary.missing_pct}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Datos de cohorte incompletos para este dominio.</p>
          )}
        </div>
        <div className="p-4 min-w-0">
          {pca ? (
            <PCAPlot
              compact
              title={`PCA ${variant.title}`}
              subtitle={null}
              showClusterLegend={false}
              points={pca.points}
              explainedVariance={pca.explained_variance}
              clusterLabels={clusterLabels}
              width={480}
              height={300}
            />
          ) : (
            <p className="text-sm text-slate-500 p-6 text-center">No hay proyección PCA para este dominio.</p>
          )}
        </div>
      </div>
    </article>
  );
};

const PCAPlot = ({
  points = [],
  explainedVariance = [],
  clusterLabels = {},
  title = 'Análisis PCA de Clusters',
  subtitle = 'Proyección PCA 2D de las muestras del proyecto usando etiquetas GO-i.',
  width = 720,
  height = 420,
  compact = false,
  hideVarianceInHeader = false,
  clusterCounts,
  showClusterLegend = true,
}) => {
  if (!points.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
        No hay datos de PCA disponibles para mostrar.
      </div>
    );
  }

  const xs = points.map(p => p.pc1);
  const ys = points.map(p => p.pc2);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 32;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = (width - pad * 2) / rangeX;
  const scaleY = (height - pad * 2) / rangeY;
  const { clusterValues, colorByCluster } = buildClusterColorMap(points);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h3 className={`font-black text-slate-900 ${compact ? 'text-lg' : 'text-2xl'}`}>{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {!hideVarianceInHeader && (
          <div className="text-xs text-slate-500 text-right">
            <div>PC1: {explainedVariance[0] ?? 0}%</div>
            <div>PC2: {explainedVariance[1] ?? 0}%</div>
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
          <rect x="0" y="0" width={width} height={height} fill="#f8fafc" />
          {[...Array(5)].map((_, index) => {
            const x = pad + index * ((width - 2 * pad) / 4);
            return <line key={`gx-${index}`} x1={x} y1={pad} x2={x} y2={height - pad} stroke="#e2e8f0" strokeWidth="1" />;
          })}
          {[...Array(5)].map((_, index) => {
            const y = pad + index * ((height - 2 * pad) / 4);
            return <line key={`gy-${index}`} x1={pad} y1={y} x2={width - pad} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
          })}
          {points.map((pt, idx) => {
            const x = pad + (pt.pc1 - minX) * scaleX;
            const y = height - pad - (pt.pc2 - minY) * scaleY;
            return (
              <circle key={`${pt.code}-${idx}`} cx={x} cy={y} r="4.5"
                      fill={colorByCluster[String(pt.GO_i)]} stroke="#ffffff" strokeWidth="1.4">
                <title>{`Código ${pt.code} — ${pt.GO_i_label} — PC1 ${pt.pc1.toFixed(2)}, PC2 ${pt.pc2.toFixed(2)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
      {showClusterLegend && (
        <PCAClusterLegend
          points={points}
          clusterLabels={clusterLabels}
          clusterCounts={clusterCounts}
          compact={compact}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [formData, setFormData]       = useState(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [activeSection, setActiveSection] = useState('predictor');
  const [activeTab, setActiveTab]     = useState('global');
  const [isLoading, setIsLoading]     = useState(false);
  const [results, setResults]         = useState(null);
  const [apiError, setApiError]       = useState(null);
  const [uploadMsg, setUploadMsg]     = useState(null);
  const [evidOverride, setEvidOverride] = useState(null);
  const [modalImg, setModalImg]         = useState(null);   // {src, alt}
  const [apiStatus, setApiStatus]     = useState('unknown'); // 'ok' | 'error' | 'unknown'
  const [pcaData, setPcaData]             = useState(null);
  const [pcaLoading, setPcaLoading]       = useState(false);
  const [pcaError, setPcaError]           = useState(null);
  const [domainAnalysis, setDomainAnalysis] = useState(null);
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError]     = useState(null);
  const fileInputRef = useRef(null);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d.modelos_cargados?.includes('global') ? 'ok' : 'partial'))
      .catch(() => setApiStatus('error'));
  }, []);

  useEffect(() => {
    setPcaLoading(true);
    fetch(`${API_URL}/api/pca-clusters`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPcaData(data);
        setPcaError(null);
      })
      .catch((err) => {
        setPcaError(err.message || 'No se pudo cargar el análisis de PCA');
      })
      .finally(() => setPcaLoading(false));
  }, []);

  useEffect(() => {
    setDomainLoading(true);
    fetch(`${API_URL}/api/cluster-domain-analysis`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setDomainAnalysis(data);
        setDomainError(null);
      })
      .catch((err) => {
        setDomainError(err.message || 'No se pudo cargar el análisis de dominios de clustering');
      })
      .finally(() => setDomainLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Build payload: convert strings to numbers, leave blanks as null
  const buildPayload = (fd) => {
    const numFields = [
      'pc_nacer_mm','eg_semanas','pc_40sem_cm','dias_oxigeno','educ_materna',
      'griffiths_auditivo','horas_canguro','dias_hospitalizacion','fototerapia',
      'ingreso_percapita','educ_paterna','griffiths_motor','griffiths_general',
      'leucomalacia','talla_40sem_mm','peso_3m_g','talla_3m_mm','peso_12m_g',
      'talla_12m_cm','griffiths_loco12','dias_aminoglucosidos',
    ];
    const payload = {};
    for (const [k, v] of Object.entries(fd)) {
      if (v === '' || v === null || v === undefined) continue;
      payload[k] = numFields.includes(k) ? parseFloat(v) : v;
    }
    return payload;
  };

  const isFormValid = () => {
    const req = ['pc_nacer_mm','eg_semanas','pc_40sem_cm','dias_oxigeno',
                 'educ_materna','griffiths_auditivo'];
    return req.every(f => formData[f] !== '');
  };

  const handleSubmitForm = () => {
    if (!isFormValid()) return;
    setIsFormOpen(false);
    callAPI(formData);
  };

  const callAPI = async (fd) => {
    setIsLoading(true);
    setApiError(null);
    setResults(null);
    setEvidOverride(null);

    try {
      const payload = buildPayload(fd);
      const res = await fetch(`${API_URL}/api/predecir`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // Support both old field names (legacy) and new ones
        const mapped = {
          pc_nacer_mm:        data.pc_nacer_mm  ?? data.pc_nacer  ?? '',
          peso_nacer_g:       data.peso_nacer_g ?? data.peso      ?? '',
          eg_semanas:         data.eg_semanas   ?? data.semanas   ?? '',
          pc_40sem_cm:        data.pc_40sem_cm  ?? data.pc_40     ?? '',
          dias_oxigeno:       data.dias_oxigeno ?? data.oxigeno   ?? '',
          educ_materna:       data.educ_materna ?? (
            data.educacion === 'Primaria' ? 1 :
            data.educacion === 'Secundaria' ? 2 :
            data.educacion === 'Universitaria' ? 4 : ''
          ),
          griffiths_auditivo: data.griffiths_auditivo ?? data.griffiths_aud ?? '',
          grupo:              data.grupo ?? '',
          horas_canguro:      data.horas_canguro ?? '',
          dias_hospitalizacion: data.dias_hospitalizacion ?? data.hospitalizacion ?? '',
          fototerapia:        data.fototerapia ?? '',
          ingreso_percapita:  data.ingreso_percapita ?? '',
          educ_paterna:       data.educ_paterna ?? '',
          griffiths_motor:    data.griffiths_motor   ?? data.griffiths_mot ?? '',
          griffiths_general:  data.griffiths_general ?? data.griffiths_gen ?? '',
          leucomalacia:       data.leucomalacia ?? '',
          talla_40sem_mm:     data.talla_40sem_mm ?? '',
          peso_3m_g:          data.peso_3m_g  ?? '',
          talla_3m_mm:        data.talla_3m_mm ?? '',
          peso_12m_g:         data.peso_12m_g  ?? data.peso_12m ?? '',
          talla_12m_cm:       data.talla_12m_cm ?? data.talla_12m ?? '',
          griffiths_loco12:   data.griffiths_loco12 ?? data.loco_12m ?? '',
          dias_aminoglucosidos: data.dias_aminoglucosidos ?? '',
        };
        // Convert all to strings for form state
        const stringified = Object.fromEntries(
          Object.entries(mapped).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)])
        );
        setFormData(stringified);
        setUploadMsg({ type: 'ok', text: `Cargado: ${file.name}` });
        callAPI(stringified);
      } catch {
        setUploadMsg({ type: 'error', text: 'Error al parsear el JSON' });
      }
    };
    reader.readAsText(file);
  };

  const handleLoadExample = () => {
    const example = {
      pc_nacer_mm:        '235',
      eg_semanas:         '26',
      peso_nacer_g:       '880',
      pc_40sem_cm:        '32.2',
      dias_oxigeno:       '28',
      educ_materna:       '1',
      griffiths_auditivo: '70',
      grupo:              'TC',
      horas_canguro:      '0',
      dias_hospitalizacion: '45',
      fototerapia:        '1',
      ingreso_percapita:  '75000',
      griffiths_motor:    '3',
      griffiths_general:  '85',
      // leucomalacia omitida — no en TOP15 y difícil de obtener
      peso_12m_g:         '8100',
      talla_12m_cm:       '71',
      griffiths_loco12:   '90',
      educ_paterna:       '',
      talla_40sem_mm:     '',
      peso_3m_g:          '',
      talla_3m_mm:        '',
      dias_aminoglucosidos: '',
    };
    setFormData(example);
    setUploadMsg({ type: 'ok', text: 'Ejemplo cargado: caso_clinico_riesgo.json' });
    callAPI(example);
  };

  // ── Derived display values from API response ────────────────────────────
  const globalResult  = results?.global;
  const isHighRisk    = globalResult?.alert_level === 'high';
  const isMedRisk     = globalResult?.alert_level === 'medium';
  const probDisplay   = globalResult?.probabilidad ?? null;

  // SHAP — API returns { top_risk_factors: [{feature,label_es,shap}], top_protective: [...] }
  const shapRisk      = results?.shap?.top_risk_factors ?? [];
  const shapProtect   = results?.shap?.top_protective   ?? [];
  const allShap       = [...shapRisk, ...shapProtect].sort(
    (a, b) => Math.abs(b.shap) - Math.abs(a.shap)
  );
  const maxShapAbs    = allShap.length
    ? Math.max(...allShap.map(s => Math.abs(s.shap)))
    : 1;

  // Domain models — API returns { dominios: { wasi, tap, cvlt } }
  const wasiResult = results?.dominios?.wasi;
  const tapResult  = results?.dominios?.tap;
  const cvltResult = results?.dominios?.cvlt;

  // Meta — derived values calculated by backend
  const meta         = results?.meta ?? {};
  const catchupVal   = meta.catchup_fenton;
  const zNacerVal    = meta.fenton_z_nacer;

  // Evidencia tab
  const currentEvidencia = evidOverride ?? (isHighRisk || isMedRisk ? 'go2' : 'go1');

  // ── Completion pct for AUC live estimate ──────────────────────────────
  const reqFields = ['pc_nacer_mm','eg_semanas','pc_40sem_cm','dias_oxigeno',
                     'educ_materna','griffiths_auditivo'];
  const filledReq = reqFields.filter(f => formData[f] !== '').length;
  const filledRec = ['grupo','dias_hospitalizacion','fototerapia','griffiths_motor',
                     'griffiths_general','ingreso_percapita'].filter(f => formData[f] !== '').length;
  const aucEstimate =
    filledReq < reqFields.length ? null :
    filledReq === reqFields.length && filledRec === 0 ? '≈0.695' :
    filledRec >= 4 ? '≈0.689' : '≈0.678';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 flex flex-col">

      {/* ── IMAGE MODAL ─────────────────────────────────────────────────── */}
      {modalImg && (
        <ImageModal src={modalImg.src} alt={modalImg.alt}
                    onClose={() => setModalImg(null)} />
      )}

      {/* ── FORM MODAL ──────────────────────────────────────────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" /> Ingreso de Datos Clínicos
                </h2>
              </div>
              <button onClick={() => setIsFormOpen(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
              <div className="max-w-3xl mx-auto">

                {/* INFO PANEL — TOP15 mapping */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                  <div className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-3">
                    Variables del modelo 
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <div className="font-bold text-rose-700 mb-1.5 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500"/> Obligatorio 
                      </div>
                      <div className="space-y-1 text-slate-600 leading-relaxed">
                        <div>• Educación materna</div>
                        <div>• Perímetro Craneal al nacer <span className="text-blue-600 font-medium"></span></div>
                        <div>• Perímetro Craneal 40 sem → <span className="text-blue-600 font-medium"></span></div>
                        <div>• Cociente auditivo 6m</div>
                        <div>• Días O₂</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-amber-700 mb-1.5 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500"/> Recomendado 
                      </div>
                      <div className="space-y-1 text-slate-600 leading-relaxed">
                        <div>• Griffiths motor 6m</div>
                        <div>• Fototerapia</div>
                        <div>• Días hospitalización</div>
                        <div>• Griffiths general 6m</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-700 mb-1.5 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"/> Opcional 
                      </div>
                      <div className="space-y-1 text-slate-600 leading-relaxed">
                        <div>• Peso 3m + 12m → <span className="text-blue-600 font-medium">Δ velocidad peso</span></div>
                        <div>• Talla 3m + 12m → <span className="text-blue-600 font-medium">Δ velocidad talla</span></div>
                        <div>• Ingreso per cápita</div>
                        <div>• Talla 40 semanas</div>
                        <div>• Locomoción Griffiths 12m</div>
                        <div>• Educación paterna</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NIVEL 1 */}
                <FormSection title="Nivel 1" level="obligatorio"
                             desc="Variables mínimas requeridas.">
                  <div className="bg-white rounded-lg p-4 border border-rose-100 mb-4 shadow-sm">
                    <h4 className="text-[11px] font-black text-rose-800 uppercase tracking-widest mb-3">
                      Trayectoria de Crecimiento Cerebral 
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormGroup label="Perímetro Craneal al nacer" unit="mm" required helper="En mm. Mediana: 280–340 mm">
                        <input type="number" name="pc_nacer_mm" value={formData.pc_nacer_mm}
                               onChange={handleChange} min="180" max="400"
                               className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-200 outline-none" />
                      </FormGroup>
                      <FormGroup label="EG Ballard" unit="sem" required helper="Semanas completas: 24–36">
                        <input type="number" name="eg_semanas" value={formData.eg_semanas}
                               onChange={handleChange} min="24" max="36"
                               className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-200 outline-none" />
                      </FormGroup>
                      <FormGroup label="Perímetro craneal a las 40 semanas Edad corregida" unit="cm" required helper="En cm. Rango: 30–40 cm">
                        <input type="number" name="pc_40sem_cm" value={formData.pc_40sem_cm}
                               onChange={handleChange} min="28" max="44" step="0.1"
                               className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-200 outline-none" />
                      </FormGroup>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormGroup label="2. Días Oxigenoterapia" unit="días" required helper="Total período neonatal">
                      <input type="number" name="dias_oxigeno" value={formData.dias_oxigeno}
                             onChange={handleChange} min="0" max="90"
                             className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-200 outline-none" />
                    </FormGroup>
                    <FormGroup label="3. Educación Materna" required helper="Proxy socioeconómico principal">
                      <select name="educ_materna" value={formData.educ_materna}
                              onChange={handleChange}
                              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-200 outline-none bg-white">
                        <option value="">Seleccionar…</option>
                        <option value="1">1 — Primaria</option>
                        <option value="2">2 — Secundaria</option>
                        <option value="3">3 — Técnico / tecnólogo</option>
                        <option value="4">4 — Universitario</option>
                        <option value="5">5 — Posgrado</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="4. Cociente Auditivo Griffiths 6m" required helper="Normal 75–117 · Riesgo <75">
                      <input type="number" name="griffiths_auditivo" value={formData.griffiths_auditivo}
                             onChange={handleChange} min="50" max="145"
                             className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-rose-200 outline-none" />
                    </FormGroup>
                  </div>
                </FormSection>

                {/* NIVEL 2 */}
                <FormSection title="Nivel 2" level="recomendado">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <FormGroup label="Peso al nacer" unit="g" helper="Rango prematuros: 400–2.500 g">
                      <input type="number" name="peso_nacer_g" value={formData.peso_nacer_g}
                             onChange={handleChange} min="400" max="3500"
                             className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                    <FormGroup label="Grupo estudio">
                      <select name="grupo" value={formData.grupo} onChange={handleChange}
                              className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none bg-white">
                        <option value="">Seleccionar…</option>
                        <option value="KMC">KMC — posición canguro</option>
                        <option value="TC">TC — cuidado tradicional</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="Horas posición canguro" unit="h" helper="TC → se imputa como 0 automáticamente">
                      <input type="number" name="horas_canguro" value={formData.horas_canguro}
                             onChange={handleChange} min="0" max="500"
                             className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>

                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormGroup label="Días hospitalización" unit="días">
                      <input type="number" name="dias_hospitalizacion"
                             value={formData.dias_hospitalizacion} onChange={handleChange}
                             min="0" max="180"
                             className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                    <FormGroup label="¿Fototerapia?">
                      <select name="fototerapia" value={formData.fototerapia} onChange={handleChange}
                              className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none bg-white">
                        <option value="">Seleccionar…</option>
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="Griffiths General 6m" helper="Normal: 78–115">
                      <input type="number" name="griffiths_general"
                             value={formData.griffiths_general} onChange={handleChange}
                             min="50" max="140"
                             className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                    <FormGroup label="Griffiths Motor 6m" helper="Raw score 1–6">
                      <input type="number" name="griffiths_motor"
                             value={formData.griffiths_motor} onChange={handleChange}
                             min="1" max="6"
                             className="w-full border border-amber-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                  </div>
                </FormSection>

                {/* NIVEL 3 */}
                <FormSection title="Nivel 3" level="opcional">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <FormGroup label="Ingreso per cápita del hogar"
                               helper="Total ingresos del hogar ÷ número de personas">
                      <select name="ingreso_percapita" value={formData.ingreso_percapita}
                              onChange={handleChange}
                              className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none bg-white">
                        <option value="">Seleccionar…</option>
                        <option value="33000">&lt; 1 SMMLV — menos de $1.750.000</option>
                        <option value="55000">1 – 2 SMMLV — $1.750.000 a $3.500.000</option>
                        <option value="100000">2 – 3 SMMLV — $3.500.000 a $5.250.000</option>
                        <option value="130000">3 – 4 SMMLV — $5.250.000 a $7.000.000</option>
                        <option value="160000">4 – 5 SMMLV — $7.000.000 a $8.750.000</option>
                        <option value="200000">&gt; 5 SMMLV — más de $8.750.000</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="Educación paterna">
                      <select name="educ_paterna" value={formData.educ_paterna}
                              onChange={handleChange}
                              className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none bg-white">
                        <option value="">Seleccionar…</option>
                        <option value="1">1 — Primaria</option>
                        <option value="2">2 — Secundaria</option>
                        <option value="3">3 — Técnico / tecnólogo</option>
                        <option value="4">4 — Universitario</option>
                        <option value="5">5 — Posgrado</option>
                      </select>
                    </FormGroup>
                    <FormGroup label="Talla 40 sem Edad Corregida" unit="mm">
                      <input type="number" name="talla_40sem_mm"
                             value={formData.talla_40sem_mm} onChange={handleChange}
                             min="360" max="580"
                             className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormGroup label="Peso 3m Edad Corregida" unit="g">
                      <input type="number" name="peso_3m_g" value={formData.peso_3m_g}
                             onChange={handleChange} min="2500" max="8000"
                             className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                    <FormGroup label="Talla 3m Edad Corregida" unit="mm">
                      <input type="number" name="talla_3m_mm" value={formData.talla_3m_mm}
                             onChange={handleChange} min="450" max="680"
                             className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                    <FormGroup label="Peso 12m Edad Corregida" unit="g">
                      <input type="number" name="peso_12m_g" value={formData.peso_12m_g}
                             onChange={handleChange} min="5000" max="14000"
                             className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                    <FormGroup label="Talla 12m Edad Corregida" unit="cm">
                      <input type="number" name="talla_12m_cm" value={formData.talla_12m_cm}
                             onChange={handleChange} min="60" max="86" step="0.5"
                             className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormGroup label="Locomoción Griffiths 12m" helper="Normal: 83–125">
                      <input type="number" name="griffiths_loco12"
                             value={formData.griffiths_loco12} onChange={handleChange}
                             min="50" max="160"
                             className="w-full border border-emerald-300 rounded-lg p-2 text-sm outline-none" />
                    </FormGroup>

                  </div>
                </FormSection>
              </div>
            </div>

            <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-between items-center shadow-sm z-10">
              <span className="text-xs font-bold text-slate-400">
                * Obligatorios = mínimo para ejecutar el modelo
              </span>
              <div className="flex gap-3">
                <button onClick={() => setIsFormOpen(false)}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Cancelar
                </button>
                <button onClick={handleSubmitForm} disabled={!isFormValid()}
                        className="px-6 py-2.5 text-sm font-black text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-xl flex items-center gap-2 shadow-md transition-colors">
                  <Save className="w-4 h-4" /> Calcular Riesgo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="bg-blue-700 p-2.5 rounded-2xl shadow-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">KMC Predictor</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Seguimiento Longitudinal 20 Años</p>
          </div>
        </div>
        <div className="bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            apiStatus === 'ok'    ? 'bg-emerald-500 animate-pulse' :
            apiStatus === 'error' ? 'bg-rose-500' : 'bg-slate-300'
          }`} />
          <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">
            Motor de Inferencia: {
              apiStatus === 'ok'    ? 'Activo' :
              apiStatus === 'error' ? 'Sin Conexión' : 'Conectando…'
            }
          </span>
          {aucEstimate && (
            <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              AUC {aucEstimate}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button onClick={() => setActiveSection('predictor')}
                  className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                    activeSection === 'predictor'
                      ? 'bg-blue-700 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
            KMC Predictor
          </button>
          <button onClick={() => setActiveSection('analysis')}
                  className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                    activeSection === 'analysis'
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
            Analysis Results
          </button>
        </div>
      </div>

      {activeSection === 'predictor' ? (
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 w-full flex-grow">

        {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-5">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700" />
              <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">Historia Clínica</h2>
            </div>
            <div className="p-5 space-y-4">
              <button onClick={() => setIsFormOpen(true)}
                      className="w-full py-4 bg-blue-50 border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-100 rounded-2xl flex flex-col items-center justify-center transition-all group">
                <ClipboardList className="w-10 h-10 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black text-blue-900">Ingresar Datos</span>
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">
                  Mínimo 6 campos obligatorios
                </span>
              </button>

              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current.click()}
                        className="flex-1 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Subir JSON
                </button>
                <button onClick={handleLoadExample}
                        className="flex-1 py-2.5 bg-slate-800 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" /> Ejemplo
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload}
                       accept=".json,.txt" className="hidden" />
              </div>

              {uploadMsg && (
                <div className={`flex items-center gap-2 text-xs font-semibold p-2 rounded-lg ${
                  uploadMsg.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {uploadMsg.type === 'ok'
                    ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  {uploadMsg.text}
                </div>
              )}


              {/* Variables extraídas */}
              {results?.meta && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-[0.2em]">
                    Variables Extraídas
                  </h3>
                  <div className="space-y-2">

                    {formData.peso_nacer_g && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Peso nacer:</span>
                        <span className="font-black">{formData.peso_nacer_g} g</span>
                      </div>
                    )}
                    {formData.eg_semanas && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Edad gestacional:</span>
                        <span className="font-black">{formData.eg_semanas} semanas</span>
                      </div>
                    )}
                    {formData.dias_oxigeno && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Días O₂:</span>
                        <span className="font-black">{formData.dias_oxigeno} d</span>
                      </div>
                    )}

                    {/* Recuperación PC — barra + etiqueta + explicación */}
                    {catchupVal !== null && catchupVal !== undefined && (() => {
                      const cu = catchupVal;
                      const label = cu >= 0    ? 'Adecuada'
                                  : cu >= -0.5 ? 'Parcial'
                                  : cu >= -1   ? 'Limitada'
                                  :              'Muy por debajo';
                      const color = cu >= 0    ? 'text-emerald-700'
                                  : cu >= -0.5 ? 'text-amber-600'
                                  : cu >= -1   ? 'text-amber-700'
                                  :              'text-rose-600';
                      const barColor = cu >= 0    ? '#16a34a'
                                     : cu >= -0.5 ? '#d97706'
                                     : cu >= -1   ? '#b45309'
                                     :              '#dc2626';
                      const barPct = Math.max(2, Math.min(98, ((cu + 3) / 6) * 100));
                      const desc = cu >= 0
                        ? 'La cabeza ganó posición respecto a pares de la misma EG'
                        : cu >= -1
                          ? 'La cabeza creció menos de lo esperado para su edad gestacional'
                          : 'Crecimiento cefálico muy por debajo de sus pares prematuros';
                      return (
                        <div className="pt-0.5">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Recuperación Perímetro Craneal:</span>
                            <span className={`font-black text-[11px] ${color}`}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                   style={{width: `${barPct}%`, background: barColor}} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-14 text-right shrink-0">
                              {cu > 0 ? '+' : ''}{cu} σ
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{desc}</div>
                        </div>
                      );
                    })()}

                    {/* Cociente auditivo — barra + etiqueta */}
                    {formData.griffiths_auditivo && (() => {
                      const aud = parseFloat(formData.griffiths_auditivo);
                      const label = aud >= 85  ? 'Normal'
                                  : aud >= 75  ? 'Límite'
                                  :              'Bajo lo esperado';
                      const color = aud >= 85  ? 'text-emerald-700'
                                  : aud >= 75  ? 'text-amber-600'
                                  :              'text-rose-600';
                      const barColor = aud >= 85  ? '#16a34a'
                                     : aud >= 75  ? '#d97706'
                                     :              '#dc2626';
                      const barPct = Math.max(2, Math.min(98, ((aud - 50) / 95) * 100));
                      return (
                        <div className="pt-0.5">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Audición 6 meses:</span>
                            <span className={`font-black text-[11px] ${color}`}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                   style={{width: `${barPct}%`, background: barColor}} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-14 text-right shrink-0">
                              {aud} pts
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            Normal: 85–117 · Riesgo: &lt;75
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        <div className="xl:col-span-9 flex flex-col">
          {/* Tabs */}
          <div className="flex p-1.5 bg-slate-200 rounded-2xl mb-6 self-start w-full md:w-auto overflow-x-auto">
            {[['global','Riesgo Global'],['cognitivo','Perfil Cognitivo'],['evidencia','Validación Científica']].map(
              ([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                        className={`px-7 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
                          activeTab === key
                            ? 'bg-white text-blue-700 shadow-xl'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}>
                  {label}
                </button>
              )
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-10 relative flex-grow flex flex-col min-h-[500px]">

            {/* API Error */}
            {apiError && (
              <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                <ServerCrash className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-rose-900">Error al conectar con el modelo</p>
                  <p className="text-xs text-rose-700 mt-1">{apiError}</p>
                  <p className="text-xs text-rose-500 mt-1">
                    Verifica que el backend esté corriendo en {API_URL}
                  </p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!results && !isLoading && !apiError && activeTab !== 'analisis' && (
              <div className="flex-grow flex flex-col items-center justify-center opacity-20 grayscale">
                <ActivitySquare className="w-24 h-24 mb-4" />
                <p className="font-black uppercase tracking-widest text-sm">Esperando Datos Clínicos</p>
                <p className="text-xs font-medium mt-2">Complete los 6 campos obligatorios para ejecutar el modelo</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xl z-10 flex flex-col items-center justify-center rounded-[2.5rem]">
                <Loader2 className="w-12 h-12 text-blue-700 animate-spin mb-4" />
                <p className="font-black text-slate-700 uppercase tracking-widest text-xs">
                  Ejecutando Modelo…
                </p>
              </div>
            )}

            {/* Results */}
            {results && !isLoading && (
              <div className="animate-in fade-in zoom-in-95 duration-500 flex-grow flex flex-col">

                {/* ── TAB: RIESGO GLOBAL ──────────────────────────────── */}
                {activeTab === 'global' && (
                  <div className="flex-grow">
                    <div className="grid md:grid-cols-2 gap-10 items-center mb-10 pb-10 border-b border-slate-100">
                      {/* Gauge */}
                      <div className="flex flex-col items-center">
                        <div className={`w-44 h-44 rounded-full border-[10px] flex flex-col items-center justify-center shadow-xl mb-5 ${
                          isHighRisk ? 'bg-rose-100 border-rose-400'   :
                          isMedRisk  ? 'bg-amber-100 border-amber-400' :
                                       'bg-emerald-100 border-emerald-400'
                        }`}>
                          {isHighRisk
                            ? <AlertTriangle className="w-10 h-10 text-rose-600" />
                            : isMedRisk
                              ? <AlertCircle className="w-10 h-10 text-amber-600" />
                              : <CheckCircle className="w-10 h-10 text-emerald-600" />}
                          <span className={`text-lg font-black mt-2 tracking-tighter text-center px-2 leading-tight ${
                            isHighRisk ? 'text-rose-600' : isMedRisk ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {globalResult.nivel}
                          </span>
                        </div>
                        <div className="text-center bg-slate-50 p-4 rounded-2xl w-full border border-slate-100">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                            Probabilidad de Riesgo
                          </p>
                          <p className="text-4xl font-black text-slate-900">{probDisplay}%</p>
                          {globalResult.calibrado && (
                            <div className="mt-3 bg-blue-50 text-blue-800 text-[11px] font-medium p-2.5 rounded-xl border border-blue-100 leading-tight flex items-start gap-1.5">
                              <Shield className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span> {probDisplay} de cada 100 pacientes con este perfil neonatal pertenecen al grupo GO-2 Bajo.</span>
                            </div>
                          )}
                          <div className="mt-2 text-[10px] text-slate-400">
                             {meta.completitud_pct}% campos completados
                          </div>
                        </div>
                      </div>

                      {/* Narrative */}
                      <div className="space-y-5">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                          Trayectoria Neurocognitiva
                        </h2>
                        <div className={`p-5 rounded-3xl border-2 ${
                          isHighRisk ? 'bg-rose-50 border-rose-200' :
                          isMedRisk  ? 'bg-amber-50 border-amber-200' :
                                       'bg-emerald-50 border-emerald-200'
                        }`}>
                          <p className={`text-sm font-bold leading-relaxed ${
                            isHighRisk ? 'text-rose-900' :
                            isMedRisk  ? 'text-amber-900' : 'text-emerald-900'
                          }`}>
                            {isHighRisk
                              ? 'El perfil neonatal (crecimiento de la cabeza por debajo de lo esperado, exposición prolongada a O₂) junto con el contexto socioeducativo se asocia a alto riesgo de déficit cognitivo a los 20 años.'
                              : isMedRisk
                                ? 'El perfil presenta factores de riesgo moderados. Se recomienda seguimiento periódico en neurodesarrollo.'
                                : 'La trayectoria de crecimiento cerebral favorable y el contexto socioeducativo se asocian a desarrollo cognitivo dentro del rango esperado a los 20 años.'}
                          </p>
                        </div>

                        {/* Crecimiento cerebral neonatal — visual */}
                        {(catchupVal !== null || zNacerVal !== null) && (() => {
                          // ── helpers ─────────────────────────────────────────
                          const zLabel = z =>
                            z >= 0    ? 'En la media de sus pares'
                            : z >= -1 ? 'Algo por debajo de sus pares'
                            : z >= -2 ? 'Claramente por debajo'
                            :           'Muy por debajo de sus pares';
                          const zDesc = z =>
                            z >= 0
                              ? 'La cabeza tenía el tamaño esperado para su edad gestacional al nacer.'
                              : z >= -1
                                ? 'La cabeza era algo pequeña para su edad gestacional, dentro del rango habitual en prematuros.'
                                : 'La cabeza era notablemente pequeña para su edad gestacional al nacer.';
                          const cuLabel = c =>
                            c >= 0    ? 'Recuperó posición'
                            : c >= -0.5 ? 'Recuperación parcial'
                            : c >= -1 ? 'Recuperación limitada'
                            :           'No recuperó posición';
                          const cuDesc = c =>
                            c >= 0
                              ? 'La cabeza creció al ritmo esperado o más rápido entre el nacimiento y las 40 semanas. Señal favorable.'
                              : c >= -0.5
                                ? 'La cabeza creció algo menos de lo esperado, pero dentro del rango habitual para prematuros.'
                                : c >= -1
                                  ? 'La cabeza creció bastante menos de lo esperado en el período neonatal más crítico.'
                                  : 'La cabeza creció significativamente menos de lo esperado. Este es el predictor de mayor peso en el modelo.';
                          const zColor  = z => z >= 0 ? '#16a34a' : z >= -1 ? '#d97706' : z >= -2 ? '#b45309' : '#dc2626';
                          const cuColor = c => c >= 0 ? '#16a34a' : c >= -0.5 ? '#d97706' : c >= -1 ? '#b45309' : '#dc2626';
                          const zTextColor  = z => z >= 0 ? 'text-emerald-700' : z >= -1 ? 'text-amber-600' : z >= -2 ? 'text-amber-700' : 'text-rose-600';
                          const cuTextColor = c => c >= 0 ? 'text-emerald-700' : c >= -0.5 ? 'text-amber-600' : c >= -1 ? 'text-amber-700' : 'text-rose-600';
                          // bar: z-score range -3 to +3 → 2% to 98%
                          const zBar  = z => Math.max(2, Math.min(98, ((z  + 3) / 6) * 100));
                          const cuBar = c => Math.max(2, Math.min(98, ((c + 3) / 6) * 100));
                          return (
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                              <p className="font-black text-slate-500 uppercase tracking-widest text-[10px]">
                                Crecimiento cerebral neonatal
                              </p>

                              {/* z-score al nacer */}
                              {zNacerVal !== null && (
                                <div>
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-xs text-slate-600 font-medium leading-tight">
                                      Tamaño de la cabeza al nacer<br/>
                                      <span className="font-normal text-slate-400 text-[10px]">vs bebés de la misma edad gestacional</span>
                                    </span>
                                    <span className={`text-xs font-black ml-3 text-right ${zTextColor(zNacerVal)}`}>
                                      {zLabel(zNacerVal)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] text-slate-300 w-8">−3</span>
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                                      {/* zone markers */}
                                      <div className="absolute top-0 bottom-0 bg-emerald-100" style={{left:'50%', right:'0'}} />
                                      <div className="absolute top-0 w-px bg-slate-400 opacity-40" style={{left:'50%'}} />
                                      {/* value dot */}
                                      <div className="absolute top-0 h-full w-2 h-2 rounded-full border-2 border-white shadow-sm"
                                           style={{left:`calc(${zBar(zNacerVal)}% - 4px)`, background: zColor(zNacerVal)}} />
                                    </div>
                                    <span className="text-[9px] text-slate-300 w-5">+3</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-tight">{zDesc(zNacerVal)}</p>
                                </div>
                              )}

                              {/* recuperación entre nacer y 40 sem */}
                              {catchupVal !== null && (
                                <div>
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-xs text-slate-600 font-medium leading-tight">
                                      Crecimiento de la cabeza<br/>
                                      <span className="font-normal text-slate-400 text-[10px]">desde el nacimiento hasta las 40 semanas Edad Corregida</span>
                                    </span>
                                    <span className={`text-xs font-black ml-3 text-right ${cuTextColor(catchupVal)}`}>
                                      {cuLabel(catchupVal)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] text-slate-300 w-8">−3</span>
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                                      <div className="absolute top-0 bottom-0 bg-emerald-100" style={{left:'50%', right:'0'}} />
                                      <div className="absolute top-0 w-px bg-slate-400 opacity-40" style={{left:'50%'}} />
                                      <div className="absolute top-0 h-full w-2 h-2 rounded-full border-2 border-white shadow-sm"
                                           style={{left:`calc(${cuBar(catchupVal)}% - 4px)`, background: cuColor(catchupVal)}} />
                                    </div>
                                    <span className="text-[9px] text-slate-300 w-5">+3</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-tight">{cuDesc(catchupVal)}</p>
                                </div>
                              )}

                              {/* qué significa la barra */}
                              <div className="flex items-center gap-3 text-[9px] text-slate-300 pt-1 border-t border-slate-200">
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-1.5 rounded bg-rose-400"/>
                                  <span>Por debajo de sus pares</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-1.5 rounded bg-emerald-200"/>
                                  <span>Zona esperada</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-1.5 rounded bg-emerald-500"/>
                                  <span>Por encima</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* SHAP */}
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <BarChartHorizontal className="w-6 h-6 text-blue-700" />
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em]">
                          Explicabilidad del Caso 
                        </h3>
                        {results?.shap?.method === 'feature_importances_fallback' && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Aproximado
                          </span>
                        )}
                      </div>
                      {allShap.length > 0 ? (
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                          {allShap.map(item => (
                            <ShapBar key={item.feature} item={item} maxAbs={maxShapAbs} />
                          ))}
                          <div className="mt-5 pt-4 border-t border-slate-200 flex justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-emerald-400 rounded-sm" /> Protector
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-rose-400 rounded-sm" /> Factor Riesgo
                            </span>
                          </div>
                          
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-400">
                          SHAP no disponible — instalar shap en el entorno del servidor
                          <code className="block mt-1 text-[10px]">pip install shap</code>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB: PERFIL COGNITIVO ────────────────────────────── */}
                {activeTab === 'cognitivo' && (
                  <div className="flex-grow flex flex-col">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">
                        Perfil Cognitivo Proyectado
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Probabilidades de pertenecer a cada perfil según la inferencia de los modelos. 
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5 flex-grow">

                      {/* WASI */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                          <Brain className="w-6 h-6 text-blue-600" />
                          <div>
                            <h3 className="font-black text-lg text-blue-900 leading-tight">Inteligencia</h3>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest"> Basado en resultados del test WASIIQ</span>
                          </div>
                        </div>
                        {wasiResult ? (
                          <div className="space-y-4 flex-grow">
                            {[
                              ['Desempeño alto',   wasiResult.probabilidad != null && globalResult ? 100 - wasiResult.probabilidad - 10 : 0, 'emerald'],
                              ['Desempeño bajo',  10, 'blue'],
                              ['Riesgo de Déficit',   wasiResult.probabilidad ?? 0, 'rose'],
                            ].map(([label, pct, color]) => (
                              <div key={label}>
                                <div className={`flex justify-between text-xs font-bold mb-1.5 ${color === 'rose' ? 'text-rose-600' : 'text-slate-600'}`}>
                                  <span>{label}</span><span>{Math.max(0, Math.min(100, pct)).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${
                                    color === 'rose' ? 'bg-rose-500' : color === 'emerald' ? 'bg-emerald-400' : 'bg-blue-400'
                                  }`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                                </div>
                              </div>
                            ))}
                        
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center flex-grow flex items-center justify-center">
                            Modelo WASI no disponible
                          </p>
                        )}
                      </div>

                      {/* TAP */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                          <Focus className="w-6 h-6 text-indigo-600" />
                          <div>
                            <h3 className="font-black text-lg text-indigo-900 leading-tight">Atención</h3>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Basado en resultados del test TAP</span>
                          </div>
                        </div>
                        {tapResult ? (
                          <div className="space-y-4 flex-grow">
                            {[
                              ['Atento', 100 - (tapResult.probabilidad ?? 0), 'emerald'],
                              ['Distraído', tapResult.probabilidad ?? 0, 'rose'],
                            ].map(([label, pct, color]) => (
                              <div key={label}>
                                <div className={`flex justify-between text-xs font-bold mb-1.5 ${color === 'rose' ? 'text-rose-600' : 'text-slate-600'}`}>
                                  <span>{label}</span><span>{Math.max(0, Math.min(100, pct)).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${color === 'rose' ? 'bg-rose-500' : 'bg-emerald-400'}`}
                                       style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center flex-grow flex items-center justify-center">
                            Modelo TAP no disponible
                          </p>
                        )}
                      </div>

                      {/* CVLT */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                          <MessageSquare className="w-6 h-6 text-violet-600" />
                          <div>
                            <h3 className="font-black text-lg text-violet-900 leading-tight">Memoria Verbal</h3>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Basado en resultados del test CVLT</span>
                          </div>
                        </div>
                        {cvltResult ? (
                          <div className="space-y-4 flex-grow">
                            {[
                              ['Memoria Alta', 100 - (cvltResult.probabilidad ?? 0), 'emerald'],
                              ['Memoria Baja',  cvltResult.probabilidad ?? 0, 'rose'],
                            ].map(([label, pct, color]) => (
                              <div key={label}>
                                <div className={`flex justify-between text-xs font-bold mb-1.5 ${color === 'rose' ? 'text-rose-600' : 'text-slate-600'}`}>
                                  <span>{label}</span><span>{Math.max(0, Math.min(100, pct)).toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${color === 'rose' ? 'bg-rose-500' : 'bg-emerald-400'}`}
                                       style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center flex-grow flex items-center justify-center">
                            Modelo CVLT no disponible
                          </p>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ── TAB: VALIDACIÓN CIENTÍFICA ───────────────────────── */}
                {activeTab === 'evidencia' && (
                  <div className="flex flex-col flex-grow">

                    {/* ── Título adaptativo ─────────────────────────────── */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                        {isHighRisk || isMedRisk
                          ? 'Qué sabemos de pacientes con este perfil'
                          : 'Perspectiva a los 20 años'}
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Basado en el seguimiento de 20 años realizado por la Fundación Canguro 
                      </p>
                    </div>

                    {/* ── Narrativa principal ───────────────────────────── */}
                    {isHighRisk || isMedRisk ? (
                      <div className="space-y-4 flex-grow animate-in fade-in duration-300">

                        {/* Párrafo 1 — Cerebro */}
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <Brain className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-rose-900 mb-2">
                                Desarrollo cerebral
                              </p>
                              <p className="text-sm text-rose-800 leading-relaxed">
                                Los participantes de la cohorte con un perfil neonatal similar al de este paciente
                                mostraron, a los 20 años, una menor densidad de las fibras de sustancia blanca
                                en las regiones que conectan la memoria con el lenguaje y el movimiento.
                                Esto no implica una lesión visible, sino que el cerebro organizó sus conexiones
                                de forma ligeramente distinta durante el período crítico neonatal —
                                probablemente por la conjunción del crecimiento cerebral más lento y la exposición
                                prolongada al entorno de cuidados intensivos.
                              </p>
                              <EvidenceImg
                                src={IMG.fa_tractos}
                                alt="Conectividad cerebral por perfil GO-i"
                                caption="Diferencias en densidad de fibras cerebrales · cohorte KMC-400-20y"
                                onZoom={(src,alt) => setModalImg({src,alt})}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Párrafo 2 — Aprendizaje y rendimiento */}
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-amber-900 mb-2">
                                Aprendizaje y rendimiento académico
                              </p>
                              <p className="text-sm text-amber-800 leading-relaxed">
                                En las pruebas ICFES a los 20 años, los jóvenes con este fenotipo obtuvieron
                                en promedio alrededor de 8 puntos menos en lectura y comprensión.
                                Esto equivale a la diferencia que se observa, en promedio, entre quien
                                tuvo acceso a acompañamiento académico sostenido y quien no.
                                No es un déficit que cierre puertas por sí solo, pero sí uno que se
                                hace visible cuando el entorno no provee los apoyos adicionales
                                que este perfil requiere.
                              </p>
                              <EvidenceImg
                                src={IMG.icfes}
                                alt="Rendimiento académico ICFES por perfil"
                                caption="Puntaje ICFES a los 20 años — comparación entre perfiles"
                                onZoom={(src,alt) => setModalImg({src,alt})}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Párrafo 3 — Audición y atención */}
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <Focus className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-rose-900 mb-2">
                                Audición y velocidad de procesamiento
                              </p>
                              <p className="text-sm text-rose-800 leading-relaxed">
                                Los jóvenes del grupo de riesgo necesitaron unos 40 milisegundos más
                                para responder a estímulos auditivos en tareas de atención sostenida —
                                una diferencia imperceptible en conversación, pero que acumulada
                                en un aula o un entorno laboral de alta demanda puede traducirse
                                en mayor fatiga cognitiva y menor rendimiento bajo presión.
                                Adicionalmente, presentaron umbrales auditivos ligeramente elevados
                                en todas las frecuencias, lo que sugiere la utilidad de una evaluación
                                audiológica de seguimiento.
                              </p>
                              <EvidenceImg
                                src={IMG.audiometria}
                                alt="Perfil audiométrico por perfil"
                                caption="Umbrales auditivos a los 20 años — comparación entre perfiles"
                                onZoom={(src,alt) => setModalImg({src,alt})}
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                    ) : (

                      /* ── Narrativa GO-1 Alto ─────────────────────────── */
                      <div className="space-y-4 flex-grow animate-in fade-in duration-300">

                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <Brain className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-emerald-900 mb-2">
                                Desarrollo cerebral
                              </p>
                              <p className="text-sm text-emerald-800 leading-relaxed">
                                Los participantes con un perfil neonatal similar al de este paciente
                                mostraron, a los 20 años, una conectividad cerebral dentro del rango
                                esperado para la cohorte de prematuros. Las fibras que conectan
                                la memoria con el lenguaje y el movimiento presentaron una densidad
                                comparable al grupo de mejor rendimiento, lo que sugiere que
                                el período neonatal transcurrió sin comprometer significativamente
                                la organización de las conexiones cerebrales de largo plazo.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-black text-emerald-900 mb-2">
                                Aprendizaje y vida adulta
                              </p>
                              <p className="text-sm text-emerald-800 leading-relaxed">
                                A los 20 años, los jóvenes con este perfil alcanzaron puntajes ICFES
                                y de memoria verbal dentro del rango de la cohorte,
                                con un FSIQ promedio cercano a 92 puntos.
                                Esto no significa ausencia de cualquier desafío — la prematuridad
                                en sí misma puede dejar huellas sutiles — pero el riesgo de déficit
                                cognitivo marcado que predice el fenotipo GO-2 no es el
                                perfil predominante en pacientes como éste.
                                Se recomienda el seguimiento estándar para prematuros,
                                sin necesidad de intensificar el acompañamiento por este
                                motivo específico.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-semibold">Nota clínica:</span> Este resultado refleja
                            el fenotipo cognitivo proyectado basado en el perfil neonatal.
                            Factores posteriores — calidad del entorno educativo, eventos de salud
                            intercurrentes, acceso a estimulación — también influyen en el desarrollo.
                            El seguimiento periódico del neurodesarrollo sigue siendo recomendable
                            para cualquier prematuro.
                          </p>
                        </div>

                      </div>

                    )}
                    {/* ── SHAP global — qué factores determinan la predicción ── */}
                    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <BarChartHorizontal className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-black text-slate-800 mb-1">
                            Qué factores determinan la predicción
                          </p>
                          <p className="text-sm text-slate-500 leading-relaxed">
                            Cada punto en el gráfico es un paciente de la cohorte. Las barras muestran
                            cuánto peso tiene cada variable neonatal en el modelo —{' '}
                            <span className="font-semibold text-slate-700">
                              la velocidad de crecimiento del peso y la recuperación del perímetro
                              cefálico son los predictores más influyentes
                            </span>, seguidos del contexto socioeducativo y los días de oxigenoterapia.
                            Los puntos rojos empujan hacia mayor riesgo; los azules hacia menor riesgo.
                          </p>
                        </div>
                      </div>
                      <GlobalShapChart shapData={allShap} />
                    </div>


                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : (
      <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 md:p-10 min-h-[500px]">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Análisis de clusters</h2>
          <p className="text-slate-500 text-sm max-w-3xl mx-auto">
            Esta sección es independiente del KMC Predictor. Aquí puedes revisar la visualización PCA
            de los clusters del proyecto y comprender la estructura global del dataset.
          </p>
        </div>
        {pcaLoading ? (
          <div className="flex items-center justify-center h-72 text-slate-500">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mr-3" />
            Cargando análisis de PCA...
          </div>
        ) : pcaError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="font-black mb-2">No se pudo cargar el análisis del proyecto</p>
            <p className="text-sm">{pcaError}</p>
          </div>
        ) : (
          <div className="space-y-10">
            <section className="space-y-4">
              <div>
                <p className="text-sm font-black text-slate-900">PCA global del dataset</p>
                <p className="text-sm text-slate-500">
                  Vista general con todas las variables numéricas disponibles. El panel lateral resume
                  clústeres y varianza del mismo gráfico.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] items-start">
                <PCAPlot
                  title="PCA global"
                  subtitle={null}
                  compact
                  hideVarianceInHeader
                  showClusterLegend={false}
                  points={pcaData?.points ?? []}
                  explainedVariance={pcaData?.explained_variance}
                  clusterLabels={pcaData?.cluster_labels}
                />
                <PCAGlobalSummary
                  points={pcaData?.points ?? []}
                  clusterCounts={pcaData?.cluster_counts}
                  clusterLabels={pcaData?.cluster_labels}
                  explainedVariance={pcaData?.explained_variance}
                />
              </div>
            </section>
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">Clústeres por dominio</p>
                  <p className="text-sm text-slate-500">
                    Cada ficha reúne la definición GO-i, la distribución en cohorte y el PCA del mismo contexto (CVLT, TAP o WASI).
                  </p>
                </div>
                {domainLoading && (
                  <div className="text-xs uppercase font-semibold text-blue-600">Cargando dominios...</div>
                )}
              </div>
              {domainError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
                  {domainError}
                </div>
              ) : domainAnalysis?.variants?.length ? (
                <div className="space-y-6">
                  {domainAnalysis.variants.map(variant => (
                    <ClusterDomainCard key={variant.key} variant={variant} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No hay fichas de dominio disponibles.</p>
              )}
            </section>
          </div>
        )}
      </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="max-w-7xl mx-auto w-full mt-6 text-center text-xs text-slate-400 font-medium border-t border-slate-200 pt-5 pb-2">
        <p className="flex items-center justify-center gap-2">
          <Info className="w-4 h-4" />
          Herramienta de apoyo clínico. No reemplaza el juicio del profesional de salud.
        </p>
      </footer>
    </div>
  );
}

