import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Server, Cpu, Database, Activity, RefreshCw, CheckCircle2,
  Clock, ShieldCheck, HardDrive, Layers, Zap
} from 'lucide-react';

export default function SuperAdminMonitoreo() {
  const [monitoreo, setMonitoreo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoreo = async () => {
    try {
      const res = await api.get('/super-admin/monitoreo');
      setMonitoreo(res.data);
    } catch (err) {
      console.error('Error al cargar monitoreo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoreo();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoreo, 10000); // 10s
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>Consultando telemetría del servidor...</div>;
  }

  const { uptime = {}, memoria = {}, cpu = {}, baseDeDatos = {}, metricasGlobales = {} } = monitoreo || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(34,197,94,0.15)',
              color: '#4ade80', fontSize: '0.75rem', fontWeight: 800
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              Estado: {monitoreo?.estadoGeneral || 'OPERACIONAL'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
              Latencia DB: <strong style={{ color: '#c084fc' }}>{baseDeDatos.latenciaMs} ms</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Salud y Monitoreo del Servidor
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Telemetría de recursos en tiempo real, latencias de infraestructura y rendimiento de Node.js.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
              background: autoRefresh ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${autoRefresh ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: autoRefresh ? '#4ade80' : 'rgba(255,255,255,0.5)', cursor: 'pointer'
            }}
          >
            {autoRefresh ? '⚡ Auto-refresco Activo (10s)' : 'Pausado'}
          </button>
          <button
            onClick={fetchMonitoreo}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} /> Refrescar Ahora
          </button>
        </div>
      </div>

      {/* ── Tarjetas de Telemetría ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Memoria Node.js */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(236,72,153,0.2)', borderRadius: '20px', padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f472b6', marginBottom: '1rem' }}>
            <Cpu size={20} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>Memoria Heap (Node.js)</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {memoria.heapUsedMB || 0} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>MB</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem' }}>
            Total Asignado: <strong>{memoria.heapTotalMB || 0} MB</strong> • RSS: {memoria.rssMB || 0} MB
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', marginTop: '1.25rem', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.round(((Number(memoria.heapUsedMB) || 1) / (Number(memoria.heapTotalMB) || 1)) * 100))}%`,
              background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)', borderRadius: '10px'
            }} />
          </div>
        </div>

        {/* Memoria Sistema Operativo */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#a78bfa', marginBottom: '1rem' }}>
            <HardDrive size={20} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>Memoria RAM del Servidor</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {memoria.porcentajeUsoSistema || 0}% <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>en uso</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem' }}>
            Libre: <strong>{memoria.sistemaLibreGB} GB</strong> / Total: {memoria.sistemaTotalGB} GB
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', marginTop: '1.25rem', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${memoria.porcentajeUsoSistema || 0}%`,
              background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', borderRadius: '10px'
            }} />
          </div>
        </div>

        {/* Base de Datos */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(34,197,94,0.2)', borderRadius: '20px', padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#4ade80', marginBottom: '1rem' }}>
            <Database size={20} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>MongoDB Multi-Tenant</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4ade80', lineHeight: 1 }}>
            {baseDeDatos.latenciaMs} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>ms ping</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem' }}>
            Base de datos: <strong>{baseDeDatos.nombreDB || 'sigep_turnos'}</strong> ({baseDeDatos.estado})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '1.25rem' }}>
            Host: {baseDeDatos.host || 'localhost'}
          </div>
        </div>

      </div>

      {/* ── Especificaciones del Entorno ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.75rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: '0 0 1rem 0' }}>
          Especificaciones de Ejecución
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Tiempo Activo Continuo</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginTop: '0.3rem' }}>{uptime.formatoLegible}</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Arquitectura del Procesador</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginTop: '0.3rem' }}>{cpu.nucleos} Núcleos</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{cpu.modelo?.slice(0, 24)}</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Total de Entidades</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f472b6', marginTop: '0.3rem' }}>{metricasGlobales.totalEntidades || 0}</div>
          </div>

          <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Turnos Emitidos Acumulados</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.3rem' }}>{metricasGlobales.totalTurnos || 0}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
