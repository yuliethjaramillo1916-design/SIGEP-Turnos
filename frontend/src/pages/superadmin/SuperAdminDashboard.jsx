import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Building2, Users, Ticket, KeyRound, AlertTriangle,
  Server, Cpu, Database, CheckCircle2, Clock, ArrowUpRight,
  ShieldCheck, RefreshCw, Layers, Sparkles
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/super-admin/dashboard');
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar dashboard de SuperAdmin:', err);
      setError('No se pudo conectar con el servicio maestro de métricas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Auto refresco cada 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{
          width: '45px', height: '45px',
          border: '3px solid rgba(124,58,237,0.2)',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600 }}>Cargando métricas maestras de SIGEP-Turnos...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const { totales = {}, servidor = {}, ultimosEventos = [], resumenEntidades = [] } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado Principal ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span style={{
              fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa',
              background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
              padding: '0.2rem 0.6rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              Control Global
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>•</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Arquitectura Multi-Entidad</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Panel de Control del <span style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SUPER ADMIN</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem', maxWidth: '600px' }}>
            Monitoreo agregado, licencias, clientes institucionales y salud técnica de la plataforma SaaS.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.1rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
          <Link
            to="/super-admin/entidades"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.25rem', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none',
              boxShadow: '0 4px 18px rgba(124,58,237,0.35)', transition: 'all 0.2s'
            }}
          >
            <Building2 size={16} /> Nueva Entidad
          </Link>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', padding: '1rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* ── KPIs Maestros ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Entidades */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(236,72,153,0.2)', borderRadius: '18px', padding: '1.5rem',
          position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(236,72,153,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f472b6', marginBottom: '1rem'
            }}>
              <Building2 size={22} />
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, color: '#4ade80',
              background: 'rgba(34,197,94,0.15)', padding: '0.2rem 0.5rem', borderRadius: '20px'
            }}>
              {totales.entidadesActivas || 0} activas
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {totales.entidades || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', fontWeight: 600 }}>
            Entidades Clientes Totales
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            <span>{totales.entidadesSuspendidas || 0} susp.</span>
            <span>•</span>
            <span>{totales.entidadesArchivadas || 0} archiv.</span>
          </div>
        </div>

        {/* Usuarios de la plataforma */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(139,92,246,0.2)', borderRadius: '18px', padding: '1.5rem',
          position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#a78bfa', marginBottom: '1rem'
            }}>
              <Users size={22} />
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, color: '#c084fc',
              background: 'rgba(139,92,246,0.15)', padding: '0.2rem 0.5rem', borderRadius: '20px'
            }}>
              {totales.administradores || 0} admins
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {totales.usuarios || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', fontWeight: 600 }}>
            Usuarios Totales Plataforma
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            <span>{totales.operadores || 0} operadores</span>
            <span>•</span>
            <span>{totales.vigilantes || 0} vigilantes</span>
          </div>
        </div>

        {/* Turnos Generados Agregados */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(59,130,246,0.2)', borderRadius: '18px', padding: '1.5rem',
          position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#60a5fa', marginBottom: '1rem'
            }}>
              <Ticket size={22} />
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, color: '#60a5fa',
              background: 'rgba(59,130,246,0.15)', padding: '0.2rem 0.5rem', borderRadius: '20px'
            }}>
              Global Agregado
            </span>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {totales.turnosGlobales || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', fontWeight: 600 }}>
            Turnos Emitidos Totales
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            <span>{totales.ventanillas || 0} ventanillas</span>
            <span>•</span>
            <span>{totales.tramites || 0} trámites</span>
          </div>
        </div>

        {/* Licencias Activas & Alertas */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(234,179,8,0.2)', borderRadius: '18px', padding: '1.5rem',
          position: 'relative', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(234,179,8,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#facc15', marginBottom: '1rem'
            }}>
              <KeyRound size={22} />
            </div>
            {totales.licenciasPorVencer > 0 ? (
              <span style={{
                fontSize: '0.7rem', fontWeight: 800, color: '#f87171',
                background: 'rgba(239,68,68,0.15)', padding: '0.2rem 0.5rem', borderRadius: '20px'
              }}>
                {totales.licenciasPorVencer} por vencer
              </span>
            ) : (
              <span style={{
                fontSize: '0.7rem', fontWeight: 800, color: '#4ade80',
                background: 'rgba(34,197,94,0.15)', padding: '0.2rem 0.5rem', borderRadius: '20px'
              }}>
                Al día
              </span>
            )}
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            {totales.licenciasActivas || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', fontWeight: 600 }}>
            Licencias SaaS Activas
          </div>
          <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            Control de vigencia y suscripciones
          </div>
        </div>

      </div>

      {/* ── Fila Doble: Telemetría Servidor + Estado Entidades ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>

        {/* Resumen de Entidades Principales */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>
                Clientes y Entidades Activas
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.2rem 0 0 0' }}>
                Resumen de consumo agregado de recursos vs límites
              </p>
            </div>
            <Link to="/super-admin/entidades" style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              color: '#f472b6', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none'
            }}>
              Ver todas <ArrowUpRight size={15} />
            </Link>
          </div>

          {resumenEntidades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              No hay entidades creadas aún.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {resumenEntidades.map((ent) => {
                const pctUsuarios = Math.min(100, Math.round((ent.usuarios / (ent.maxUsuarios || 1)) * 100));
                return (
                  <div key={ent._id} style={{
                    padding: '1rem', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#f472b6', fontWeight: 800, fontSize: '0.85rem'
                        }}>
                          {ent.logo ? (
                            <img src={ent.logo} alt="" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} />
                          ) : (
                            <Building2 size={18} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>{ent.nombre}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>NIT: {ent.NIT} • Plan: {ent.plan}</div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '20px',
                        background: ent.estado === 'activa' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: ent.estado === 'activa' ? '#4ade80' : '#f87171',
                        textTransform: 'capitalize'
                      }}>
                        {ent.estado}
                      </span>
                    </div>

                    {/* Barra de progreso de usuarios */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                        <span>Cupo de Usuarios: <strong>{ent.usuarios} / {ent.maxUsuarios}</strong></span>
                        <span>{pctUsuarios}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pctUsuarios}%`,
                          background: pctUsuarios > 85 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #7c3aed, #8b5cf6)',
                          borderRadius: '10px', transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Telemetría y Salud del Servidor */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={18} color="#a78bfa" /> Telemetría del Sistema
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.2rem 0 0 0' }}>
              Rendimiento técnico del backend y base de datos
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600 }}>
                <Clock size={14} /> Uptime Node.js
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginTop: '0.4rem' }}>
                {Math.floor((servidor.uptimeSeconds || 0) / 3600)}h {Math.floor(((servidor.uptimeSeconds || 0) % 3600) / 60)}m
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                Servidor activo continuo
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>
                <Database size={14} /> Base de Datos
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80', marginTop: '0.4rem' }}>
                {servidor.dbConnection || 'Conectado'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>
                MongoDB Multi-Tenant
              </div>
            </div>
          </div>

          {/* Consumo de Memoria Heap */}
          <div style={{ padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'white', fontWeight: 700, marginBottom: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={15} color="#8b5cf6" /> Memoria Heap (Node.js)
              </span>
              <span>{servidor.memory?.heapUsedMB || 0} MB / {servidor.memory?.heapTotalMB || 0} MB</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.round(((servidor.memory?.heapUsedMB || 1) / (servidor.memory?.heapTotalMB || 1)) * 100))}%`,
                background: 'linear-gradient(90deg, #7c3aed, #8b5cf6)',
                borderRadius: '10px'
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', padding: '0 0.5rem' }}>
            <span>Versión Node: <strong>{servidor.nodeVersion || 'v20+'}</strong></span>
            <span>Núcleos CPU: <strong>{servidor.cpuCores || 4}</strong></span>
            <span>Plataforma: <strong>{servidor.platform || 'win32'}</strong></span>
          </div>
        </div>

      </div>

      {/* ── Últimos Eventos de Auditoría Global ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>
              Bitácora de Eventos Administrativos Globales
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0.2rem 0 0 0' }}>
              Registro inmutable de acciones sensibles realizadas por el SUPER_ADMIN
            </p>
          </div>
          <Link to="/super-admin/auditoria" style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            color: '#f472b6', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none'
          }}>
            Ver auditoría completa <ArrowUpRight size={15} />
          </Link>
        </div>

        {ultimosEventos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            Sin eventos registrados recientemente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {ultimosEventos.map((ev) => (
              <div key={ev._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800,
                    background: ev.accion?.includes('CREAR') ? 'rgba(34,197,94,0.15)' :
                                ev.accion?.includes('ARCHIVAR') || ev.accion?.includes('SUSPENDER') ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.15)',
                    color: ev.accion?.includes('CREAR') ? '#4ade80' :
                           ev.accion?.includes('ARCHIVAR') || ev.accion?.includes('SUSPENDER') ? '#f87171' : '#c084fc'
                  }}>
                    {ev.accion}
                  </span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{ev.detalles}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {new Date(ev.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
