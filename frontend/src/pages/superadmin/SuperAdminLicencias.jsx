import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  KeyRound, Plus, RefreshCw, AlertTriangle, CheckCircle2,
  Calendar, Building2, Users, Monitor, BookOpen, Clock, X,
  ShieldCheck, ShieldAlert, Sparkles
} from 'lucide-react';

export default function SuperAdminLicencias() {
  const [licencias, setLicencias] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [modalRenovar, setModalRenovar] = useState(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [mesesRenovacion, setMesesRenovacion] = useState(12);

  const [formCrear, setFormCrear] = useState({
    entidadId: '',
    planId: '',
    mesesDuracion: 12,
    notas: ''
  });

  const [procesando, setProcesando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const fetchLicencias = async () => {
    try {
      setLoading(true);
      const [resLic, resEnt, resPlan] = await Promise.all([
        api.get('/super-admin/licencias'),
        api.get('/super-admin/entidades'),
        api.get('/super-admin/planes')
      ]);
      setLicencias(resLic.data || []);
      setEntidades(resEnt.data || []);
      setPlanes(resPlan.data || []);

      if (!formCrear.entidadId && resEnt.data?.length > 0) {
        setFormCrear(prev => ({ ...prev, entidadId: resEnt.data[0]._id }));
      }
      if (!formCrear.planId && resPlan.data?.length > 0) {
        setFormCrear(prev => ({ ...prev, planId: resPlan.data[0]._id }));
      }
    } catch (err) {
      console.error('Error al cargar licencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicencias();
  }, []);

  const handleRenovar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setErrorModal(null);
    try {
      await api.post(`/super-admin/licencias/${modalRenovar._id}/renovar`, {
        mesesAdicionales: mesesRenovacion
      });
      setModalRenovar(null);
      fetchLicencias();
    } catch (err) {
      setErrorModal(err.response?.data?.message || 'Error al renovar la licencia');
    } finally {
      setProcesando(false);
    }
  };

  const handleCrearLicencia = async (e) => {
    e.preventDefault();
    setProcesando(true);
    setErrorModal(null);
    try {
      await api.post('/super-admin/licencias', formCrear);
      setModalCrear(false);
      fetchLicencias();
    } catch (err) {
      setErrorModal(err.response?.data?.message || 'Error al emitir licencia');
    } finally {
      setProcesando(false);
    }
  };

  const handleCambiarEstado = async (licenciaId, nuevoEstado) => {
    try {
      await api.patch(`/super-admin/licencias/${licenciaId}/estado`, { estado: nuevoEstado });
      fetchLicencias();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado de licencia');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ── Encabezado ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', margin: 0 }}>
            Licencias y Suscripciones SaaS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Control de claves de activación, vigencias, renovación y consumo de cuotas contratadas.
          </p>
        </div>

        <button
          onClick={() => { setModalCrear(true); setErrorModal(null); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1.4rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none',
            boxShadow: '0 6px 20px rgba(124,58,237,0.35)', cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Emitir Nueva Licencia
        </button>
      </div>

      {/* ── Tabla de Licencias ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>Cargando licencias...</div>
      ) : licencias.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)',
          borderRadius: '18px', border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <KeyRound size={40} color="rgba(255,255,255,0.3)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>No hay licencias emitidas</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>
            Las licencias se generan automáticamente al crear una entidad o puedes emitir una manualmente.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>Clave de Licencia</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Entidad Cliente</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Plan</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Consumo vs Límites</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Fecha Vencimiento</th>
                <th style={{ padding: '1rem', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {licencias.map((lic) => {
                const consumo = lic.consumo || {};
                const users = consumo.usuarios || { actual: 0, limite: lic.limiteUsuarios || 10 };
                const vents = consumo.ventanillas || { actual: 0, limite: lic.limiteVentanillas || 5 };
                const trams = consumo.tramites || { actual: 0, limite: lic.limiteTramites || 15 };

                const fechaVenc = new Date(lic.fechaVencimiento);
                const diasRestantes = Math.ceil((fechaVenc - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={lic._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}>
                    
                    {/* Clave */}
                    <td style={{ padding: '1.1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: 'rgba(234,179,8,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#facc15', flexShrink: 0
                        }}>
                          <KeyRound size={16} />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>
                            {lic.claveLicencia}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                            ID: {lic._id?.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Entidad */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, color: 'white' }}>{lic.entidadId?.nombre || 'Entidad no encontrada'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>NIT: {lic.entidadId?.NIT}</div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontWeight: 700, color: '#c084fc' }}>{lic.planId?.nombre || 'Personalizado'}</span>
                    </td>

                    {/* Consumo */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                        <div>Users: <strong style={{ color: users.actual >= users.limite ? '#ef4444' : 'white' }}>{users.actual}/{users.limite}</strong></div>
                        <div>Vents: <strong style={{ color: vents.actual >= vents.limite ? '#ef4444' : 'white' }}>{vents.actual}/{vents.limite}</strong></div>
                        <div>Trámites: <strong style={{ color: trams.actual >= trams.limite ? '#ef4444' : 'white' }}>{trams.actual}/{trams.limite}</strong></div>
                      </div>
                    </td>

                    {/* Vencimiento */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: 'white' }}>{fechaVenc.toLocaleDateString()}</div>
                      <div style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        color: diasRestantes < 0 ? '#ef4444' : diasRestantes <= 15 ? '#f59e0b' : '#4ade80'
                      }}>
                        {diasRestantes < 0 ? 'Vencida' : `${diasRestantes} días restantes`}
                      </div>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '20px',
                        background: lic.estado === 'activa' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: lic.estado === 'activa' ? '#4ade80' : '#f87171', textTransform: 'capitalize'
                      }}>
                        {lic.estado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => { setModalRenovar(lic); setErrorModal(null); }}
                          title="Renovar vigencia"
                          style={{
                            padding: '0.45rem 0.85rem', borderRadius: '8px',
                            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                            color: '#c084fc', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                          }}
                        >
                          <RefreshCw size={13} /> Renovar
                        </button>

                        <button
                          onClick={() => handleCambiarEstado(lic._id, lic.estado === 'activa' ? 'suspendida' : 'activa')}
                          style={{
                            padding: '0.45rem 0.75rem', borderRadius: '8px',
                            background: lic.estado === 'activa' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                            border: `1px solid ${lic.estado === 'activa' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                            color: lic.estado === 'activa' ? '#f87171' : '#4ade80', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer'
                          }}
                        >
                          {lic.estado === 'activa' ? 'Suspender' : 'Activar'}
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ MODAL RENOVAR LICENCIA ══════════════ */}
      {modalRenovar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '480px', background: '#121022', border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} color="#a78bfa" /> Renovar Licencia
              </h2>
              <button onClick={() => setModalRenovar(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
              Entidad: <strong style={{ color: 'white' }}>{modalRenovar.entidadId?.nombre}</strong><br />
              Clave: <span style={{ fontFamily: 'monospace', color: '#f472b6' }}>{modalRenovar.claveLicencia}</span>
            </div>

            {errorModal && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', padding: '0.8rem', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1.25rem'
              }}>
                <AlertTriangle size={16} /> {errorModal}
              </div>
            )}

            <form onSubmit={handleRenovar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.4rem' }}>
                  PERÍODO DE EXTENSIÓN
                </label>
                <select
                  value={mesesRenovacion} onChange={e => setMesesRenovacion(Number(e.target.value))}
                  style={{
                    width: '100%', height: '44px', padding: '0 0.8rem', background: '#1a1830',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none'
                  }}
                >
                  <option value={1}>1 Mes adicional</option>
                  <option value={3}>3 Meses (Trimestral)</option>
                  <option value={6}>6 Meses (Semestral)</option>
                  <option value={12}>12 Meses (1 Año completo)</option>
                  <option value={24}>24 Meses (2 Años)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button" onClick={() => setModalRenovar(null)}
                  style={{
                    padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={procesando}
                  style={{
                    padding: '0.75rem 1.5rem', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                    border: 'none', color: 'white', fontWeight: 800, cursor: procesando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {procesando ? 'Renovando...' : 'Confirmar Renovación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL CREAR LICENCIA MANUAL ══════════════ */}
      {modalCrear && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '520px', background: '#121022', border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: '20px', padding: '2rem', boxShadow: '0 25px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'white', margin: 0 }}>
                Emitir Nueva Licencia SaaS
              </h2>
              <button onClick={() => setModalCrear(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {errorModal && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px', padding: '0.8rem', color: '#fca5a5', fontSize: '0.82rem', marginBottom: '1.25rem'
              }}>
                <AlertTriangle size={16} /> {errorModal}
              </div>
            )}

            <form onSubmit={handleCrearLicencia} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                  ENTIDAD DESTINO *
                </label>
                <select
                  value={formCrear.entidadId} onChange={e => setFormCrear({ ...formCrear, entidadId: e.target.value })}
                  style={{
                    width: '100%', height: '42px', padding: '0 0.8rem', background: '#1a1830',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none'
                  }}
                >
                  {entidades.map(ent => (
                    <option key={ent._id} value={ent._id}>{ent.nombre} (NIT: {ent.NIT})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                  PLAN SAAS *
                </label>
                <select
                  value={formCrear.planId} onChange={e => setFormCrear({ ...formCrear, planId: e.target.value })}
                  style={{
                    width: '100%', height: '42px', padding: '0 0.8rem', background: '#1a1830',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', outline: 'none'
                  }}
                >
                  {planes.map(p => (
                    <option key={p._id} value={p._id}>{p.nombre} (${p.precio}/mes)</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                  VIGENCIA (MESES) *
                </label>
                <input
                  type="number" min={1} required
                  value={formCrear.mesesDuracion} onChange={e => setFormCrear({ ...formCrear, mesesDuracion: Number(e.target.value) })}
                  style={{
                    width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.3rem' }}>
                  NOTAS / OBSERVACIONES
                </label>
                <input
                  type="text" placeholder="Convenio anual o contrato institucional..."
                  value={formCrear.notas} onChange={e => setFormCrear({ ...formCrear, notas: e.target.value })}
                  style={{
                    width: '100%', height: '42px', padding: '0 0.8rem', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button" onClick={() => setModalCrear(false)}
                  style={{
                    padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={procesando}
                  style={{
                    padding: '0.75rem 1.75rem', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                    border: 'none', color: 'white', fontWeight: 800, cursor: procesando ? 'not-allowed' : 'pointer'
                  }}
                >
                  {procesando ? 'Emitiendo...' : 'Emitir Licencia'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
