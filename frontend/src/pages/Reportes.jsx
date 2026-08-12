import { useState, useEffect, useRef } from 'react';
import {
  BarChart3, Clock, CheckCircle2, XCircle,
  Filter, Search, RefreshCw, CalendarRange,
  TrendingUp, Printer, Calendar, FileText,
  AlertTriangle, PieChart, Layers
} from 'lucide-react';
import api from '../services/api';
import DarkSelect from '../components/DarkSelect';

/* ─── Formateo legible de segundos ─── */
const formatSegundos = (seg) => {
  if (!seg || seg <= 0) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

/* ─── Opciones de estado para filtros y badges ─── */
const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'ESPERA', label: 'En Espera' },
  { value: 'ATENDIENDO', label: 'Atendiendo' },
  { value: 'PAUSADO', label: 'Pausado' },
];

const estadoBadge = {
  FINALIZADO: { label: 'Finalizado', cls: 'badge-success', color: '#34d399' },
  CANCELADO:  { label: 'Cancelado',  cls: 'badge-danger',  color: '#f87171' },
  ESPERA:     { label: 'En Espera',  cls: 'badge-warning', color: '#fbbf24' },
  ATENDIENDO: { label: 'Atendiendo', cls: 'badge-primary', color: '#38bdf8' },
  PAUSADO:    { label: 'Pausado',    cls: 'badge-neutral', color: '#94a3b8' },
};

/* ─── Normaliza fecha de un turno a YYYY-MM-DD local ─── */
const normFecha = (t) => {
  if (t?.fecha && /^\d{4}-\d{2}-\d{2}/.test(t.fecha)) {
    return t.fecha.slice(0, 10);
  }
  if (t?.createdAt) {
    const d = new Date(t.createdAt);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return '';
};

/* ─── Componente Gráfica de Barras SVG Pura ─── */
const BarChart = ({ data, title, subtitle, colorFin = '#34d399', colorCanc = '#f87171', height = 210 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Sin datos disponibles para este período</p>
      </div>
    );
  }

  const rawMax = Math.max(...data.map(d => d.total || 0), 0);
  // Escala mínima amigable si todo es 0 o números pequeños
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 5;
  const N = data.length;
  const BAR_W = N <= 7 ? 36 : N <= 12 ? 26 : 42;
  const GAP = N <= 7 ? 20 : N <= 12 ? 14 : 24;
  const PAD_L = 48;
  const PAD_R = 24;
  const PAD_T = 28;
  const LABEL_H = 32;
  const chartH = height;
  const chartW = Math.max(PAD_L + N * (BAR_W + GAP) - GAP + PAD_R, 340);
  const SVG_H = PAD_T + chartH + LABEL_H;

  const yTicks = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{ background: 'rgba(124,58,237,0.18)', padding: '0.45rem', borderRadius: '8px' }}>
            <BarChart3 size={18} style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{subtitle}</p>}
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, background: 'rgba(124,58,237,0.12)', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
          Total período: {data.reduce((acc, d) => acc + (d.total || 0), 0)}
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', marginTop: '1rem' }}>
        <svg width="100%" height={SVG_H} viewBox={`0 0 ${chartW} ${SVG_H}`} style={{ minWidth: `${chartW}px`, display: 'block' }}>
          {/* Líneas de cuadrícula y etiquetas del eje Y */}
          {yTicks.map(f => {
            const y = PAD_T + chartH * (1 - f);
            const val = Math.round(maxVal * f);
            return (
              <g key={f}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={chartW - PAD_R}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={PAD_L - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="rgba(255,255,255,0.5)"
                  fontWeight="600"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Línea base eje X */}
          <line
            x1={PAD_L}
            y1={PAD_T + chartH}
            x2={chartW - PAD_R}
            y2={PAD_T + chartH}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
          />

          {/* Barras compuestas */}
          {data.map((d, i) => {
            const x = PAD_L + i * (BAR_W + GAP);
            const base = PAD_T + chartH;

            const total = d.total || 0;
            const fin = d.finalizados || 0;
            const canc = d.cancelados || 0;
            const resto = Math.max(0, total - fin - canc);

            const hFin = fin > 0 ? Math.max(4, (fin / maxVal) * chartH) : 0;
            const hCanc = canc > 0 ? Math.max(4, (canc / maxVal) * chartH) : 0;
            const hRest = resto > 0 ? Math.max(4, (resto / maxVal) * chartH) : 0;
            const totalH = hFin + hCanc + hRest;

            return (
              <g key={i} className="chart-bar-group">
                {/* Barra base tenue si no hay turnos */}
                {total === 0 && (
                  <rect
                    x={x}
                    y={base - 4}
                    width={BAR_W}
                    height={4}
                    fill="rgba(255,255,255,0.08)"
                    rx="2"
                  />
                )}

                {/* Segmento Otros / En Espera */}
                {hRest > 0 && (
                  <rect
                    x={x}
                    y={base - totalH}
                    width={BAR_W}
                    height={hRest}
                    fill="rgba(124,58,237,0.55)"
                    rx="3"
                  />
                )}

                {/* Segmento Cancelados */}
                {hCanc > 0 && (
                  <rect
                    x={x}
                    y={base - hFin - hCanc}
                    width={BAR_W}
                    height={hCanc}
                    fill={colorCanc}
                    fillOpacity="0.9"
                    rx="3"
                  />
                )}

                {/* Segmento Finalizados */}
                {hFin > 0 && (
                  <rect
                    x={x}
                    y={base - hFin}
                    width={BAR_W}
                    height={hFin}
                    fill={colorFin}
                    rx="3"
                  />
                )}

                {/* Etiqueta numérica superior */}
                {total > 0 && (
                  <text
                    x={x + BAR_W / 2}
                    y={base - totalH - 7}
                    textAnchor="middle"
                    fontSize="11"
                    fill="white"
                    fontWeight="700"
                  >
                    {total}
                  </text>
                )}

                {/* Etiqueta del Eje X */}
                <text
                  x={x + BAR_W / 2}
                  y={base + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="rgba(255,255,255,0.7)"
                  fontWeight="500"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda interactiva */}
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.85rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        {[
          { color: colorFin, label: 'Finalizados' },
          { color: colorCanc, label: 'Cancelados' },
          { color: 'rgba(124,58,237,0.7)', label: 'En Espera / Otros' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Componente Gráfica de Dona SVG Pura ─── */
const DonutChart = ({ data, title, subtitle }) => {
  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0);
  const r = 68, cx = 85, cy = 85, strokeW = 20;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
        <div style={{ background: 'rgba(124,58,237,0.18)', padding: '0.45rem', borderRadius: '8px' }}>
          <TrendingUp size={18} style={{ color: '#a78bfa' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{subtitle}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem', flex: 1 }}>
        <svg width={170} height={170} style={{ flexShrink: 0, margin: '0 auto' }}>
          {/* Círculo base de fondo */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeW}
          />
          {total > 0 && data.map((d, i) => {
            const val = d.value || 0;
            if (val <= 0) return null;
            const dash = (val / total) * circ;
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset + circ * 0.25}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            );
            offset += dash;
            return el;
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="24" fontWeight="800" fill="white">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">turnos</text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, minWidth: '160px' }}>
          {data && data.length > 0 ? (
            data.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {d.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{d.value}</span>
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', minWidth: '32px', textAlign: 'right' }}>
                    {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
              Sin datos registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Reportes = () => {
  const getTodayISO = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
  };

  const today = getTodayISO();

  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [buscar, setBuscar] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [tramites, setTramites] = useState([]);
  const [filterTramite, setFilterTramite] = useState('');
  const [todosLosTurnos, setTodosLosTurnos] = useState([]); // Histórico completo para los diagramas

  const [resumen, setResumen] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [vistaGraficas, setVistaGraficas] = useState('semanal'); // semanal | mensual | anual | todos

  const printRef = useRef();

  useEffect(() => {
    // Cargar trámites para el filtro
    api.get('/tramites').then(res => setTramites(res.data || [])).catch(() => {});
    
    // Cargar todos los turnos para construir los diagramas anuales, mensuales y semanales
    api.get('/turnos').then(res => setTodosLosTurnos(res.data || [])).catch(() => {});
    
    // Generar el reporte del día actual por defecto
    handleBuscar();
  }, []);

  const handleBuscar = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin)    params.append('fechaFin', fechaFin);
      if (filterTramite) params.append('tramiteId', filterTramite);

      const res = await api.get(`/reportes/historico?${params.toString()}`);
      setResumen(res.data.resumen || null);
      setDetalles(res.data.detalles || []);
    } catch (err) {
      alert('Error al generar el reporte: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Filtro reactivo local para la tabla de turnos
  const filteredDetalles = detalles.filter(t => {
    const matchBuscar = !buscar || t.codigoTurno?.toLowerCase().includes(buscar.toLowerCase());
    const matchEstado = !filterEstado || t.estado === filterEstado;
    return matchBuscar && matchEstado;
  });

  const handlePrint = () => {
    window.print();
  };

  /* ─── Procesador Semanal: Últimos 7 días ─── */
  const procesarSemanal = () => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const hoy = new Date();
    const resultado = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const turnos = todosLosTurnos.filter(t => normFecha(t) === iso);
      resultado.push({
        label: `${dias[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`,
        total: turnos.length,
        finalizados: turnos.filter(t => t.estado === 'FINALIZADO').length,
        cancelados: turnos.filter(t => t.estado === 'CANCELADO').length,
      });
    }
    return resultado;
  };

  /* ─── Procesador Mensual: 12 meses del año en curso ─── */
  const procesarMensual = () => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const anioActual = new Date().getFullYear();
    const resultado = [];
    for (let m = 0; m < 12; m++) {
      const mesPrefijo = `${anioActual}-${String(m + 1).padStart(2, '0')}`;
      const turnos = todosLosTurnos.filter(t => {
        const f = normFecha(t);
        return f && f.startsWith(mesPrefijo);
      });
      resultado.push({
        label: meses[m],
        total: turnos.length,
        finalizados: turnos.filter(t => t.estado === 'FINALIZADO').length,
        cancelados: turnos.filter(t => t.estado === 'CANCELADO').length,
      });
    }
    return resultado;
  };

  /* ─── Procesador Anual: Últimos 5 años ─── */
  const procesarAnual = () => {
    const anioActual = new Date().getFullYear();
    const resultado = [];
    for (let i = 4; i >= 0; i--) {
      const anio = anioActual - i;
      const turnos = todosLosTurnos.filter(t => {
        const f = normFecha(t);
        return f && f.startsWith(String(anio));
      });
      resultado.push({
        label: String(anio),
        total: turnos.length,
        finalizados: turnos.filter(t => t.estado === 'FINALIZADO').length,
        cancelados: turnos.filter(t => t.estado === 'CANCELADO').length,
      });
    }
    return resultado;
  };

  /* ─── Procesadores de Donas ─── */
  const procesarDonutEstados = (fuente) => [
    { label: 'Finalizados', value: fuente.filter(t => t.estado === 'FINALIZADO').length, color: '#34d399' },
    { label: 'Cancelados',  value: fuente.filter(t => t.estado === 'CANCELADO').length,  color: '#f87171' },
    { label: 'En Espera',   value: fuente.filter(t => t.estado === 'ESPERA').length,     color: '#fbbf24' },
    { label: 'Atendiendo',  value: fuente.filter(t => t.estado === 'ATENDIENDO').length, color: '#38bdf8' },
    { label: 'Pausados',    value: fuente.filter(t => t.estado === 'PAUSADO').length,   color: '#94a3b8' },
  ];

  const procesarDonutTramites = (fuente) => {
    const mapa = {};
    fuente.forEach(t => {
      const nombre = t.tramite?.nombre || 'General / Otro';
      mapa[nombre] = (mapa[nombre] || 0) + 1;
    });
    const colores = ['#a78bfa', '#34d399', '#fbbf24', '#38bdf8', '#f472b6', '#fb923c', '#818cf8'];
    const entries = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
    
    if (entries.length === 0) {
      return [{ label: 'Sin trámites', value: 0, color: '#a78bfa' }];
    }

    return entries.slice(0, 6).map(([k, v], i) => ({
      label: k,
      value: v,
      color: colores[i % colores.length]
    }));
  };

  const dataSemanal = procesarSemanal();
  const dataMensual = procesarMensual();
  const dataAnual = procesarAnual();

  // Fuente de datos para las donas según la vista seleccionada
  const fuenteActual = () => {
    const hoy = new Date();
    if (vistaGraficas === 'semanal') {
      const d7 = new Date(hoy);
      d7.setDate(hoy.getDate() - 7);
      const iso7 = `${d7.getFullYear()}-${String(d7.getMonth() + 1).padStart(2, '0')}-${String(d7.getDate()).padStart(2, '0')}`;
      return todosLosTurnos.filter(t => normFecha(t) >= iso7);
    }
    if (vistaGraficas === 'mensual') {
      const anio = hoy.getFullYear();
      return todosLosTurnos.filter(t => normFecha(t).startsWith(`${anio}-`));
    }
    return todosLosTurnos;
  };

  const datosDonut = fuenteActual();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Reportes Históricos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Consulta y filtra el historial completo de turnos por rango de fechas, trámite y análisis gráfico.
          </p>
        </div>
        {resumen && (
          <button
            className="btn btn-outline"
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <Printer size={18} /> Imprimir Reporte
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <div className="card filter-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <Filter size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Filtros de Búsqueda</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.83rem' }}>Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{ marginTop: '0.35rem', borderRadius: '8px' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.83rem' }}>Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{ marginTop: '0.35rem', borderRadius: '8px' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.83rem' }}>Trámite</label>
            <DarkSelect
              value={filterTramite}
              onChange={setFilterTramite}
              options={[
                { value: '', label: 'Todos los trámites' },
                ...tramites.map(t => ({ value: t._id, label: t.nombre }))
              ]}
              placeholder="Todos los trámites"
              style={{ marginTop: '0.35rem' }}
            />
          </div>
          <div style={{ marginBottom: 0 }}>
            <button
              className="btn btn-primary"
              onClick={handleBuscar}
              disabled={loading}
              style={{ width: '100%', fontWeight: 700, borderRadius: '8px', justifyContent: 'center' }}
            >
              {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              {loading ? ' Consultando...' : ' Generar Reporte'}
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de KPIs */}
      {searched && resumen && (
        <div ref={printRef}>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderTop: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>TOTAL TURNOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.total}</div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>En período filtrado</p>
                </div>
                <div style={{ background: 'rgba(124,58,237,0.15)', borderRadius: '10px', padding: '0.6rem' }}>
                  <BarChart3 size={22} style={{ color: 'var(--primary)' }} />
                </div>
              </div>
            </div>

            <div className="card" style={{ borderTop: '3px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>FINALIZADOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.finalizados}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                    {resumen.total > 0 ? Math.round((resumen.finalizados / resumen.total) * 100) : 0}% completados
                  </p>
                </div>
                <div style={{ background: 'rgba(52,211,153,0.15)', borderRadius: '10px', padding: '0.6rem' }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                </div>
              </div>
            </div>

            <div className="card" style={{ borderTop: '3px solid var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>CANCELADOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.cancelados}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                    {resumen.total > 0 ? Math.round((resumen.cancelados / resumen.total) * 100) : 0}% cancelados
                  </p>
                </div>
                <div style={{ background: 'rgba(248,113,113,0.15)', borderRadius: '10px', padding: '0.6rem' }}>
                  <XCircle size={22} style={{ color: 'var(--danger)' }} />
                </div>
              </div>
            </div>

            <div className="card" style={{ borderTop: '3px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>T. ESPERA PROMEDIO</p>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {formatSegundos(resumen.tiempoEsperaPromedio)}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Tiempo en sala</p>
                </div>
                <div style={{ background: 'rgba(251,191,36,0.15)', borderRadius: '10px', padding: '0.6rem' }}>
                  <Clock size={22} style={{ color: 'var(--warning)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECCIÓN DE DIAGRAMAS ESTADÍSTICOS (SEMANAL, MENSUAL, ANUAL) ── */}
      <div style={{ marginTop: '1.75rem', marginBottom: '2rem' }}>
        {/* Selector de Pestañas de Diagramas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(124,58,237,0.2)', padding: '0.5rem', borderRadius: '10px' }}>
              <BarChart3 size={20} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Diagramas de Rendimiento y Volumen
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Análisis comparativo de atención anual, mensual y semanal
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,58,237,0.2)', padding: '0.3rem', borderRadius: '12px' }}>
            {[
              { key: 'semanal', label: 'Semanal', icon: <Calendar size={15} /> },
              { key: 'mensual', label: 'Mensual', icon: <Layers size={15} /> },
              { key: 'anual',   label: 'Anual',   icon: <TrendingUp size={15} /> },
              { key: 'todos',   label: 'Ver Todos', icon: <PieChart size={15} /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setVistaGraficas(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '9px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  background: vistaGraficas === tab.key ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' : 'transparent',
                  color: vistaGraficas === tab.key ? 'white' : 'rgba(255,255,255,0.5)',
                  boxShadow: vistaGraficas === tab.key ? '0 4px 14px rgba(124,58,237,0.45)' : 'none',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Renderizado de Diagramas según vista */}
        {vistaGraficas === 'semanal' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <BarChart
              data={dataSemanal}
              title="Diagrama Semanal — Últimos 7 Días"
              subtitle="Evolución diaria de turnos emitidos, finalizados y cancelados"
              colorFin="#34d399"
              colorCanc="#f87171"
              height={220}
            />
          </div>
        )}

        {vistaGraficas === 'mensual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <BarChart
              data={dataMensual}
              title="Diagrama Mensual — Año en Curso"
              subtitle="Distribución mensual del flujo de atención en los 12 meses del año"
              colorFin="#38bdf8"
              colorCanc="#f87171"
              height={220}
            />
          </div>
        )}

        {vistaGraficas === 'anual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <BarChart
              data={dataAnual}
              title="Diagrama Anual — Histórico de 5 Años"
              subtitle="Tendencia y comparativa histórica de volumen de atención anual"
              colorFin="#a78bfa"
              colorCanc="#f87171"
              height={220}
            />
          </div>
        )}

        {vistaGraficas === 'todos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <BarChart
              data={dataSemanal}
              title="Diagrama Semanal (Últimos 7 Días)"
              subtitle="Volumen diario de turnos"
              colorFin="#34d399"
              colorCanc="#f87171"
              height={190}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              <BarChart
                data={dataMensual}
                title="Diagrama Mensual (Año Actual)"
                subtitle="Comportamiento por mes"
                colorFin="#38bdf8"
                colorCanc="#f87171"
                height={180}
              />
              <BarChart
                data={dataAnual}
                title="Diagrama Anual (5 Años)"
                subtitle="Tendencia histórica"
                colorFin="#a78bfa"
                colorCanc="#f87171"
                height={180}
              />
            </div>
          </div>
        )}

        {/* Fila de Gráficos Circulares (Donas): Estado y Trámites */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
          <DonutChart
            data={procesarDonutEstados(datosDonut)}
            title="Distribución por Estado"
            subtitle={`Período analizado: ${vistaGraficas === 'todos' ? 'general' : vistaGraficas}`}
          />
          <DonutChart
            data={procesarDonutTramites(datosDonut)}
            title="Top Trámites Solicitados"
            subtitle={`Mayor demanda en el período ${vistaGraficas === 'todos' ? 'general' : vistaGraficas}`}
          />
        </div>
      </div>

      {/* ── TABLA DE DETALLE HISTÓRICO ── */}
      {searched && !loading && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Detalle Individual de Turnos
              </h3>
            </div>

            {/* Filtros secundarios de la tabla */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Buscar por código..."
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', height: '38px', borderRadius: '8px', fontSize: '0.85rem' }}
                />
              </div>

              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                style={{
                  borderRadius: '8px',
                  height: '38px',
                  minWidth: '160px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border)',
                  padding: '0 0.75rem',
                  fontSize: '0.85rem'
                }}
              >
                {ESTADO_OPTS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {filteredDetalles.length} registro(s)
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Trámite</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Atendido por</th>
                  <th>Ventanilla</th>
                  <th>Fecha / Hora</th>
                  <th>T. Espera</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetalles.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      <AlertTriangle size={36} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '0.75rem', display: 'block', margin: '0 auto' }} />
                      <span>No se encontraron registros de turnos para los filtros seleccionados.</span>
                    </td>
                  </tr>
                ) : (
                  filteredDetalles.map((t) => {
                    const badgeInfo = estadoBadge[t.estado] || { label: t.estado, cls: 'badge-primary', color: '#818cf8' };
                    return (
                      <tr key={t._id}>
                        <td>
                          <code style={{
                            background: 'rgba(124,58,237,0.18)',
                            color: '#c4b5fd',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            border: '1px solid rgba(124,58,237,0.3)'
                          }}>
                            {t.codigoTurno}
                          </code>
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.88rem', color: 'white' }}>
                            {t.tramite?.nombre || '—'}
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${t.prioridad === 'PRIORITARIO' ? 'badge-danger' : 'badge-primary'}`}>
                            {t.prioridad}
                          </span>
                          {t.motivoPrioridad && (
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                              {t.motivoPrioridad}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${badgeInfo.cls}`}>
                            {badgeInfo.label}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {t.usuarioAtencion ? (
                            `${t.usuarioAtencion.nombre} ${t.usuarioAtencion.apellido || ''}`
                          ) : (
                            <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No asignado</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {t.ventanilla ? (
                            <span style={{ fontWeight: 600, color: 'white' }}>{t.ventanilla}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <div>{t.fecha || normFecha(t)}</div>
                          <div style={{ fontWeight: 600, color: 'white' }}>{t.hora || '—'}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                          {formatSegundos(t.tiempoEspera)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado inicial si no se ha buscado */}
      {!searched && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <CalendarRange size={52} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Genera tu reporte</h3>
          <p>Selecciona un rango de fechas y presiona <strong>"Generar Reporte"</strong> para ver el historial y análisis detallado.</p>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={40} style={{ color: 'var(--primary)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: 600 }}>Consultando datos del servidor...</p>
        </div>
      )}

      {/* Estilos para impresión y animaciones */}
      <style>{`
        @media print {
          .sidebar, .modal-overlay, button, .filter-panel, header { display: none !important; }
          .main-content { padding: 0 !important; }
          body { background: white !important; color: black !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; background: white !important; color: black !important; }
          text { fill: black !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Reportes;
