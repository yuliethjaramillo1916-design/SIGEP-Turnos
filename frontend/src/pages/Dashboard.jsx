import { useState, useEffect } from 'react';
import { Users, Ticket, Clock, CheckCircle, BarChart3, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    summary: {
      totalTurnos: 0,
      enEspera: 0,
      atendiendo: 0,
      finalizados: 0,
      cancelados: 0,
      pausados: 0,
      tiempoEsperaPromedio: 0
    },
    tramitesDistribucion: {},
    horasDistribucion: Array(24).fill(0)
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Polling cada 5s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reportes/dashboard');
      if (response.data) {
        setStats(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setLoading(false);
    }
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
    { label: 'Total Turnos del Día', value: summary.totalTurnos, icon: <Ticket size={24} style={{ color: '#2563eb' }} />, color: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', text: '#1e40af' },
    { label: 'En Cola de Espera', value: summary.enEspera, icon: <Clock size={24} style={{ color: '#d97706' }} />, color: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)', text: '#854d0e' },
    { label: 'Atendiendo Ahora', value: summary.atendiendo, icon: <Users size={24} style={{ color: '#0891b2' }} />, color: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)', text: '#0e7490' },
    { label: 'Atendidos con Éxito', value: summary.finalizados, icon: <CheckCircle size={24} style={{ color: '#16a34a' }} />, color: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', text: '#166534' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
            Panel de Control
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Monitoreo analítico y desempeño operativo en tiempo real.
          </p>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          background: 'white', 
          padding: '0.5rem 1rem', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-muted)'
        }}>
          <Calendar size={16} />
          <span>Hoy: {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Grid de Tarjetas de Estadísticas */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {cards.map((card, index) => (
          <div key={index} className="card" style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="dashboard-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{card.label}</p>
                <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginTop: '0.5rem', color: '#1e293b', letterSpacing: '-0.03em' }}>
                  {card.value}
                </h2>
              </div>
              <div style={{ 
                padding: '1rem', 
                borderRadius: '16px', 
                background: card.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {card.icon}
              </div>
            </div>
            {/* Soft decorative underline */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: card.color }}></div>
          </div>
        ))}
      </div>

      {/* Sección Secundaria - Tiempos y Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Tarjeta Tiempo Promedio */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', border: '1px solid var(--border)', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '1.25rem', borderRadius: '16px' }}>
            <TrendingUp size={36} />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 500 }}>Tiempo Promedio de Espera</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem', letterSpacing: '-0.025em' }}>
              {formatTime(summary.tiempoEsperaPromedio)}
            </h2>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>Calculado en base a {summary.finalizados + summary.atendiendo} turnos hoy.</p>
          </div>
        </div>

        {/* Tarjeta de Resumen Extra */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Turnos Cancelados</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>{summary.cancelados}</h3>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', height: '40px' }}></div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Turnos Pausados</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>{summary.pausados}</h3>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', height: '40px' }}></div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Tasa de Eficacia</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
              {summary.totalTurnos > 0 ? `${Math.round((summary.finalizados / summary.totalTurnos) * 100)}%` : '0%'}
            </h3>
          </div>
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
          
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 0.5rem 1.5rem', borderBottom: '2px solid #e2e8f0', position: 'relative' }}>
            {horasHabiles.map((hora) => {
              const count = horasDistribucion[hora] || 0;
              const barHeight = Math.max(5, (count / maxHorasCount) * 160); // Max 160px height
              return (
                <div key={hora} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                  {/* Tooltip de valor */}
                  <span style={{ 
                    position: 'absolute', 
                    bottom: `${barHeight + 10}px`, 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: count > 0 ? 'var(--primary)' : 'var(--text-muted)',
                    background: count > 0 ? '#eff6ff' : 'transparent',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px'
                  }}>
                    {count}
                  </span>
                  
                  {/* Barra SVG/CSS */}
                  <div style={{ 
                    width: '65%', 
                    height: `${barHeight}px`, 
                    background: count > 0 ? 'linear-gradient(to top, #3b82f6 0%, #60a5fa 100%)' : '#cbd5e1', 
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.5s ease',
                    cursor: 'pointer'
                  }}
                  className="chart-bar"
                  ></div>
                  
                  {/* Etiqueta hora */}
                  <span style={{ position: 'absolute', top: '10px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                    <span style={{ color: '#334155' }}>{t.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{t.value} turnos ({percentage}%)</span>
                  </div>
                  {/* Container de barra */}
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
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

      <style>{`
        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }
        .chart-bar:hover {
          opacity: 0.85;
          filter: brightness(0.95);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
