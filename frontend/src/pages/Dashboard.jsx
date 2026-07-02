import { useState, useEffect } from 'react';
import { Users, Ticket, Clock, CheckCircle, BarChart3, TrendingUp, Calendar, AlertCircle, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';

/* ── Mini sparkline SVG ── */
const Sparkline = ({ data, color = '#a78bfa', height = 32 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80; const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block', opacity: 0.8 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(pts.split(' ').pop().split(',')[0])} cy={parseFloat(pts.split(' ').pop().split(',')[1])} r="3" fill={color} />
    </svg>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    summary: { totalTurnos:0, enEspera:0, atendiendo:0, finalizados:0, cancelados:0, pausados:0, tiempoEsperaPromedio:0, limiteTurnos:0 },
    tramitesDistribucion: {},
    horasDistribucion: Array(24).fill(0)
  });
  const [loading, setLoading]         = useState(true);
  const [ventanillas, setVentanillas] = useState([]);
  const [ultimosTurnos, setUltimosTurnos] = useState([]);
  const [sparkData, setSparkData]     = useState({ total:[], espera:[], atendiendo:[], finalizados:[] });
  const [calMes, setCalMes] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  /* Reloj en tiempo real */
  const [horaActual, setHoraActual] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setHoraActual(d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchExtra();
    const interval = setInterval(() => { fetchStats(); fetchExtra(); }, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reportes/dashboard');
      if (response.data) {
        setStats(response.data);
        // Acumular sparkline con el valor actual
        setSparkData(prev => ({
          total:       [...prev.total.slice(-11),       response.data.summary.totalTurnos],
          espera:      [...prev.espera.slice(-11),      response.data.summary.enEspera],
          atendiendo:  [...prev.atendiendo.slice(-11),  response.data.summary.atendiendo],
          finalizados: [...prev.finalizados.slice(-11), response.data.summary.finalizados],
        }));
      }
      setLoading(false);
    } catch (error) { setLoading(false); }
  };

  const fetchExtra = async () => {
    try {
      const [ventRes, turnosRes] = await Promise.all([
        api.get('/ventanillas'),
        api.get('/turnos'),
      ]);
      setVentanillas(ventRes.data || []);
      setUltimosTurnos((turnosRes.data || []).slice(0, 6));
    } catch {}
  };

  // Helper para dar formato legible al tiempo promedio de espera (segundos)
  const formatTime = (segundos) => {
    if (!segundos || segundos <= 0) return '0 seg';
    if (segundos < 60) return `${segundos} seg`;
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return seg > 0 ? `${min} min ${seg} seg` : `${min} min`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--primary)', fontWeight: 'bold' }}>
        <span>Cargando datos del Dashboard...</span>
      </div>
    );
  }

  const { summary, tramitesDistribucion, horasDistribucion } = stats;

  const cards = [
    {
      label: 'Total Turnos del Día',
      value: summary.limiteTurnos > 0
        ? `${summary.totalTurnos} / ${summary.limiteTurnos}`
        : summary.totalTurnos,
      subtext: summary.limiteTurnos > 0
        ? `${Math.round(summary.totalTurnos / summary.limiteTurnos * 100)}% del límite diario`
        : null,
      spark: sparkData.total, sparkColor: '#a78bfa',
      icon: <Ticket size={24} style={{ color: '#a78bfa' }} />,
      color: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)',
    },
    { label: 'En Cola de Espera',   value: summary.enEspera,    spark: sparkData.espera,      sparkColor: '#fbbf24', icon: <Clock size={24} style={{ color: '#fbbf24' }} />,        color: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
    { label: 'Atendiendo Ahora',    value: summary.atendiendo,  spark: sparkData.atendiendo,  sparkColor: '#38bdf8', icon: <Users size={24} style={{ color: '#38bdf8' }} />,        color: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.3)'  },
    { label: 'Atendidos con Éxito', value: summary.finalizados, spark: sparkData.finalizados, sparkColor: '#34d399', icon: <CheckCircle size={24} style={{ color: '#34d399' }} />,  color: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  ];

  // Encontrar el valor máximo de horasDistribucion para escalar las barras SVG del gráfico
  const maxHorasCount = Math.max(...horasDistribucion, 1);
  
  // Filtrar horas hábiles (ej: 8:00 a 18:00) para hacer el gráfico más compacto y elegante
  const horasHabiles = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  // Procesar distribución por trámites para el gráfico de barras horizontales
  const tramitesArray = Object.keys(tramitesDistribucion).map(key => ({
    name: key,
    value: tramitesDistribucion[key]
  })).sort((a, b) => b.value - a.value);

  const totalTramitesCount = tramitesArray.reduce((acc, t) => acc + t.value, 0) || 1;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Título de Cabecera */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Panel de Control
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Monitoreo analítico y desempeño operativo en tiempo real.
          </p>
        </div>
        {/* Fecha + hora */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px',
          background:'rgba(255,255,255,0.04)', border:'1px solid rgba(124,58,237,0.2)',
          borderRadius:'14px', padding:'0.6rem 1.1rem',
        }}>
          <span style={{ fontSize:'0.68rem', fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
            {new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </span>
          <span style={{ fontSize:'1.35rem', fontWeight:800, color:'white', letterSpacing:'0.05em', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>
            {horaActual}
          </span>
        </div>
      </div>

      {/* ── Banner Hero + Mini Calendario ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:'1.25rem', marginBottom:'2rem', alignItems:'stretch' }} className="hero-grid">

        {/* Banner izquierdo */}
        <div style={{
          borderRadius: '20px',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(124,58,237,0.35)',
          minHeight: '160px',
        }}>
          {/* Imagen de fondo */}
          <img
            src="/turnos.png"
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              display: 'block',
              userSelect: 'none', pointerEvents: 'none',
            }}
          />
          {/* Overlay sutil solo para legibilidad del texto */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',
          }} />
          {/* Orbes decorativos */}
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'200px', height:'200px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:'-30px', right:'80px', width:'120px', height:'120px', borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:1, padding: '1.75rem 2rem' }}>
          </div>
        </div>

        {/* Mini calendario a la derecha del banner */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px',
          border: '1px solid var(--border)',
          padding: '1.25rem',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.875rem' }}>
            <button onClick={()=>setCalMes(p=>{const d=new Date(p.year,p.month-1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', padding:'3px' }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize:'0.82rem', fontWeight:800, color:'rgba(255,255,255,0.75)', textTransform:'capitalize' }}>
              {new Date(calMes.year,calMes.month).toLocaleDateString('es-ES',{month:'long',year:'numeric'})}
            </span>
            <button onClick={()=>setCalMes(p=>{const d=new Date(p.year,p.month+1,1);return{year:d.getFullYear(),month:d.getMonth()};})}
              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', display:'flex', padding:'3px' }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Cabecera días semana */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'1px', marginBottom:'4px' }}>
            {['D','L','M','X','J','V','S'].map(d=>(
              <div key={d} style={{ textAlign:'center', fontSize:'0.62rem', fontWeight:700, color:'rgba(255,255,255,0.25)', padding:'2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Días del mes */}
          {(()=>{
            const hoy=new Date();
            const first=new Date(calMes.year,calMes.month,1).getDay();
            const dias=new Date(calMes.year,calMes.month+1,0).getDate();
            const diasConAct=new Set(ultimosTurnos.map(t=>{
              const f=t.createdAt?new Date(t.createdAt):null;
              return f&&f.getMonth()===calMes.month&&f.getFullYear()===calMes.year?f.getDate():null;
            }).filter(Boolean));
            const celdas=[];
            for(let i=0;i<first;i++) celdas.push(null);
            for(let d=1;d<=dias;d++) celdas.push(d);
            return(
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px' }}>
                {celdas.map((d,i)=>{
                  const esHoy=d&&d===hoy.getDate()&&calMes.month===hoy.getMonth()&&calMes.year===hoy.getFullYear();
                  const tieneAct=d&&diasConAct.has(d);
                  return(
                    <div key={i} style={{
                      textAlign:'center', fontSize:'0.72rem', fontWeight:esHoy?800:400,
                      padding:'5px 2px', borderRadius:'7px', position:'relative',
                      background:esHoy?'linear-gradient(135deg,#7c3aed,#a855f7)':'transparent',
                      color:esHoy?'white':d?'rgba(255,255,255,0.6)':'transparent',
                      cursor: d ? 'default' : 'default',
                    }}>
                      {d||''}
                      {tieneAct&&!esHoy&&(
                        <span style={{ position:'absolute', bottom:'2px', left:'50%', transform:'translateX(-50%)', width:'4px', height:'4px', borderRadius:'50%', background:'#a78bfa', display:'block' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>{/* fin hero-grid */}

      {/* ── Layout principal: columna izquierda (contenido) + columna derecha (panel) ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'1.5rem', alignItems:'start' }} className="dash-main-grid">

        {/* ── COLUMNA IZQUIERDA ── */}
        <div style={{ minWidth:0 }}>

      {/* Grid de Tarjetas de Estadísticas */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {cards.map((card, index) => (
          <div key={index} className="card dashboard-card" style={{ 
            background: 'var(--bg-card)', 
            border: `1px solid ${card.border}`, 
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</p>
                <h2 style={{ fontSize: card.value?.toString().includes('/') ? '1.75rem' : '2.25rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                  {card.value}
                </h2>
                {/* Barra de progreso cuando hay límite */}
                {card.subtext && summary.limiteTurnos > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round(summary.totalTurnos / summary.limiteTurnos * 100))}%`,
                        background: summary.totalTurnos >= summary.limiteTurnos ? '#f87171' : '#a78bfa',
                        borderRadius: '2px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    <p style={{ fontSize: '0.68rem', color: summary.totalTurnos >= summary.limiteTurnos ? '#f87171' : 'rgba(255,255,255,0.35)', marginTop: '3px', fontWeight: 600 }}>
                      {card.subtext}
                    </p>
                  </div>
                )}
                {/* Sparkline */}
                {!card.subtext && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Sparkline data={card.spark} color={card.sparkColor} height={28} />
                  </div>
                )}
              </div>
              <div style={{ 
                padding: '0.875rem', borderRadius: '14px', 
                background: card.color, border: `1px solid ${card.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {card.icon}
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: card.color, borderTop: `1px solid ${card.border}` }}></div>
          </div>
        ))}

        {/* Tiempo Promedio de Espera — ocupa 2 columnas */}
        <div className="card dashboard-card" style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          border: '1px solid rgba(5,150,105,0.4)',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', alignItems: 'center', gap: '1.25rem',
          color: 'white',
          gridColumn: 'span 2',
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '14px', flexShrink: 0 }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>T. Espera Prom.</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.3rem', letterSpacing: '-0.025em', lineHeight: 1 }}>
              {formatTime(summary.tiempoEsperaPromedio)}
            </h2>
            <p style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '0.4rem' }}>Base: {summary.finalizados + summary.atendiendo} turnos hoy</p>
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.2)' }}></div>
        </div>
      </div>

      {/* Grid de Gráficos SVG */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* Gráfico 1: Afluencia Horaria (SVG) */}
        <div className="card" style={{ border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Afluencia de Turnos por Hora</h3>
          </div>
          
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 0.5rem 1.5rem', borderBottom: '2px solid rgba(255,255,255,0.07)', position: 'relative' }}>
            {horasHabiles.map((hora) => {
              const count = horasDistribucion[hora] || 0;
              const barHeight = Math.max(5, (count / maxHorasCount) * 160);
              return (
                <div key={hora} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                  {/* Tooltip de valor */}
                  <span style={{ 
                    position: 'absolute', 
                    bottom: `${barHeight + 10}px`, 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: count > 0 ? '#a78bfa' : 'rgba(255,255,255,0.2)',
                    background: count > 0 ? 'rgba(124,58,237,0.15)' : 'transparent',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px'
                  }}>
                    {count}
                  </span>
                  
                  {/* Barra */}
                  <div className="chart-bar" style={{ 
                    width: '65%', 
                    height: `${barHeight}px`, 
                    background: count > 0 ? 'linear-gradient(to top, #7c3aed 0%, #a78bfa 100%)' : 'rgba(255,255,255,0.08)', 
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.5s ease',
                    cursor: 'pointer'
                  }}></div>
                  
                  {/* Etiqueta hora */}
                  <span style={{ position: 'absolute', top: '10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {String(hora).padStart(2, '0')}:00
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico 2: Trámites más Solicitados */}
        <div className="card" style={{ border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--success)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Distribución por Tipo de Trámite</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '220px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {tramitesArray.length > 0 ? tramitesArray.map((t, index) => {
              const percentage = Math.round((t.value / totalTramitesCount) * 100);
              // Colores variados para trámites
              const barColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
              const color = barColors[index % barColors.length];
              
              return (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-main)' }}>{t.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{t.value} turnos ({percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.8s ease' }}></div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
                <span>No hay datos de trámites para mostrar hoy.</span>
              </div>
            )}
          </div>
        </div>

      </div>

        {/* cierre columna izquierda */}
        </div>

        {/* ── COLUMNA DERECHA fija ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', position:'sticky', top:'0px', alignSelf:'start', maxHeight:'calc(100vh - 64px)', overflowY:'auto' }}>

          {/* Estado de Ventanillas */}
          <div className="card" style={{ border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem' }}>
              <Monitor size={16} style={{ color:'#34d399' }} />
              <h3 style={{ fontSize:'0.95rem', fontWeight:700 }}>Ventanillas</h3>
              <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>{ventanillas.length} total</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', maxHeight:'180px', overflowY:'auto' }}>
              {ventanillas.length===0 ? (
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'0.75rem' }}>Sin ventanillas</div>
              ) : ventanillas.map(v => (
                <div key={v._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.45rem 0.65rem', borderRadius:'8px', background:'rgba(255,255,255,0.03)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:v.estado==='activa'?'#34d399':'rgba(255,255,255,0.15)', boxShadow:v.estado==='activa'?'0 0 6px #34d399':'none', flexShrink:0 }} />
                    <span style={{ fontSize:'0.8rem', fontWeight:600 }}>V. {v.numero}</span>
                    {v.nombre && <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.3)' }}>{v.nombre}</span>}
                  </div>
                  <span style={{ fontSize:'0.7rem', color:v.estado==='activa'?'#34d399':'rgba(255,255,255,0.2)', fontWeight:600 }}>
                    {v.operador?`${v.operador.nombre}`:'Libre'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Últimas actividades */}
          <div className="card" style={{ border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem' }}>
              <BarChart3 size={16} style={{ color:'#a78bfa' }} />
              <h3 style={{ fontSize:'0.95rem', fontWeight:700 }}>Actividad Reciente</h3>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', maxHeight:'220px', overflowY:'auto' }}>
              {ultimosTurnos.length===0 ? (
                <div style={{ textAlign:'center', padding:'1.5rem', color:'rgba(255,255,255,0.2)', fontSize:'0.82rem' }}>Sin actividad</div>
              ) : ultimosTurnos.map((t,i)=>(
                <div key={t._id||i} style={{ display:'flex', alignItems:'center', gap:'0.65rem', padding:'0.5rem 0.6rem', borderRadius:'9px', background:'rgba(255,255,255,0.03)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(124,58,237,0.08)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                >
                  <div style={{ width:'28px', height:'28px', borderRadius:'7px', flexShrink:0,
                    background: t.estado==='FINALIZADO'?'rgba(52,211,153,0.15)':t.estado==='ESPERA'?'rgba(251,191,36,0.15)':'rgba(124,58,237,0.15)',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Ticket size={13} style={{ color: t.estado==='FINALIZADO'?'#34d399':t.estado==='ESPERA'?'#fbbf24':'#a78bfa' }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:700 }}>{t.codigoTurno}</div>
                    <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {t.tramite?.nombre||'—'}
                    </div>
                  </div>
                  <span style={{
                    fontSize:'0.6rem', fontWeight:700, padding:'0.15rem 0.4rem', borderRadius:'999px', whiteSpace:'nowrap',
                    background: t.estado==='FINALIZADO'?'rgba(52,211,153,0.15)':t.estado==='ESPERA'?'rgba(251,191,36,0.15)':'rgba(56,189,248,0.15)',
                    color: t.estado==='FINALIZADO'?'#34d399':t.estado==='ESPERA'?'#fbbf24':'#38bdf8',
                  }}>{t.estado}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>{/* fin dash-main-grid */}

      <style>{`
        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2) !important;
        }
        .chart-bar:hover { opacity: 0.85; filter: brightness(0.95); }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @media (max-width: 1200px) { .dash-main-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 900px)  { .hero-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default Dashboard;
