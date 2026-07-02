import { useState, useEffect, useRef } from 'react';
import {
  BarChart3, Clock, CheckCircle2, XCircle,
  Filter, Search, RefreshCw, CalendarRange,
  TrendingUp, Printer, Calendar
} from 'lucide-react';
import api from '../services/api';
import DarkSelect from '../components/DarkSelect';

const formatSegundos = (seg) => {
  if (!seg || seg <= 0) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ESPERA', label: 'En Espera' },
  { value: 'ATENDIENDO', label: 'Atendiendo' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'PAUSADO', label: 'Pausado' },
];

/* ─── Normaliza fecha de un turno a YYYY-MM-DD local ─── */
const normFecha = (t) => {
  if (t.createdAt) {
    const d = new Date(t.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  if (t.fecha && /^\d{4}-\d{2}-\d{2}/.test(t.fecha)) return t.fecha.slice(0,10);
  return '';
};

/* ─── Gráfica de barras SVG pura ─── */
const BarChart = ({ data, title, subtitle, colorFin, colorCanc, height = 200 }) => {
  if (!data || data.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height, color:'rgba(255,255,255,0.2)', fontSize:'0.85rem' }}>
      Sin datos en el período
    </div>
  );

  const maxVal  = Math.max(...data.map(d => d.total), 1);
  const N       = data.length;
  const BAR_W   = 32;
  const GAP     = 16;
  const PAD_L   = 52;
  const PAD_R   = 16;
  const PAD_T   = 24;          // espacio superior para que el número más alto no se corte
  const LABEL_H = 28;
  const chartH  = height;
  const chartW  = PAD_L + N * (BAR_W + GAP) - GAP + PAD_R;
  const SVG_H   = PAD_T + chartH + LABEL_H;

  const yTicks = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.4rem' }}>
        <BarChart3 size={18} style={{ color:'#a78bfa' }} />
        <h3 style={{ fontSize:'1rem', fontWeight:700 }}>{title}</h3>
      </div>
      <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', marginBottom:'1.25rem' }}>{subtitle}</p>

      <div style={{ overflowX:'auto' }}>
        <svg width={chartW} height={SVG_H} style={{ display:'block' }}>

          {/* Líneas de cuadrícula + etiquetas Y — todas desplazadas PAD_T hacia abajo */}
          {yTicks.map(f => {
            const y = PAD_T + chartH * (1 - f);
            return (
              <g key={f}>
                <line x1={PAD_L} y1={y} x2={chartW - PAD_R} y2={y}
                  stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4,4" />
                <text x={PAD_L - 6} y={y + 4} textAnchor="end"
                  fontSize="11" fill="rgba(255,255,255,0.75)" fontWeight="600">
                  {Math.round(maxVal * f)}
                </text>
              </g>
            );
          })}

          {/* Línea base */}
          <line x1={PAD_L} y1={PAD_T + chartH} x2={chartW - PAD_R} y2={PAD_T + chartH}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {/* Barras */}
          {data.map((d, i) => {
            const x    = PAD_L + i * (BAR_W + GAP);
            const base = PAD_T + chartH;

            const hFin  = d.finalizados > 0 ? Math.max(6, (d.finalizados / maxVal) * (chartH - 12)) : 0;
            const hCanc = d.cancelados  > 0 ? Math.max(4, (d.cancelados  / maxVal) * (chartH - 12)) : 0;
            const resto = d.total - d.finalizados - d.cancelados;
            const hRest = resto > 0          ? Math.max(4, (resto         / maxVal) * (chartH - 12)) : 0;
            const totalH = hFin + hCanc + hRest;

            return (
              <g key={i}>
                {hRest > 0 && <rect x={x} y={base - totalH}        width={BAR_W} height={hRest} fill="rgba(124,58,237,0.45)" rx="4" />}
                {hCanc > 0 && <rect x={x} y={base - hFin - hCanc}  width={BAR_W} height={hCanc} fill={colorCanc || '#f87171'} fillOpacity="0.85" rx="3" />}
                {hFin  > 0 && <rect x={x} y={base - hFin}          width={BAR_W} height={hFin}  fill={colorFin  || '#34d399'} rx="3" />}
                {d.total === 0 && <rect x={x} y={base - 3} width={BAR_W} height={3} fill="rgba(255,255,255,0.08)" rx="2" />}

                {/* Número encima de la barra */}
                {d.total > 0 && (
                  <text x={x + BAR_W/2} y={base - totalH - 7}
                    textAnchor="middle" fontSize="12" fill="white" fontWeight="700">
                    {d.total}
                  </text>
                )}

                {/* Etiqueta eje X */}
                <text x={x + BAR_W/2} y={base + 18}
                  textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.6)" fontWeight="500">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda */}
      <div style={{ display:'flex', gap:'1.25rem', marginTop:'0.875rem', flexWrap:'wrap' }}>
        {[
          { color: colorFin  || '#34d399',         label: 'Finalizados' },
          { color: colorCanc || '#f87171',         label: 'Cancelados'  },
          { color: 'rgba(124,58,237,0.7)',          label: 'Otros'       },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'3px', background:l.color }} />
            <span style={{ fontSize:'0.73rem', color:'rgba(255,255,255,0.5)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Gráfica de dona SVG pura ─── */
const DonutChart = ({ data, title, subtitle }) => {
  if (!data || data.length === 0 || data.every(d => d.value === 0)) return (
    <div className="card" style={{ padding:'1.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.4rem' }}>
        <TrendingUp size={18} style={{ color:'#a78bfa' }} />
        <h3 style={{ fontSize:'1rem', fontWeight:700 }}>{title}</h3>
      </div>
      <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', marginBottom:'1rem' }}>{subtitle}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:180, color:'rgba(255,255,255,0.2)', fontSize:'0.85rem' }}>Sin datos</div>
    </div>
  );

  const total = data.reduce((s,d) => s + d.value, 0) || 1;
  const r = 70, cx = 90, cy = 90, strokeW = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="card" style={{ padding:'1.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.4rem' }}>
        <TrendingUp size={18} style={{ color:'#a78bfa' }} />
        <h3 style={{ fontSize:'1rem', fontWeight:700 }}>{title}</h3>
      </div>
      <p style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)', marginBottom:'1rem' }}>{subtitle}</p>

      <div style={{ display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
        <svg width={180} height={180} style={{ flexShrink:0 }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} />
          {data.map((d, i) => {
            const dash = (d.value / total) * circ;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={d.color} strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset + circ * 0.25}
                strokeLinecap="round"
                style={{ transition:'stroke-dasharray 0.6s ease' }}
              />
            );
            offset += dash;
            return el;
          })}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="800" fill="white">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.4)">turnos</text>
        </svg>

        <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem', flex:1 }}>
          {data.map(d => (
            <div key={d.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:d.color, flexShrink:0 }} />
                <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.6)' }}>{d.label}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <span style={{ fontSize:'0.85rem', fontWeight:700, color:'white' }}>{d.value}</span>
                <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)' }}>{Math.round(d.value/total*100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Reportes = () => {
  const today = new Date().toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [buscar, setBuscar] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [tramites, setTramites] = useState([]);
  const [filterTramite, setFilterTramite] = useState('');
  const [todosLosTurnos, setTodosLosTurnos] = useState([]); // todos para gráficas

  const [resumen, setResumen] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [vistaGraficas, setVistaGraficas] = useState('semanal'); // semanal | mensual | anual

  const printRef = useRef();

  useEffect(() => {
    api.get('/tramites').then(res => setTramites(res.data || [])).catch(() => {});
    // Cargar TODOS los turnos para gráficas globales
    api.get('/turnos').then(res => setTodosLosTurnos(res.data || [])).catch(() => {});
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

  // Filtro local por búsqueda y estado
  const filteredDetalles = detalles.filter(t => {
    const matchBuscar = !buscar || t.codigoTurno?.toLowerCase().includes(buscar.toLowerCase());
    const matchEstado = !filterEstado || t.estado === filterEstado;
    return matchBuscar && matchEstado;
  });

  const handlePrint = () => { window.print(); };

  /* ─── Procesar datos para gráficas ─── */
  const procesarSemanal = () => {
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const hoy = new Date();
    const resultado = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(hoy.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const turnos = todosLosTurnos.filter(t => normFecha(t) === iso);
      resultado.push({
        label: dias[d.getDay()],
        total: turnos.length,
        finalizados: turnos.filter(t => t.estado === 'FINALIZADO').length,
        cancelados:  turnos.filter(t => t.estado === 'CANCELADO').length,
      });
    }
    return resultado;
  };

  const procesarMensual = () => {
    const hoy = new Date();
    const resultado = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const turnos = todosLosTurnos.filter(t => {
        const f = normFecha(t); return f && f.startsWith(mes);
      });
      resultado.push({
        label: d.toLocaleDateString('es-ES', { month: 'short' }),
        total: turnos.length,
        finalizados: turnos.filter(t => t.estado === 'FINALIZADO').length,
        cancelados:  turnos.filter(t => t.estado === 'CANCELADO').length,
      });
    }
    return resultado;
  };

  const procesarAnual = () => {
    const hoy = new Date();
    const resultado = [];
    for (let i = 4; i >= 0; i--) {
      const anio = hoy.getFullYear() - i;
      const turnos = todosLosTurnos.filter(t => {
        const f = normFecha(t); return f && f.startsWith(String(anio));
      });
      resultado.push({
        label: String(anio),
        total: turnos.length,
        finalizados: turnos.filter(t => t.estado === 'FINALIZADO').length,
        cancelados:  turnos.filter(t => t.estado === 'CANCELADO').length,
      });
    }
    return resultado;
  };

  const procesarDonutEstados = (fuente) => [
    { label: 'Finalizados',  value: fuente.filter(t => t.estado === 'FINALIZADO').length,  color: '#34d399' },
    { label: 'Cancelados',   value: fuente.filter(t => t.estado === 'CANCELADO').length,   color: '#f87171' },
    { label: 'En Espera',    value: fuente.filter(t => t.estado === 'ESPERA').length,       color: '#a78bfa' },
    { label: 'Atendiendo',   value: fuente.filter(t => t.estado === 'ATENDIENDO').length,   color: '#38bdf8' },
  ];

  const procesarDonutTramites = (fuente) => {
    const mapa = {};
    fuente.forEach(t => {
      const nombre = t.tramite?.nombre || 'Otro';
      mapa[nombre] = (mapa[nombre] || 0) + 1;
    });
    const colores = ['#a78bfa','#34d399','#fbbf24','#38bdf8','#f472b6','#fb923c'];
    return Object.entries(mapa).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v],i) => ({ label:k, value:v, color:colores[i%colores.length] }));
  };

  const dataSemanal  = procesarSemanal();
  const dataMensual  = procesarMensual();
  const dataAnual    = procesarAnual();
  const fuenteActual = vistaGraficas === 'semanal'
    ? todosLosTurnos.filter(t => { const f=normFecha(t); const hoy=new Date(); const d7=new Date(hoy); d7.setDate(hoy.getDate()-7); return f >= `${d7.getFullYear()}-${String(d7.getMonth()+1).padStart(2,'0')}-${String(d7.getDate()).padStart(2,'0')}`; })
    : vistaGraficas === 'mensual'
    ? todosLosTurnos.filter(t => { const f=normFecha(t); const hoy=new Date(); return f && f.startsWith(`${hoy.getFullYear()}-`); })
    : todosLosTurnos;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Reportes Históricos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Consulta y filtra el historial completo de turnos por rango de fechas y trámite.
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
      <div className="card" style={{ marginBottom: '1.5rem' }}>
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

      {/* Results */}
      {searched && !loading && resumen && (
        <div ref={printRef}>
          {/* Summary Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ borderTop: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>TOTAL TURNOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.total}</div>
                </div>
                <div style={{ background: 'rgba(37,99,235,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
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
                    {resumen.total > 0 ? Math.round(resumen.finalizados / resumen.total * 100) : 0}% completados
                  </p>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                </div>
              </div>
            </div>
            <div className="card" style={{ borderTop: '3px solid var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>CANCELADOS</p>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{resumen.cancelados}</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
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
                </div>
                <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '10px', padding: '0.6rem' }}>
                  <Clock size={22} style={{ color: 'var(--warning)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECCIÓN DE GRÁFICAS (siempre visible con datos disponibles) ── */}
      {todosLosTurnos.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>

          {/* Selector de vista */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem', flexWrap:'wrap', gap:'0.75rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <Calendar size={18} style={{ color:'#a78bfa' }} />
              <h2 style={{ fontSize:'1.1rem', fontWeight:700 }}>Análisis Gráfico de Turnos</h2>
            </div>
            <div style={{ display:'flex', gap:'0.35rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(124,58,237,0.18)', padding:'0.25rem', borderRadius:'10px' }}>
              {[['semanal','Semanal'],['mensual','Mensual'],['anual','Anual']].map(([v,l]) => (
                <button key={v} onClick={() => setVistaGraficas(v)} style={{
                  padding:'0.45rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:'0.82rem', fontWeight:600, transition:'all 0.2s',
                  background: vistaGraficas === v ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                  color: vistaGraficas === v ? 'white' : 'rgba(255,255,255,0.4)',
                  boxShadow: vistaGraficas === v ? '0 3px 12px rgba(124,58,237,0.4)' : 'none',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Fila 1: Barra principal según vista */}
          <div style={{ marginBottom:'1.25rem' }}>
            {vistaGraficas === 'semanal' && (
              <BarChart data={dataSemanal} title="Turnos de los Últimos 7 Días" subtitle="Distribución diaria de todos los turnos emitidos" colorFin="#34d399" colorCanc="#f87171" height={200} />
            )}
            {vistaGraficas === 'mensual' && (
              <BarChart data={dataMensual} title="Turnos por Mes — Últimos 12 Meses" subtitle="Evolución mensual del volumen de atención" colorFin="#38bdf8" colorCanc="#f87171" height={200} />
            )}
            {vistaGraficas === 'anual' && (
              <BarChart data={dataAnual} title="Turnos por Año — Últimos 5 Años" subtitle="Tendencia anual histórica de turnos emitidos" colorFin="#a78bfa" colorCanc="#f87171" height={200} />
            )}
          </div>

          {/* Fila 2: Dos donas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
            <DonutChart
              data={procesarDonutEstados(fuenteActual)}
              title="Distribución por Estado"
              subtitle={`Período ${vistaGraficas}`}
            />
            <DonutChart
              data={procesarDonutTramites(fuenteActual)}
              title="Top Trámites Solicitados"
              subtitle={`Período ${vistaGraficas}`}
            />
          </div>

          {/* Fila 3: Las otras dos barras */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
            {vistaGraficas !== 'semanal' && (
              <BarChart data={dataSemanal} title="Últimos 7 Días" subtitle="Vista rápida semanal" colorFin="#34d399" colorCanc="#f87171" height={160} />
            )}
            {vistaGraficas !== 'mensual' && (
              <BarChart data={dataMensual} title="Últimos 12 Meses" subtitle="Evolución mensual" colorFin="#38bdf8" colorCanc="#f87171" height={160} />
            )}
            {vistaGraficas !== 'anual' && (
              <BarChart data={dataAnual} title="Últimos 5 Años" subtitle="Tendencia anual" colorFin="#a78bfa" colorCanc="#f87171" height={160} />
            )}
          </div>
        </div>
      )}

      {/* Empty state before search */}
      {!searched && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <CalendarRange size={52} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Genera tu primer reporte</h3>
          <p>Selecciona un rango de fechas y presiona <strong>"Generar Reporte"</strong> para ver el historial de turnos.</p>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={40} style={{ color: 'var(--primary)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: 600 }}>Consultando datos del servidor...</p>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .sidebar, .modal-overlay, button, .filter-panel { display: none !important; }
          .main-content { padding: 0 !important; }
          body { background: white; }
          .card { box-shadow: none; border: 1px solid #e2e8f0; }
          @keyframes spin { to { transform: rotate(360deg); } }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Reportes;
